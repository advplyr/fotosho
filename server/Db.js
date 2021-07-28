const fs = require('fs-extra')
const Path = require('path')
const njodb = require("njodb")
const Logger = require('./Logger')

class Db {
  constructor(CONFIG_PATH) {
    this.ConfigPath = CONFIG_PATH
    this.PhotosPath = Path.join(CONFIG_PATH, 'photos')
    this.UtilsPath = Path.join(CONFIG_PATH, 'utils')

    this.photosDb = new njodb.Database(this.PhotosPath)
    this.utilsDb = new njodb.Database(this.UtilsPath, { datastores: 2 })

    this.photos = []
    this.duplicate_photos = []
    this.failed_photos = []
    this.users = []
    this.albums = []
    this.settings = {}
  }

  async transferOldDatabaseAlbums() {
    const OldDbPath = Path.join(this.ConfigPath, 'db.json')
    const OldAuthPath = Path.join(this.ConfigPath, 'auth.json')

    const exists = await fs.pathExists(OldDbPath)
    if (exists) {
      Logger.info('Old database entry is here, transfering albums.')
      try {
        var oldData = await fs.readJSON(OldDbPath)
        Logger.debug('Old Data', oldData)
        if (oldData.albums) {
          var albumsToAdd = oldData.albums.map(a => {
            return {
              recordType: 'album',
              ...a
            }
          })
          Logger.debug('Adding Albums', albumsToAdd)
          await this.utilsDb.insert(albumsToAdd).then((results) => {
            this.albums = albumsToAdd
            Logger.debug(`[DB] Inserted albums ${results.inserted}`)
          })
          Logger.info('Old Db Transfer Complete, deleting old db files')
          await fs.remove(OldDbPath)
          await fs.remove(OldAuthPath)
          return true
        }
      } catch (error) {
        Logger.error('Failed to transfer old db albums... removing old db', error)
        await fs.remove(OldDbPath)
        await fs.remove(OldAuthPath)
      }
    }
    return false
  }

  getDefaultSettings() {
    return {
      recordType: 'settings',
      order_by: 'added_at',
      order_desc: true,
      card_size: 'md',
      auto_slide: false,
      slide_duration: 8000
    }
  }

  getDefaultAlbum() {
    return {
      recordType: 'album',
      id: 'starred',
      name: 'Starred',
      photos: [],
      created_at: Date.now(),
      created_by: 'system'
    }
  }

  getDefaultUser() {
    return {
      recordType: 'user',
      type: 'root',
      username: 'root',
      pash: '',
      created_at: Date.now()
    }
  }

  insertTests() {
    const utils = []
    utils.push({
      recordType: 'album',
      id: 'starred',
      name: 'Starred',
      timestamp: Date.now()
    })
    utils.push({
      recordType: 'user',
      type: 'root',
      username: 'root',
      pash: '',
      timestamp: Date.now()
    })
    utils.push(this.getDefaultSettings())
    return this.utilsDb.insert(utils).then((results) => {
      Logger.debug(`Inserted Test Data`, results)
    })
  }

  async init() {
    await this.load()

    // Insert Defaults
    if (!this.users.find(u => u.type === 'root')) {
      await this.insertUser(this.getDefaultUser())
    }
    if (!this.albums.length) {
      // Cleanup Old Database
      const hasOldAlbums = await this.transferOldDatabaseAlbums()
      if (!hasOldAlbums) {
        await this.insertAlbum(this.getDefaultAlbum())
      }
    }
    if (!this.settings || !Object.keys(this.settings).length) {
      await this.insertSettings(this.getDefaultSettings())
    }
  }

  async load() {
    var p1 = this.utilsDb.select((record => record.recordType === 'settings')).then((results) => {
      this.settings = results.data[0]
    })
    var p2 = this.utilsDb.select((record => record.recordType === 'album')).then((results) => {
      this.albums = results.data
    })
    var p3 = this.utilsDb.select((record => record.recordType === 'user')).then((results) => {
      this.users = results.data
    })
    var p4 = this.photosDb.select(() => true).then((results) => {
      this.photos = results.data
    })
    await Promise.all([p1, p2, p3, p4])
    Logger.info('Data loaded')
    Logger.debug(`${this.albums.length} Albums`, `${this.users.length} Users`)
  }

