const Path = require('path')
const fs = require('fs-extra')
const EventEmitter = require('events')
const Logger = require('./Logger')
const { getAllImages, getImageStats } = require('./utils/fileHelpers')
const { msToElapsed } = require('./utils')

class Scanner extends EventEmitter {
  constructor(PHOTO_PATH, THUMBNAIL_PATH, db) {
    super()

    this.PhotoPath = PHOTO_PATH
    this.ThumbnailPath = THUMBNAIL_PATH
    this.db = db
  }

  get photos() {
    return this.db.photos
  }
  get albums() {
    return this.db.albums
  }
  get duplicate_photos() {
    return this.db.duplicate_photos
  }

  async getStatRequest(photoId) {
    var photo = this.photos.find(p => p.id === photoId)
    var stats = await getImageStats(photo.fullPath)
    return stats
  }

  getScanChunks(photos_in_dir) {
    var maxChunkSize = 50
    var chunkSize = 50
    if (photos_in_dir.length < 50) chunkSize = 1
    else {
      chunkSize = Math.floor(photos_in_dir.length / 10)
      if (chunkSize > maxChunkSize) {
        chunkSize = maxChunkSize
      }
    }

    var chunks = []
    var numChunks = Math.floor(photos_in_dir.length / chunkSize)

    for (let i = 0; i < numChunks; i++) {
      var chunk_start = i * chunkSize
      var chunk_end = chunk_start + chunkSize
      var chunk = photos_in_dir.slice(chunk_start, chunk_end)
      chunks.push(chunk)
    }

    var remainingForLastChunk = photos_in_dir.length - (numChunks * chunkSize)
    if (remainingForLastChunk > 0) {
      var chunk_start = numChunks * chunkSize
      var last_chunk = photos_in_dir.slice(chunk_start)
      chunks.push(last_chunk)
    }
    return chunks
  }

  async scan() {
    await fs.ensureDir(this.PhotoPath)
    await fs.ensureDir(this.ThumbnailPath)

    var scan_start = Date.now()

    var photos_in_dir = await getAllImages(this.PhotoPath)
    Logger.info(`[Scan] ${photos_in_dir.length} Photos in dir - ${msToElapsed(Date.now() - scan_start)}`)

    var db_photo_paths = this.photos.map(p => p.path)
    var photo_paths_in_dir = photos_in_dir.map(p => p.path)

    // Photo IDs that are staying in DB
    var final_photo_ids = this.photos.filter(p => photo_paths_in_dir.includes(p.path)).map(p => p.id)

    // Photos in DB that are not in the photo directory
    var photos_to_remove = this.photos.filter(p => !photo_paths_in_dir.includes(p.path))

    // Photos in the directory that are not in the DB
    var photos_needing_eval = photos_in_dir.filter(p => !db_photo_paths.includes(p.path))

    // Store results of the scan
    var duplicate_photos = []
    var failed_photos = []
    var photos_to_add = []

    // Split into chunks for async scan
    var chunks = this.getScanChunks(photos_needing_eval)

    var num_photos_scanned = 0

    // Scan each chunk
    for (let i = 0; i < chunks.length; i++) {
      var chunk = chunks[i]
      await Promise.all(chunk.map(async _photo => {
        var imgStat = await getImageStats(_photo.fullPath)
        if (!imgStat) {
          if (failed_photos.find(__photo => __photo.path === _photo.path)) {
            Logger.error('Failed photo already in db', _photo.path)
          } else {
            failed_photos.push(_photo)
          }
        } else {
          var photo = {
            id: imgStat.fingerprint,
            ..._photo,
            ...imgStat,
            added_at: Date.now()
          }

          if (final_photo_ids.includes(photo.id)) {
            duplicate_photos.push(photo)
          } else {
            final_photo_ids.push(photo.id)
            photos_to_add.push(photo)
          }
        }
      }))

      num_photos_scanned += chunk.length
      var percentDone = (100 * num_photos_scanned / photos_needing_eval.length).toFixed(1) + '%'
      this.emit('scan_progress', {
        scanned: num_photos_scanned,
        total: photos_needing_eval.length,
        percent: percentDone
      })
      Logger.info(`[Scan] ${num_photos_scanned} of ${photos_needing_eval.length} (${percentDone}) - ${msToElapsed(Date.now() - scan_start)}`)
    }

    Logger.info(`[Scan] Complete in ${msToElapsed(Date.now() - scan_start)}`)

    this.db.duplicate_photos = duplicate_photos
    this.db.failed_photos = failed_photos
    await this.db.updateFromScan(photos_to_add, photos_to_remove)
  }

  async scanThumbnails() {
    var thumbs_in_dir = await getAllImages(this.ThumbnailPath)
    if (!thumbs_in_dir) {
      Logger.error('Failed to scan thumbnails')
      return
    }
    var thumb_paths_in_dir = thumbs_in_dir.map(p => p.path)

    var photos_needing_thumb = []
    var photo_thumbs_to_remove = []

    this.db.photos.forEach(photo => {
      if (photo.thumbPath && thumb_paths_in_dir.includes(photo.thumbPath)) {
        // already exists
      } else if (photo.thumbPath) {
        // thumb does not exist in thumb dir anymore
        photo_thumbs_to_remove.push(photo)
        photos_needing_thumb.push(photo)
      } else {
        photos_needing_thumb.push(photo)
      }
      return photo
    })
    if (photo_thumbs_to_remove.length > 0) {
      await this.db.removeThumbs(photo_thumbs_to_remove)
    }
    Logger.info(`[SCAN] Thumb scan complete. ${photos_needing_thumb.length} photos need thumbs. ${photo_thumbs_to_remove.length} thumbs no longer needed.`)
  }

  async scanFile(path, fullPath) {
    var extname = Path.extname(path)
    var basename = Path.basename(path, extname)
    var existsInDb = this.photos.find(p => p.path === path)
    if (existsInDb) {
      Logger.info('[SCAN-FILE] File already exists in Db')
      return {
        success: true
      }
    }

    var imgStat = await getImageStats(fullPath)
    if (!imgStat) {
      Logger.error('[SCAN-FILE] Failed to stat')
      return false
    }

    var newPhoto = {
      id: imgStat.fingerprint,
      path,
      fullPath,
      added_at: Date.now(),
      ext: extname.toLowerCase().substr(1),
      basename,
      ...imgStat
    }

    if (this.photos.find(p => p.id === imgStat.fingerprint)) {
      var existsAsDuplicate = this.db.duplicate_photos.find(dupe => dupe.path === newPhoto.path)
      if (!existsAsDuplicate) {
        this.db.duplicate_photos.push(newPhoto)
      } else {
        existsAsDuplicate.updated_at = Date.now()
      }
    } else {
      await this.db.insertPhoto(newPhoto)
      Logger.info('[SCANNER] Inserting new photo')
    }

    return {
      success: true,
      newPhoto
    }
  }

  async unlinkPhoto(path) {
    try {
      await fs.unlink(path)
    } catch (error) {
      Logger.error('Failed to unlink photo', path)
    }
  }

  async removeFile(path, fullPath) {
    var photo = this.photos.find(p => p.path === path)
    if (!photo) {
      Logger.info('[SCANNER:REMOVE-FILE] File not in Db')
      return false
    }
    if (photo.thumb) {
      this.unlinkPhoto(photo.thumb.fullPath)
    }
    if (photo.preview) {
      this.unlinkPhoto(photo.preview.fullPath)
    }
    await this.db.removePhoto(photo.id)
    Logger.info('[SCANNER:REMOVE-FILE] File removed')
    return photo
  }
}
module.exports = Scanner