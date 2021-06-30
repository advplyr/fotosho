const Path = require('path')
const fs = require('fs-extra')
const { msToElapsed, chunker } = require('./utils')
const { generateThumbnail, thumbnailStats } = require('./utils/thumbnails')

class Thumbnails {
  constructor(PHOTO_PATH, THUMBNAIL_PATH, database, emitter) {
    this.PhotoPath = PHOTO_PATH
    this.ThumbnailPath = THUMBNAIL_PATH
    this.database = database
    this.emitter = emitter

    this.ThumbnailFormat = 'webp'

    this.forceStopGenerating = false
    this.isGeneratingThumbnails = false
  }

  get photos() {
    return this.database.photos
  }
  get albums() {
    return this.database.albums
  }


  getNewPhotoThumbnailPath(photo, thumbSize = 320) {
    var basename = `${photo.id}_${thumbSize}`
    var path = `${Path.sep}${basename}.${this.ThumbnailFormat}`
    return {
      basename,
      path,
      fullPath: Path.join(this.ThumbnailPath, path)
    }
  }

  async generateThumbnails(photos) {
    var generated = 0
    var failed = 0
    var existed = 0
    var reused = 0
    var photosGenerated = []
    await Promise.all(photos.map(async photo => {
      var { basename, path, fullPath } = this.getNewPhotoThumbnailPath(photo)
      var exists = await fs.pathExists(fullPath)
      var thumbData = null
      if (exists) {
        thumbData = await thumbnailStats(fullPath)
        if (thumbData) existed++
      } else {
        // If a duplicate photo exists with a thumbnail already generated - then dont generate another, use that one
        var found_dupe = this.photos.find(_photo => {
          return _photo.basename === photo.basename && _photo.size === photo.size
        })
        if (found_dupe && found_dupe.thumbPath && found_dupe.thumb) {
          reused++
          thumbData = found_dupe.thumb
        } else {
          thumbData = await generateThumbnail(photo.fullPath, fullPath)
          if (thumbData) generated++
        }
      }
      if (!thumbData) {
        failed++
      } else {
        photo.thumbPath = path
        photo.thumb = {
          fullPath: fullPath,
          ext: this.ThumbnailFormat,
          basename: basename,
          size: thumbData.size,
          width: thumbData.width,
          height: thumbData.height
        }
        photosGenerated.push(photo)
      }
    }))
    if (photosGenerated.length) {
      this.emitter('thumbnails_generated', { photos: photosGenerated })
    }
    return {
      generated,
      failed,
      existed,
      reused
    }
  }

  async checkGenerateThumbnails() {
    var photos_no_thumb = this.photos.filter(p => !p.thumbPath)
    if (!photos_no_thumb.length) {
      console.log('All thumbnails generated')
      return
    }

    console.log('Generating', photos_no_thumb.length, 'Thumbnails')
    this.isGeneratingThumbnails = true
    var generateStart = Date.now()
    this.emitter('generating_thumbnails', { isGenerating: true })

    var chunked_photos = chunker(photos_no_thumb, 50)
    var generated = 0
    var existed = 0
    var failed = 0
    var reused = 0
    console.log(`Chunks to generate: ${chunked_photos.length}`)
    for (let i = 0; i < chunked_photos.length; i++) {
      var chunk = chunked_photos[i]
      console.log(`Chunk ${i}: Generating ${chunk.length} photos`)
      var results = await this.generateThumbnails(chunk)
      generated += results.generated
      existed += results.existed
      failed += results.failed
      reused += results.reused
      console.log(`Chunk ${i} Complete: ${results.generated} Generated|${results.existed} Existed|${results.failed} Failed|${results.reused} Reused`)
      if (results.generated > 0 || results.existed > 0) {
        await this.database.save()
      }

      if (this.forceStopGenerating) {
        console.error('Forcing stop generating')
        this.forceStopGenerating = false
        break
      }
    }

    var elapsed = msToElapsed(Date.now() - generateStart)
    console.log(`${generated} Thumbnails Generated: ${elapsed}`)

    this.isGeneratingThumbnails = false
    this.emitter('generating_thumbnails', { isGenerating: false })
  }
}
module.exports = Thumbnails