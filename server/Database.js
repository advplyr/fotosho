const Path = require('path')
const bcrypt = require('bcryptjs')
const SimpleJsonDb = require('simple-json-db')
const fs = require('fs-extra')

class Database {
  constructor(CONFIG_PATH) {
    this.ConfigPath = CONFIG_PATH
    this.DbPath = Path.join(CONFIG_PATH, 'db.json')
    this.AuthDbPath = Path.join(CONFIG_PATH, 'auth.json')

    this.db = null
    this.authDb = null

    this.photos = []
    this.settings = {}
    this.duplicate_photos = []
    this.albums = []
    this.failed_photos = []
    this.users = []
    this.isPasswordless = false
  }

  async initDb(dbPath) {
    var db = null
    try {
      db = new SimpleJsonDb(dbPath, { asyncWrite: true })
    } catch (error) {
      console.error('Failed to init DB', dbPath)
      await fs.unlink(dbPath)
      db = new SimpleJsonDb(dbPath, { asyncWrite: true })
    }
    return db
  }

  async init() {
    await fs.ensureDir(this.ConfigPath)
    this.db = await this.initDb(this.DbPath)
    this.authDb = await this.initDb(this.AuthDbPath)

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

    if (!this.authDb.has('users')) {
      this.authDb.set('users', [
        {
          username: 'root',
          pash: '',
          type: 'root'
        }
      ])
    }
    this.users = this.authDb.get('users')

    var root = this.users.find(u => u.type === 'root')
    this.isPasswordless = root.pash === ''
  }

  save() {
    this.db.set('photos', this.photos)
    this.db.set('duplicate_photos', this.duplicate_photos)
    this.db.set('failed_photos', this.failed_photos)
    this.db.set('albums', this.albums)
    this.db.set('settings', this.settings)
    return this.db.sync()
  }

  saveAuthDb() {
    this.authDb.set('users', this.users)
    return this.authDb.sync()
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

  hashPass(password) {
    return new Promise((resolve) => {
      bcrypt.hash(password, 8, (err, hash) => {
        if (err) {
          console.error('Hash failed', err)
          resolve(null)
        } else {
          resolve(hash)
        }
      })
    })
  }

  async getAuth(req) {
    if (req.signedCookies.user) {
      var user = this.users.find(u => u.username = req.signedCookies.user)
      if (user) {
        delete user.pash
      }
      return user
    } else {
      return false
    }
  }

  async checkAuth(req, res) {
    var username = req.body.username
    console.log('Check Auth', username, !!req.body.password)

    var matchingUser = this.users.find(u => u.username === username)
    if (!matchingUser) {
      return res.json({
        error: 'User not found'
      })
    }
    var cleanedUser = { ...matchingUser }
    delete cleanedUser.pash

    // check for empty password (default)
    if (!req.body.password || req.body.password === '') {
      console.log('Req no pass')
      if (!matchingUser.pash || matchingUser.pash === '') {
        res.cookie('user', username, { signed: true })
        return res.json({
          user: cleanedUser
        })
      } else {
        console.log('Matching user pash not empty', matchingUser.pash)
        return res.json({
          error: 'Invalid Password'
        })
      }
    }

    // Set root password first time
    if (matchingUser.type === 'root' && matchingUser.pash === '' && req.body.password && req.body.password.length > 1) {
      var pw = await this.hashPass(req.body.password)
      if (!pw) {
        return res.json({
          error: 'Hash failed'
        })
      }
      this.users = this.users.map(u => {
        if (u.username === matchingUser.username) {
          u.pash = pw
        }
        return u
      })
      this.isPasswordless = false
      await this.saveAuthDb()
      return res.json({
        setroot: true,
        user: cleanedUser
      })
    }

    var compare = await bcrypt.compare(req.body.password, matchingUser.pash)
    if (compare) {
      res.cookie('user', username, { signed: true })
      res.json({
        user: cleanedUser
      })
    } else {
      res.json({
        error: 'Invalid Password'
      })
    }
  }
}
module.exports = Database