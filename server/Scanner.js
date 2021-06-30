const Path = require('path')
const fs = require('fs-extra')
const { getAllImages, getImageStats } = require('./utils/fileHelpers')
const { stringHash } = require('./utils')

class Scanner {
  constructor(PHOTO_PATH, THUMBNAIL_PATH, database) {
    this.PhotoPath = PHOTO_PATH
    this.ThumbnailPath = THUMBNAIL_PATH
    this.database = database
  }

  get photos() {
    return this.database.photos
  }
  get albums() {
    return this.database.albums
  }

  getScanChunks(photos_in_dir) {
    var chunkSize = 50
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

    var photos_in_dir = await getAllImages(this.PhotoPath)

    var db_photo_paths = this.photos.map(p => p.path)
    var photo_paths_in_dir = photos_in_dir.map(p => p.path)

    var final_photos = this.photos.filter(p => photo_paths_in_dir.includes(p.path))
    var photos_needing_eval = photos_in_dir.filter(p => !db_photo_paths.includes(p.path))

    // Split into chunks for async scan
    var chunks = this.getScanChunks(photos_needing_eval)

    // Scan each chunk
    for (let i = 0; i < chunks.length; i++) {
      var chunk = chunks[i]
      await Promise.all(chunk.map(async _photo => {
        var imgStat = await getImageStats(_photo.fullPath)
        var photo = {
          id: stringHash(_photo.path),
          ..._photo,
          ...imgStat,
          added_at: Date.now()
        }
        final_photos.push(photo)
      }))
    }
    this.database.photos = final_photos
    await this.database.save()
  }

  async scanThumbnails() {
    var thumbs_in_dir = await getAllImages(this.ThumbnailPath)
    var thumb_paths_in_dir = thumbs_in_dir.map(p => p.path)

    var existing_thumbs = 0
    var removed_thumbs = 0
    var photos_needing_thumb = []

    this.database.photos = this.database.photos.map(photo => {
      if (photo.thumbPath && thumb_paths_in_dir.includes(photo.thumbPath)) {
        existing_thumbs++
      } else if (photo.thumbPath) {
        photo.thumbPath = null
        delete photo.thumb
        removed_thumbs++
      } else {
        photos_needing_thumb.push(photo)
      }
      return photo
    })
    if (removed_thumbs > 0) {
      await this.database.save()
    }
  }

  async scanFile(path, fullPath) {
    var extname = Path.extname(path)
    var basename = Path.basename(path, extname)
    var existsInDb = this.photos.find(p => p.path === path)
    if (existsInDb) {
      console.log('[SCAN-FILE] File already exists in Db')
    }

    var imgStat = await getImageStats(fullPath)
    if (!imgStat) {
      console.error('[SCAN-FILE] Failed to stat')
      return false
    }

    var newPhoto = null
    if (existsInDb) {
      console.log('[SCAN-FILE] File was modified')
      for (const key in imgStat) {
        existsInDb[key] = imgStat[key]
      }
      existsInDb.updated_at = Date.now()
    } else {
      newPhoto = {
        id: stringHash(path),
        path,
        fullPath,
        added_at: Date.now(),
        ext: extname.toLowerCase().substr(1),
        basename,
        ...imgStat
      }
      this.database.photos.push(newPhoto)
    }

    await this.database.save()
    return {
      success: true,
      newPhoto
    }
  }

  async removeFile(path, fullPath) {
    var photo = this.photos.find(p => p.path === path)
    if (!photo) {
      console.log('[REMOVE-FILE] File not in Db')
      return false
    }
    this.database.photos = this.database.photos.filter(p => p.id !== photo.id)
    await this.database.save()
    console.log('[REMOVE-FILE] File removed')
    return photo
  }
}
module.exports = Scanner