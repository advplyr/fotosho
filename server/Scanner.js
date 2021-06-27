const Path = require('path')
const { getAllImages, getImageStats, stringHash } = require('./utils/fileHelpers')

class Scanner {
  constructor(PHOTO_PATH, THUMBNAIL_PATH, database) {
    this.PhotoPath = PHOTO_PATH
    this.ThumbnailPath = THUMBNAIL_PATH
    this.database = database
    this.isScanning = false
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
      console.log('Last Chunk Size', last_chunk.length)
      chunks.push(last_chunk)
    }

    console.log('Got all chunks', chunks.length)
    return chunks
  }

  async scan() {
    console.log('====================== START SCANNING =======================')
    this.isScanning = true
    var start = Date.now()
    var photos_in_dir = await getAllImages(this.PhotoPath)
    var elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`[SCAN] ${photos_in_dir.length} Photos Found. ${elapsed} seconds`)

    var db_photo_paths = this.photos.map(p => p.path)
    var photo_paths_in_dir = photos_in_dir.map(p => p.path)

    var final_photos = this.photos.filter(p => photo_paths_in_dir.includes(p.path))
    var photos_needing_eval = photos_in_dir.filter(p => !db_photo_paths.includes(p.path))

    var new_photos_found = photos_needing_eval.length
    var photos_removed = db_photo_paths.length - final_photos.length
    var existing_photos = photos_in_dir.length - photos_needing_eval.length

    // Split into chunks for async scan
    var chunks = this.getScanChunks(photos_needing_eval)

    var scanStart = Date.now()

    // Scan each chunk
    for (let i = 0; i < chunks.length; i++) {
      var chunk = chunks[i]
      var chunkStart = Date.now()

      console.log(`>> STARTING CHUNK ${i} - ${chunk.length} photos to eval.`)

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

      var chunkElapsed = Date.now() - chunkStart
      var chunkDuration = (chunkElapsed / 1000).toFixed(2)
      console.log(`> CHUNK ${i} COMPLETE IN ${chunkDuration}s`)
    }

    var scanElapsed = Date.now() - scanStart
    var scanDuration = (scanElapsed / 1000).toFixed(2)
    console.log(`=============== SCAN COMPLETE ==============\nDURATION: ${scanDuration}s\nNEW: ${new_photos_found}\nEXISTING: ${existing_photos}\nREMOVED: ${photos_removed}`)

    this.database.photos = final_photos
    await this.database.save()

    this.isScanning = false
    console.log('====================== DONE SCANNING =======================')
  }

  async scanThumbnails() {
    console.log('====================== START THUMB SCAN =======================')
    this.isScanning = true
    var scanStart = Date.now()
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

    var scanElapsed = Date.now() - scanStart
    var scanDuration = (scanElapsed / 1000).toFixed(2)
    console.log(`=============== THUMB SCAN COMPLETE ==============\nDURATION: ${scanDuration}s\nExisting: ${existing_thumbs}\nRemoved: ${removed_thumbs}\nNeeding Thumb: ${photos_needing_thumb.length}`)

    this.isScanning = false
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