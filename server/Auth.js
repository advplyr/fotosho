const bcrypt = require('bcryptjs')
const Logger = require('./Logger')

class Auth {
  constructor(db) {
    this.db = db

    this.user = null
    this.isPasswordless = false
  }

  get username() {
    return this.user ? this.user.username : 'nobody'
  }

  get users() {
    return this.db.users
  }

  init() {
    var root = this.users.find(u => u.type === 'root')
    if (!root) {
      Logger.fatal('No Root User', this.users)
      throw new Error('No Root User')
    }
    this.isPasswordless = root.pash === ''
  }

  hashPass(password) {
    return new Promise((resolve) => {
      bcrypt.hash(password, 8, (err, hash) => {
        if (err) {
          Logger.error('Hash failed', err)
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
    Logger.debug('Check Auth', username, !!req.body.password)

    var matchingUser = this.users.find(u => u.username === username)
    if (!matchingUser) {
      return res.json({
        error: 'User not found'
      })
    }

    var cleanedUser = { ...matchingUser }
    delete cleanedUser.pash

    // check for empty password (default)
    if (!req.body.password) {
      if (!matchingUser.pash) {
        res.cookie('user', username, { signed: true })
        return res.json({
          user: cleanedUser
        })
      } else {
        return res.json({
          error: 'Invalid Password'
        })
      }
    }

    // Set root password first time
    if (matchingUser.type === 'root' && !matchingUser.pash && req.body.password && req.body.password.length > 1) {
      console.log('Set root pash')
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
module.exports = Auth