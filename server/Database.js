const Path = require('path')
const SimpleJsonDb = require('simple-json-db')
const fs = require('fs-extra')

class Database {
  constructor(CONFIG_PATH) {
    this.ConfigPath = CONFIG_PATH
    this.DbPath = Path.join(CONFIG_PATH, 'db.json')
    this.db = null
    this.photos = []
    this.duplicate_photos = []
    this.albums = []
    this.failed_photos = []
  }

  async init() {
    await fs.ensureDir(this.ConfigPath)
    this.db = new SimpleJsonDb(this.DbPath, { asyncWrite: true })
    if (!this.db.has('albums')) {
      this.db.set('albums', [
        {
          id: 'starred',
          name: 'Starred',
          photos: [],
          created_at: Date.now(),
          created_by: 'system'
        }
      ])
    }
    if (!this.db.has('photos')) {
      this.db.set('photos', [])
    }
    this.photos = this.db.get('photos')
    this.duplicate_photos = this.db.get('duplicate_photos')
    this.failed_photos = this.db.get('failed_photos')
    this.albums = this.db.get('albums')
  }

  save() {
    this.db.set('photos', this.photos)
    this.db.set('duplicate_photos', this.duplicate_photos)
    this.db.set('failed_photos', this.failed_photos)
    this.db.set('albums', this.albums)
    return this.db.sync()
  }
}
module.exports = Database