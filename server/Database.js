const Path = require('path')
const SimpleJsonDb = require('simple-json-db')
const fs = require('fs-extra')

class Database {
  constructor(CONFIG_PATH) {
    this.ConfigPath = CONFIG_PATH
    this.DbPath = Path.join(CONFIG_PATH, 'db.json')
    this.db = null
    this.photos = []
    this.settings = {}
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
    if (!this.db.has('settings')) {
      this.db.set('settings', this.getDefaultSettings())
    }
    this.photos = this.db.get('photos')
    this.duplicate_photos = this.db.get('duplicate_photos')
    this.failed_photos = this.db.get('failed_photos')
    this.albums = this.db.get('albums')
    this.settings = this.db.get('settings')
  }

  save() {
    this.db.set('photos', this.photos)
    this.db.set('duplicate_photos', this.duplicate_photos)
    this.db.set('failed_photos', this.failed_photos)
    this.db.set('albums', this.albums)
    this.db.set('settings', this.settings)
    return this.db.sync()
  }

  getDefaultSettings() {
    return {
      order_by: 'added_at',
      order_desc: true,
      card_size: 'md',
      auto_slide: false,
      slide_duration: 8000
    }
  }
}
module.exports = Database