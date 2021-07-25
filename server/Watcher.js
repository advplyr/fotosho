var EventEmitter = require('events')
var Logger = require('./Logger')
var chokidar = require('chokidar')

class FolderWatcher extends EventEmitter {
  constructor(photoPath) {
    super()
    this.PhotoPath = photoPath
    this.folderMap = {}
    this.watcher = null
  }

  initWatcher() {
    try {
      Logger.info('[WATCHER] Initializing..')
      this.watcher = chokidar.watch(this.PhotoPath, {
        ignoreInitial: true,
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 2500,
          pollInterval: 500
        }
      })
      this.watcher
        .on('add', (path) => {
          this.onNewFile(path)
        }).on('change', (path) => {
          this.onFileUpdated(path)
        }).on('unlink', path => {
          this.onFileRemoved(path)
        }).on('error', (error) => {
          Logger.error(`Watcher error: ${error}`)
        }).on('ready', () => {
          Logger.info('[WATCHER] Ready')
        })
    } catch (error) {
      Logger.error('Chokidar watcher failed', error)
    }

  }

  close() {
    return this.watcher.close()
  }

  onNewFile(path) {
    Logger.info('FolderWatcher: New File', path)
    this.emit('file_added', {
      path: path.replace(this.PhotoPath, ''),
      fullPath: path
    })
  }

  onFileRemoved(path) {
    Logger.info('FolderWatcher: File Removed', path)
    this.emit('file_removed', {
      path: path.replace(this.PhotoPath, ''),
      fullPath: path
    })
  }

  onFileUpdated(path) {
    Logger.info('FolderWatcher: Updated File', path)
    this.emit('file_updated', {
      path: path.replace(this.PhotoPath, ''),
      fullPath: path
    })
  }
}
module.exports = FolderWatcher