  async updateFromScan(photos_to_add, photos_to_remove) {
    if (photos_to_add.length) {
      await this.photosDb.insert(photos_to_add).then((results) => {
        this.photos = this.photos.concat(photos_to_add)
        Logger.debug(`[DB] Inserted ${results.inserted} records`)
      }).catch((error) => {
        Logger.error(`[DB] Insert from Scan Failed ${error}`)
      })
    }
    if (photos_to_remove.length) {
      var photo_ids_to_remove = photos_to_remove.map(p => p.id)
      await this.photosDb.delete((record) => photo_ids_to_remove.includes(record.id)).then((results) => {
        this.photos = this.photos.filter(p => !photo_ids_to_remove.includes(p.id))
        Logger.debug(`[DB] Deleted ${results.deleted} records`)
      }).catch((error) => {
        Logger.error(`[DB] Remove from Scan Failed ${error}`)
      })
    }
  }

  removeThumbs(photos) {
    var photo_ids = photos.map(p => p.id)
    return this.photosDb.update((record) => photo_ids.includes(record.id), (record) => {
      delete record.thumb
      record.thumbPath = null
      return record
    }).then((results) => {
      this.photos = this.photos.map(p => {
        if (photo_ids.includes(p.id)) {
          delete p.thumb
          p.thumbPath = null
        }
        return null
      })
      Logger.debug(`[DB] Removed Thumbs for ${results.modified} records`)
    }).catch((error) => {
      Logger.error(`[DB] Remove Thumbs Failed ${error}`)
    })
  }

  insertPhoto(photo) {
    return this.photosDb.insert([photo]).then((results) => {
      Logger.debug(`[DB] Inserted photo ${results.inserted}`)
    }).catch((error) => {
      Logger.error(`[DB] Insert Photo Failed ${error}`)
    })
  }

  removePhoto(photoId) {
    return this.photosDb.delete((record) => record.id === photoId).then((results) => {
      Logger.debug(`[DB] Deleted photo ${results.deleted}`)
    }).catch((error) => {
      Logger.error(`[DB] Delete Photo Failed ${error}`)
    })
  }

  updatePhotos(photos) {
    var photo_ids = photos.map(p => p.id)
    return this.photosDb.update((record) => photo_ids.includes(record.id), (record) => {
      return photos.find(p => p.id === record.id)
    }).then((results) => {
      Logger.debug(`[DB] Updated photos for ${results.updated} records`)
    }).catch((error) => {
      Logger.error(`[DB] Update Photos Failed ${error}`)
    })
  }

  updateAlbum(album) {
    return this.utilsDb.update((record) => record.recordType === 'album' && record.id === album.id, () => {
      return album
    }).then((results) => {
      Logger.debug(`[DB] Album updated ${results.updated}`)
    }).catch((error) => {
      Logger.error(`[DB] Album update failed ${error}`)
    })
  }

  insertAlbum(album) {
    return this.utilsDb.insert([album]).then((results) => {
      this.albums.push(album)
      Logger.debug(`[DB] Inserted album ${results.inserted}`)
    }).catch((error) => {
      Logger.error(`[DB] Insert Album Failed ${error}`)
    })
  }

  removeAlbum(albumId) {
    return this.utilsDb.delete((record) => record.recordType === 'album' && record.id === albumId).then((results) => {
      Logger.debug(`[DB] Deleted album ${results.deleted}`)
    }).catch((error) => {
      Logger.error(`[DB] Delete album Failed ${error}`)
    })
  }

  insertSettings(settings) {
    return this.utilsDb.insert([settings]).then((results) => {
      Logger.debug(`[DB] Inserted settings ${results.inserted}`)
      this.settings = settings
    }).catch((error) => {
      Logger.error(`[DB] Insert settings Failed ${error}`)

    })
  }

  updateSettings(settings) {
    return this.utilsDb.update((record) => record.recordType === 'settings', () => settings).then((results) => {
      this.settings = settings
      Logger.debug(`[DB] Settings updated ${results.updated}`)
    }).catch((error) => {
      Logger.error(`[DB] Settings update failed ${error}`)
    })
  }

  insertUser(user) {
    return this.utilsDb.insert([user]).then((results) => {
      Logger.debug(`[DB] Inserted user ${results.inserted}`)
      this.users.push(user)
    }).catch((error) => {
      Logger.error(`[DB] Insert user Failed ${error}`)
    })
  }
}
module.exports = Db