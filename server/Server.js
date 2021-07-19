const Path = require('path')
const express = require('express')
const http = require('http')
const cors = require('cors')
const cookieparser = require('cookie-parser')
const SocketIO = require('socket.io')
const Gallery = require('./Gallery')
const Database = require('./Database')
const Scanner = require('./Scanner')
const Thumbnails = require('./Thumbnails')
const Watcher = require('./Watcher')

var _Nuxt
if (process.env.NODE_ENV !== 'production') {
  _Nuxt = require('../client/node_modules/nuxt')
}
console.log('ENV', process.env.NODE_ENV)

class Server {
  constructor(PORT, CONFIG_PATH, PHOTO_PATH, THUMBNAIL_PATH) {
    this.Port = PORT
    this.Host = '0.0.0.0'
    this.ConfigPath = CONFIG_PATH
    this.PhotoPath = PHOTO_PATH
    this.ThumbnailPath = THUMBNAIL_PATH

    this.watcher = new Watcher(this.PhotoPath)
    this.database = new Database(this.ConfigPath)
    this.scanner = new Scanner(this.PhotoPath, this.ThumbnailPath, this.database)
    this.gallery = new Gallery(this.ThumbnailPath, this.database, this.emitter.bind(this))
    this.thumbnails = new Thumbnails(this.PhotoPath, this.ThumbnailPath, this.database, this.emitter.bind(this))

    this.server = null
    this.io = null

    this.clients = {}
    this.user = null
    this.isScanning = false
    this.isInitialized = false
  }

  get photos() {
    return this.database.photos
  }
  get albums() {
    return this.database.albums
  }
  get settings() {
    return this.database.settings
  }

  emitter(ev, data) {
    if (!this.io) return
    this.io.emit(ev, data)
  }

  async fileAddedUpdated({ path, fullPath }) {
    console.log('[SERVER] FileAddedUpdated', path, fullPath)
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
    console.log('[SERVER] Starting Scan...')
    this.scanner.on('scan_progress', data => {
      this.io.emit('scan_progress', data)
    })
    this.isScanning = true
    this.emitter('scan_start')
    await this.scanner.scan()
    await this.scanner.scanThumbnails()
    this.isScanning = false
    this.isInitialized = true
    this.emitter('scan_complete')

    console.log('[SERVER] Scan complete - start thumb generation.')
    this.thumbnails.checkGenerateThumbnails()

    // if (process.env.NODE_ENV === 'production') {
    this.watcher.initWatcher()
    this.watcher.on('file_added', this.fileAddedUpdated.bind(this))
    this.watcher.on('file_removed', this.fileRemoved.bind(this))
    this.watcher.on('file_updated', this.fileAddedUpdated.bind(this))
    // }
  }

