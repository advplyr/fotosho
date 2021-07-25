const Path = require('path')
const express = require('express')
const http = require('http')
const cors = require('cors')
const cookieparser = require('cookie-parser')
const SocketIO = require('socket.io')
const Gallery = require('./Gallery')
const Scanner = require('./Scanner')
const Thumbnails = require('./Thumbnails')
const Watcher = require('./Watcher')
const Db = require('./Db')
const Auth = require('./Auth')
const Logger = require('./Logger')
const fs = require('fs-extra')
class Server {
  constructor(PORT, CONFIG_PATH, PHOTO_PATH, THUMBNAIL_PATH) {
    this.Port = PORT
    this.Host = '0.0.0.0'
    this.ConfigPath = CONFIG_PATH
    this.PhotoPath = PHOTO_PATH
    this.ThumbnailPath = THUMBNAIL_PATH

    fs.ensureDirSync(CONFIG_PATH)
    fs.ensureDirSync(PHOTO_PATH)
    fs.ensureDirSync(THUMBNAIL_PATH)

    this.watcher = new Watcher(this.PhotoPath)
    this.db = new Db(this.ConfigPath)
    this.auth = new Auth(this.db)
    this.scanner = new Scanner(this.PhotoPath, this.ThumbnailPath, this.db)
    this.gallery = new Gallery(this.ThumbnailPath, this.db, this.emitter.bind(this))
    this.thumbnails = new Thumbnails(this.PhotoPath, this.ThumbnailPath, this.db, this.emitter.bind(this))

    this.server = null
    this.io = null

    this.clients = {}
    this.isScanning = false
    this.isInitialized = false
  }

  get photos() {
    return this.db.photos
  }
  get albums() {
    return this.db.albums
  }
  get settings() {
    return this.db.settings
  }

  emitter(ev, data) {
    if (!this.io) return
    this.io.emit(ev, data)
  }

  async fileAddedUpdated({ path, fullPath }) {
    Logger.info('[SERVER] FileAddedUpdated', path, fullPath)
    var scanResult = await this.scanner.scanFile(path, fullPath)
    if (scanResult && scanResult.newPhoto) {
      this.thumbnails.generatePhotoThumbPrev(scanResult.newPhoto)
      this.emitter('new_photo', scanResult.newPhoto)
    }
  }

  async fileRemoved({ path, fullPath }) {
    var photoRemoved = await this.scanner.removeFile(path, fullPath)
    if (photoRemoved) {
      this.emitter('photo_removed', photoRemoved)
    }
  }

  async init() {
    Logger.info('[SERVER] Starting Scan...')
    this.scanner.on('scan_progress', data => {
      this.io.emit('scan_progress', data)
    })
    this.isScanning = true
    this.isInitialized = true
    this.emitter('scan_start')
    await this.scanner.scan()
    await this.scanner.scanThumbnails()
    this.isScanning = false
    this.emitter('scan_complete')

    Logger.info('[SERVER] Scan complete - start thumb generation.')
    this.thumbnails.checkGenerateThumbnails()

    // if (process.env.NODE_ENV === 'production') {
    this.watcher.initWatcher()
    this.watcher.on('file_added', this.fileAddedUpdated.bind(this))
    this.watcher.on('file_removed', this.fileRemoved.bind(this))
    this.watcher.on('file_updated', this.fileAddedUpdated.bind(this))
    // }
  }

  async start() {
    Logger.info('=== Starting Server ===')

    await this.db.init()
    this.auth.init()

    const app = express()

    this.server = http.createServer(app)

    app.use(cookieparser('secret_family_recipe'))
    app.use(cors())

    app.use(async (req, res, next) => {
      if (process.env.NODE_ENV === 'development' || req.path.startsWith('/_nuxt') || req.path.startsWith('/auth') || req.path.startsWith('favicon')) {
        return next()
      }

      // Check auth cookie
      if (!this.auth.user && req.signedCookies.user) {
        this.auth.user = await this.auth.getAuth(req)
        if (!this.auth.user) {
          Logger.error('Invalid signed cookie')
          res.cookie('user', '', { signed: true, maxAge: 0 })
        } else {
          Logger.info('Got auth', this.auth.user.username)
        }
      } else if (this.auth.user && !req.signedCookies.user) {
        Logger.info('Cookie cleared, remove user')
        this.auth.user = null
      }

      if (req.path.startsWith('/login')) {
        if (this.auth.user) {
          return res.redirect('/')
        } else if (this.auth.isPasswordless && !req.query.nopass) {
          return res.redirect('/login?nopass=1')
        } else if (!this.auth.isPasswordless && req.query.nopass) {
          return res.redirect('/login')
        }
      } else if (!this.auth.user) {
        return res.redirect('/login')
      } else if (req.path.startsWith('/launch')) {
        if (this.isInitialized) {
          return res.redirect('/')
        }
        // } else if (!this.isInitialized || this.isScanning) {
      } else if (!this.isInitialized) {
        return res.redirect('/launch')
      }
      next()
    })

    // Static path to generated nuxt
    if (process.env.NODE_ENV === 'production') {
      const distPath = Path.join(global.appRoot, '/client/dist')
      app.use(express.static(distPath))
    }

    app.use(express.static(this.PhotoPath))
    app.use(express.static(this.ThumbnailPath))
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json())

