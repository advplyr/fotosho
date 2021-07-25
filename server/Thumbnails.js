const Path = require('path')
const fs = require('fs-extra')
const Logger = require('./Logger')
const { msToElapsed, chunker } = require('./utils')
const { generateThumbnail, thumbnailStats } = require('./utils/thumbnails')

class Thumbnails {
  constructor(PHOTO_PATH, THUMBNAIL_PATH, db, emitter) {
    this.PhotoPath = PHOTO_PATH
    this.ThumbnailPath = THUMBNAIL_PATH
    this.db = db
    this.emitter = emitter

    this.ThumbnailFormat = 'webp'

    this.isGenThumbPrev = false
    this.pendingGens = []

    this.forceStopGenerating = false
    this.isGeneratingThumbnails = false
  }

  get photos() {
    return this.db.photos
  }
  get albums() {
    return this.db.albums
  }


  getNewPhotoThumbnailPath(photo, thumbSize = 240) {
    var basename = `${photo.id}_${thumbSize}`
    var path = `${Path.sep}${basename}.${this.ThumbnailFormat}`
    return {
      basename,
      path,
      fullPath: Path.join(this.ThumbnailPath, path)
    }
  }

  async generatePhotoThumbPrev(photo) {
    if (this.isGenThumbPrev) {
      this.pendingGens.push(photo)
      Logger.info('Already generating thumb, push pending', photo.id)
      return
    }

    this.isGenThumbPrev = true
    var genres = await this.generateThumbnails([photo])
    if (genres && genres.generated > 0) {
      await this.db.updatePhotos(genres.photosGenerated)
    }
    this.isGenThumbPrev = false

    if (this.pendingGens.length) {
      var nextPendingGen = this.pendingGens.shift()
      this.generatePhotoThumbPrev(nextPendingGen)
    }
  }

  async generateThumbnails(photos) {
    var thumbSizes = [{
      name: 'thumb',
      height: 240,
      width: 240,
      fit: 'cover'
    }, {
      name: 'preview',
      height: 800,
      width: null
    }]

    var generated = 0
    var failed = 0
    var existed = 0
    var photosGenerated = []
    await Promise.all(photos.map(async photo => {
      for (let i = 0; i < thumbSizes.length; i++) {
        var thumbObj = thumbSizes[i]
        var { basename, path, fullPath } = this.getNewPhotoThumbnailPath(photo, thumbObj.height)

        var exists = await fs.pathExists(fullPath)
        var thumbData = null
        if (exists) {
          thumbData = await thumbnailStats(fullPath)
          if (thumbData) existed++
        } else {
          thumbData = await generateThumbnail(photo.fullPath, fullPath, thumbObj)
          if (thumbData) generated++
        }
        if (!thumbData) {
          failed++
        } else {
          var pathVariable = `${thumbObj.name}Path`
          photo[pathVariable] = path
          photo[thumbObj.name] = {
            fullPath: fullPath,
            ext: this.ThumbnailFormat,
            basename: basename,
            size: thumbData.size,
            width: thumbData.width,
            height: thumbData.height
          }
          var photoIndex = photosGenerated.findIndex(p => p.id === photo.id)
          if (photoIndex >= 0) photosGenerated.splice(photoIndex, 1, photo)
          else {
            photosGenerated.push(photo)
          }
        }
      }
    }))
    if (photosGenerated.length) {
      this.emitter('thumbnails_generated', { photos: photosGenerated })
    }
    return {
      photosGenerated,
      generated,
      failed,
      existed
    }
  }

  async checkGenerateThumbnails() {
    var photos_no_thumb = this.photos.filter(p => !p.thumbPath)
    if (!photos_no_thumb.length) {
      Logger.info('All thumbnails generated')
      return
    }

    Logger.info('Generating', photos_no_thumb.length, 'Thumbnails')
    this.isGeneratingThumbnails = true
    var generateStart = Date.now()
    this.emitter('generating_thumbnails', { isGenerating: true })

    var chunked_photos = chunker(photos_no_thumb, 50)
    var generated = 0
    var existed = 0
    var failed = 0
    Logger.info(`Chunks to generate: ${chunked_photos.length}`)
    for (let i = 0; i < chunked_photos.length; i++) {
      var chunk = chunked_photos[i]
      Logger.info(`Chunk ${i}: Generating ${chunk.length} photos`)
      var results = await this.generateThumbnails(chunk)
      generated += results.generated
      existed += results.existed
      failed += results.failed
      Logger.info(`Chunk ${i}: Complete: ${results.generated} Generated|${results.existed} Existed|${results.failed} Failed`)
      if (results.generated > 0 || results.existed > 0) {
        await this.db.updatePhotos(results.photosGenerated)
      }

      if (this.forceStopGenerating) {
        Logger.error('Forcing stop generating')
        this.forceStopGenerating = false
        break
      }
    }

    var elapsed = msToElapsed(Date.now() - generateStart)
    Logger.info(`${generated} Thumbnails Generated: ${elapsed}`)

    this.isGeneratingThumbnails = false
    this.emitter('generating_thumbnails', { isGenerating: false })
  }
}
module.exports = Thumbnails