const fs = require('fs-extra')
const Path = require('path')
const sharp = require('sharp')
const dir = require('node-dir')
const exif = require('exif-reader')
sharp.cache(false)

const ACCEPTABLE_IMAGE_FORMATS = ['jpeg', 'jpg', 'gif', 'png', 'webp']

async function getAllImages(path) {
  return dir.promiseFiles(path)
    .then((files) => {
      var photos = []
      files.forEach(filepath => {
        var extname = Path.extname(filepath)
        var basename = Path.basename(filepath, extname)
        var ext = extname.toLowerCase().substr(1)
        if (ACCEPTABLE_IMAGE_FORMATS.includes(ext)) {
          var relativePath = filepath.replace(path, '')
          photos.push({
            basename,
            ext,
            path: relativePath,
            fullPath: filepath
          })
        }
      })
      return photos
    })
    .catch(e => {
      console.error(e)
      return false
    })
}
module.exports.getAllImages = getAllImages

function cleanExif(exifraw) {
  if (!exifraw) return null
  var data = exif(exifraw)

  for (const key in data) {
    var cleaned = {}
    for (const subkey in data[key]) {
      if (!Buffer.isBuffer(data[key][subkey])) {
        cleaned[subkey] = data[key][subkey]
      }
    }
    data[key] = cleaned
  }

  return data
}

async function getImageMetadata(path) {
  return sharp(path).metadata().then(async (metadata) => {
    metadata.exif = cleanExif(metadata.exif)
    return metadata
  }).catch((error) => {
    console.error('failed to get metadata', error)
    return false
  })
}
module.exports.getImageMetadata = getImageMetadata

async function getImageBuffer(path) {
  return sharp(path, { failOnError: false }).toBuffer({ resolveWithObject: true }).then(async (obj) => {
    return obj
  }).catch((error) => {
    console.error('failed to get buffer', error)
    return false
  })
}
module.exports.getImageBuffer = getImageBuffer

async function getFileStat(path) {
  try {
    var stat = await fs.stat(path)
    return {
      size: stat.size,
      atime: stat.atime,
      mtime: stat.mtime,
      ctime: stat.ctime,
      birthtime: stat.birthtime
    }
  } catch (err) {
    console.error('Failed to stat', err)
    return false
  }
}
module.exports.getFileStat = getFileStat

async function fsStat(path) {
  return fs.stat(path)
}
module.exports.fsStat = fsStat

async function getImageStats(path) {
  try {
    // Not pulling metadata on initial scan anymore
    // var promdata = await Promise.all([fs.stat(path), getImageMetadata(path), getImageBuffer(path)])
    var promdata = await Promise.all([fs.stat(path), getImageBuffer(path)])
    var stat = promdata[0] || {}
    var bufferObj = promdata[1] || {}

    var bufferBytes = Object.values(bufferObj.data) || []
    var bufferInfo = bufferObj.info || {}
    var byteSum = 0
    bufferBytes.forEach((byte) => byteSum += byte)

    if (!byteSum) {
      console.error('Invalid byte sum', bufferObj)
      return false
    }

    return {
      fingerprint: byteSum.toString(36),
      size: stat.size,
      rawSize: bufferInfo.size || 0,
      atime: stat.atime,
      mtime: stat.mtime,
      ctime: stat.ctime,
      birthtime: stat.birthtime,
      birthtimeMs: stat.birthtimeMs,
      width: bufferInfo.width || null,
      height: bufferInfo.height || null
      // hasAlpha: metadata.hasAlpha === undefined ? null : !!metadata.hasAlpha,
      // orientation: metadata.orientation || null,
      // exif: !!metadata.exif
    }
  } catch (err) {
    console.error('Failed to stat', err)
    return false
  }
}
module.exports.getImageStats = getImageStats

async function moveFile(from, to) {
  return fs.move(from, to).then(() => {
    console.log('Moved file', from, to)
    return true
  }).catch((error) => {
    console.error('Failed to move file', from, to, error)
    return false
  })
}
module.exports.moveFile = moveFile