    app.get('/', (req, res) => {
      res.sendFile('/index.html')
    })
    app.get('/albums/:id', (req, res) => {
      res.sendFile('/index.html')
    })

    app.get('/auth', async (req, res) => {
      var response = await this.auth.getAuth(req, res)
      res.json(response)
    })
    app.post('/auth', (req, res) => this.auth.checkAuth(req, res))
    app.get('/logout', this.logout.bind(this))
    app.get('/photos', (req, res) => this.gallery.fetch(req, res))
    app.get('/photo/:id', (req, res) => this.gallery.downloadPhoto(req, res))
    app.get('/album/photo/:id', (req, res) => this.gallery.getAlbumCover(req, res))
    app.get('/slideshow/photo/:index', (req, res) => this.gallery.getPhotoByIndex(req, res))

    this.server.listen(this.Port, this.Host, () => {
      Logger.info(`Running on http://${this.Host}:${this.Port}`)
    })

    this.io = new SocketIO.Server(this.server, {
      cors: {
        origin: '*',
        methods: ["GET", "POST"]
      }
    })

    this.io.on('connection', (socket) => {
      this.clients[socket.id] = {
        id: socket.id,
        socket,
        user: this.auth.user,
        username: this.auth.username,
        connected_at: Date.now()
      }
      Logger.info('[SOCKET] Socket Connected', socket.id)
      const initialPayload = {
        albums: this.albums,
        settings: this.settings,
        isScanning: this.isScanning,
        isInitialized: this.isInitialized,
        num_photos: this.db.photos.length,
        photoPath: this.PhotoPath,
        thumbnailPath: this.ThumbnailPath,
        configPath: this.ConfigPath,
        user: this.auth.user
      }
      socket.emit('init', initialPayload)

      socket.on('start_init', this.init.bind(this))
      socket.on('add_to_album', (data) => this.gallery.addToAlbum(socket, data))
      socket.on('add_to_new_album', (data) => this.gallery.addToNewAlbum(socket, data))
      socket.on('remove_from_album', (data) => this.gallery.removeFromAlbum(socket, data))
      socket.on('delete_album', (data) => this.gallery.deleteAlbum(socket, data))
      socket.on('rename_photo', (data) => this.gallery.renamePhoto(socket, data))
      socket.on('update_settings', (data) => this.updateSettings(socket, data))
      socket.on('test', () => {
        Logger.info('Socket test received', socket.id)
      })

      socket.on('disconnect', () => {
        var _client = this.clients[socket.id]
        if (!_client) {
          Logger.warn('[SOCKET] Socket disconnect, no client ' + socket.id)
        } else {
          const disconnectTime = Date.now() - _client.connected_at
          Logger.info(`[SOCKET] Socket ${socket.id} disconnected from client "${_client.username}" after ${disconnectTime}ms`)
          delete this.clients[socket.id]
        }
      })
    })
  }

  logout(req, res) {
    res.cookie('user', '', { signed: true, maxAge: 0 })
    this.auth.user = null
    res.sendStatus(200)
  }

  async stop() {
    await this.watcher.close()
    Logger.info('Watcher Closed')

    return new Promise((resolve) => {
      this.server.close((err) => {
        if (err) {
          Logger.error('Failed to close server', err)
        } else {
          Logger.info('Server successfully closed')
        }
        resolve()
      })
    })
  }

  async updateSettings(socket, data) {
    if (data.order_by) {
      this.db.settings.order_by = data.order_by
    }
    if (data.card_size) {
      this.db.settings.card_size = data.card_size
    }
    if (data.auto_slide) {
      this.db.settings.auto_slide = !!data.auto_slide
    }
    if (data.slide_duration) {
      this.db.settings.slide_duration = data.slide_duration
    }
    // await this.database.save()
    await this.db.updateSettings(this.db.settings)
    socket.emit('settings_updated')
  }
}
module.exports = Server