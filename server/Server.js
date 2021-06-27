const Path = require('path')
const express = require('express')
const http = require('http')
const cors = require('cors')
const SocketIO = require('socket.io')
const Gallery = require('./Gallery')
const Database = require('./Database')
const Scanner = require('./Scanner')
const Watcher = require('./Watcher')

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
    this.server = null
    this.io = null

    this.clients = {}
  }

  get photos() {
    return this.database.photos
  }
  get albums() {
    return this.database.albums
  }

  emitter(ev, data) {
    if (!this.io) return
    this.io.emit(ev, data)
  }

  async fileAddedUpdated({ path, fullPath }) {
    console.log('[SERVER] FileAddedUpdated', path, fullPath)
    var scanResult = await this.scanner.scanFile(path, fullPath)
    console.log('Scan Result', scanResult)
    if (scanResult && scanResult.newPhoto) {
      this.gallery.checkGenThumbnails()
      this.emitter('new_photo', newPhoto)
    }
    // Update was made
  }

  async fileRemoved({ path, fullPath }) {
    var photoRemoved = await this.scanner.removeFile(path, fullPath)
    if (photoRemoved) {
      this.emitter('photo_removed', photoRemoved)
    }
  }

  async init() {
    await this.scanner.scan()
    await this.scanner.scanThumbnails()

    this.emitter('scan_complete')

    this.gallery.checkGenThumbnails()

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
    this.init()

    const app = express()
    this.server = http.createServer(app)

    app.use(cors())
    var distPath = Path.resolve(global.appRoot, '/client/dist')
    app.use(express.static(distPath))
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
    app.get('/test', (req, res) => {
      console.log('Test request')
      res.json({
        success: true
      })
    })
    app.get('/photos', (req, res) => this.gallery.fetch(req, res))
    app.get('/photo/:id', (req, res) => this.gallery.downloadPhoto(req, res))
    app.get('/album/photo/:id', (req, res) => this.gallery.getAlbumCover(req, res))
    app.get('/slideshow/photo/:index', (req, res) => this.gallery.getPhotoByIndex(req, res))

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
      console.log('Socket Connected', socket.id)
      this.clients[socket.id] = {
        id: socket.id,
        socket,
        connected_at: Date.now()
      }
      var photosGrouped = this.gallery.getPhotosSortedFiltered({}, null, null)
      socket.emit('init', {
        albums: this.albums,
        scanning: this.scanner.isScanning,
        num_photos: photosGrouped.length
      })

      socket.on('add_to_album', (data) => this.gallery.addToAlbum(socket, data))
      socket.on('add_to_new_album', (data) => this.gallery.addToNewAlbum(socket, data))
      socket.on('remove_from_album', (data) => this.gallery.removeFromAlbum(socket, data))
      socket.on('delete_album', (data) => this.gallery.deleteAlbum(socket, data))
      socket.on('rename_photo', (data) => this.gallery.renamePhoto(socket, data))
    })
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
}
module.exports = Server