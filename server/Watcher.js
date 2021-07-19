var EventEmitter = require('events')
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
      console.log('[WATCHER] Initializing..')
      this.watcher = chokidar.watch(this.PhotoPath, {
        ignoreInitial: true,
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 2500,
          pollInterval: 500
        }
      })
      const log = console.log.bind(console)
      this.watcher
        .on('add', (path) => {
          this.onNewFile(path)
        }).on('change', (path) => {
          this.onFileUpdated(path)
        }).on('unlink', path => {
          this.onFileRemoved(path)
        }).on('error', (error) => {
          log(`Watcher error: ${error}`)
        }).on('ready', () => {
          log('[WATCHER] Ready')
        })
    } catch (error) {
      console.log('Chokidar watcher failed', error)
    }

  }

  close() {
    return this.watcher.close()
  }

  onNewFile(path) {
    console.log('FolderWatcher: New File', path)
    this.emit('file_added', {
      path: path.replace(this.PhotoPath, ''),
      fullPath: path
    })
  }

  onFileRemoved(path) {
    console.log('FolderWatcher: File Removed', path)
    this.emit('file_removed', {
      path: path.replace(this.PhotoPath, ''),
      fullPath: path
    })
  }

  onFileUpdated(path) {
    console.log('FolderWatcher: Updated File', path)
    this.emit('file_updated', {
      path: path.replace(this.PhotoPath, ''),
      fullPath: path
    })
  }
}
module.exports = FolderWatcher