const fs = require('fs-extra')
const sharp = require('sharp')
sharp.cache(false)

function runSharp(input, output, resizeOptions) {
  return sharp(input, { failOnError: false })
    // .resize(320, 320, { fit: 'cover' })
    .rotate()
    .resize(resizeOptions)
    .toFile(output)
    .then((info) => {
      return info
    }).catch(err => {
      console.error('Sharp error', err)
      return false
    })
}

async function waitPathExists(path, attempts = 0) {
  if (attempts > 20) {
    console.error('Path did not load', path, attempts)
    return false
  }
  var exists = await fs.pathExists(path)
  if (!exists) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return waitPathExists(path, ++attempts)
  }
  // console.log('Path exists after', attempts, 'attempts')
  return true
}

async function generateThumbnail(path, output, thumbSizeObj) {
  // console.log('Generate thumbnail', path)
  if (!path || !output || !thumbSizeObj) {
    console.error('Invalid data to generateThumbnail', path, output, thumbSizeObj)
  }
  const sharpInfo = await runSharp(path, output, thumbSizeObj)

  if (!sharpInfo) {
    var _exists = await fs.pathExists(output)
    if (_exists) {
      console.log('Failed but path exists, remove path')
      await fs.unlink(output)
    }
    return false
  }

  if (!sharpInfo.size) {
    console.error('Sharp Invalid Size', sharpInfo, path, output)
    await fs.unlink(output)
    return false
  }

  var successful = await waitPathExists(output)
  if (!successful) {
    return false
  }
  // console.log('Path exists now', output)
  await setFilePermissionAndOwner(output)

  return sharpInfo
}
module.exports.generateThumbnail = generateThumbnail

async function setFilePermissionAndOwner(path) {
  try {
    await fs.chown(path, 99, 100)
    await fs.chmod(path, 0o777)

    return true
  } catch (error) {
    console.error('Failed to set perm own', error)
    return false
  }
}
module.exports.setFilePermissionAndOwner = setFilePermissionAndOwner

async function thumbnailStats(path) {
  var stats = await fs.stat(path)
  if (!stats) {
    return false
  }
  if (stats.size <= 0) {
    console.error('Empty image', path)
    return false
  }

  return sharp(path).metadata().then(async (metadata) => {
    if (!metadata.size) {
      metadata.size = stats.size
    }
    return metadata
  }).catch((error) => {
    console.error('failed to get metadata', error)
    return false
  })
}
module.exports.thumbnailStats = thumbnailStats
