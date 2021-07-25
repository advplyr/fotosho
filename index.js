const server = require('./server/Server')
global.appRoot = __dirname

const isDev = process.env.NODE_ENV !== 'production'
if (isDev) {
  const devEnv = require('./dev').config
  process.env.NODE_ENV = 'development'
  process.env.PORT = devEnv.Port
  process.env.CONFIG_PATH = devEnv.ConfigPath
  process.env.PHOTO_PATH = devEnv.PhotoPath
  process.env.THUMBNAIL_PATH = devEnv.ThumbnailPath
  process.env.LOG_LEVEL = 'TRACE'
}

const PORT = process.env.PORT || 80
const CONFIG_PATH = process.env.CONFIG_PATH || '/config'
const PHOTO_PATH = process.env.PHOTO_PATH || '/photos'
const THUMBNAIL_PATH = process.env.THUMBNAIL_PATH || '/thumbnails'

console.log('Config', CONFIG_PATH, PHOTO_PATH, THUMBNAIL_PATH)

const Server = new server(PORT, CONFIG_PATH, PHOTO_PATH, THUMBNAIL_PATH)
Server.start()