  async start() {
    console.log('=== Starting Server ===')

    await this.database.init()

    const app = express()

    this.server = http.createServer(app)

    app.use(cookieparser('secret_family_recipe'))
    app.use(cors())

    app.use(async (req, res, next) => {
      if (req.path.startsWith('/_nuxt') || req.path.startsWith('/auth') || req.path.startsWith('favicon')) {
        return next()
      }

      // Check auth cookie
      if (!this.user && req.signedCookies.user) {
        this.user = await this.database.getAuth(req)
        if (!this.user) {
          console.error('Invalid signed cookie')
          res.cookie('user', '', { signed: true, maxAge: 0 })
        } else {
          console.log('Got auth', this.user.username)
        }
      } else if (this.user && !req.signedCookies.user) {
        console.log('Cookie cleared, remove user')
        this.user = null
      }

      if (req.path.startsWith('/login')) {
        if (this.user) {
          return res.redirect('/')
        } else if (this.database.isPasswordless && !req.query.nopass) {
          return res.redirect('/login?nopass=1')
        } else if (!this.database.isPasswordless && req.query.nopass) {
          return res.redirect('/login')
        }
      } else if (!this.user) {
        return res.redirect('/login')
      } else if (req.path.startsWith('/launch')) {
        if (this.isInitialized) {
          return res.redirect('/')
        }
      } else if (!this.isInitialized || this.isScanning) {
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

    if (process.env.NODE_ENV === 'production') {
      app.get('/', (req, res) => {
        res.sendFile('/index.html')
      })
      app.get('/albums/:id', (req, res) => {
        res.sendFile('/index.html')
      })
    }

    app.get('/auth', async (req, res) => {
      var response = await this.database.getAuth(req, res)
      res.json(response)
    })
    app.post('/auth', (req, res) => this.database.checkAuth(req, res))
    app.get('/logout', this.logout.bind(this))
    app.get('/photos', (req, res) => this.gallery.fetch(req, res))
    app.get('/photo/:id', (req, res) => this.gallery.downloadPhoto(req, res))
    app.get('/album/photo/:id', (req, res) => this.gallery.getAlbumCover(req, res))
    app.get('/slideshow/photo/:index', (req, res) => this.gallery.getPhotoByIndex(req, res))

    if (process.env.NODE_ENV !== 'production') { // To use HMR for client site in development
      const config = require('../client/nuxt.config.js')
      const nuxt = new _Nuxt.Nuxt(config)
      nuxt.hook('build:compiled', () => {
        console.log('Compiled.. hot reload client')
        // Temp: forcing page refresh on client because components are not registering in HMR api
        this.emitter('reload')
      })

      if (config.dev) {
        console.log('Config dev set')
        new _Nuxt.Builder(nuxt).build()
      }
      app.use(nuxt.render)
    }

    this.server.listen(this.Port, this.Host, () => {
      console.log(`Running on http://${this.Host}:${this.Port}`)
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
        user: this.user,
        username: this.user ? this.user.username : 'nobody',
        connected_at: Date.now()
      }
      console.log('[SOCKET] Socket Connected @' + Date.now(), socket.id)
      var photosGrouped = this.gallery.getPhotosSortedFiltered({}, null, null)
      const initialPayload = {
        albums: this.albums,
        settings: this.settings,
        scanning: this.isScanning,
        num_photos: photosGrouped.length,
        isInitialized: this.isInitialized,
        photoPath: this.PhotoPath,
        thumbnailPath: this.ThumbnailPath,
        configPath: this.ConfigPath,
        user: this.user
      }
      console.log('Emit initial payload to socket: ' + JSON.stringify(initialPayload))
      socket.emit('init', initialPayload)

      socket.on('start_init', this.init.bind(this))
      socket.on('add_to_album', (data) => this.gallery.addToAlbum(socket, data))
      socket.on('add_to_new_album', (data) => this.gallery.addToNewAlbum(socket, data))
      socket.on('remove_from_album', (data) => this.gallery.removeFromAlbum(socket, data))
      socket.on('delete_album', (data) => this.gallery.deleteAlbum(socket, data))
      socket.on('rename_photo', (data) => this.gallery.renamePhoto(socket, data))
      socket.on('update_settings', (data) => this.updateSettings(socket, data))

      socket.on('disconnect', () => {
        var _client = this.clients[socket.id]
        if (!_client) {
          console.warn('[SOCKET] Socket disconnect, no client ' + socket.id)
        } else {
          const disconnectTime = Date.now() - _client.connected_at
          console.log(`[SOCKET] Socket disconnect from client "${_client.username}" after ${disconnectTime}ms @${Date.now()}` + socket.id)
          delete this.clients[socket.id]
        }
      })
    })
  }

  logout(req, res) {
    res.cookie('user', '', { signed: true, maxAge: 0 })
    this.user = null
    res.sendStatus(200)
  }

  async stop() {
    await this.watcher.close()
    console.log('Watcher Closed')

    return new Promise((resolve) => {
      this.server.close((err) => {
        if (err) {
          console.error('Failed to close server', err)
        } else {
          console.log('Server successfully closed')
        }
        resolve()
      })
    })
  }

  async updateSettings(socket, data) {
    if (data.order_by) {
      this.database.settings.order_by = data.order_by
    }
    if (data.card_size) {
      this.database.settings.card_size = data.card_size
    }
    if (data.auto_slide) {
      this.database.settings.auto_slide = !!data.auto_slide
    }
    if (data.slide_duration) {
      this.database.settings.slide_duration = data.slide_duration
    }
    await this.database.save()
    socket.emit('settings_updated')
  }
}
module.exports = Server