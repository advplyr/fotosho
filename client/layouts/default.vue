<template>
  <div class="text-white max-h-screen overflow-hidden">
    <div v-if="!isReady" class="w-full h-full flex items-center justify-center fixed top-0 left-0 bg-bg">
      <div>
        <p class="text-2xl text-center mb-2">Waiting for socket connection...</p>
        <p v-if="isConnected" class="text-center text-error text-lg mb-2">Socket connected but initial data not set</p>
        <p v-if="reconnectionAttempt" class="text-center text-lg">Reconnection Attempt: {{ reconnectionAttempt }}</p>
      </div>
    </div>
    <div v-else>
      <app-appbar :is-connected="isConnected" :is-reconnecting="isReconnecting" />
      <Nuxt />
      <modal />
      <widgets-toaster />
      <widgets-status-alert />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      socket: null,
      socketStatus: null,
      isReconnecting: false,
      isReady: false,
      reconnectionAttempt: 0
    }
  },
  watch: {
    user: {
      immediate: true,
      handler() {
        this.chkRoute()
      }
    },
    isInitialized() {
      this.chkRoute()
    }
  },
  computed: {
    isConnected: {
      get() {
        return this.$store.state.isSocketConnected
      },
      set(val) {
        this.$store.commit('setSocketConnected', val)
      }
    },
    user() {
      return this.$store.state.user.user
    },
    isInitialized() {
      return this.$store.state.isInitialized
    },
    isScanning() {
      return this.$store.state.isScanning
    }
  },
  methods: {
    // For dev only to mimic server middleware
    chkRoute() {
      if (process.env.NODE_ENV === 'production') return
      if (!this.user && localStorage.getItem('user')) {
        var _user = JSON.parse(localStorage.getItem('user'))
        this.$store.commit('user/setUser', _user)
        this.$nextTick(this.chkRoute)
        return
      }
      if (!this.user) {
        this.$router.replace('/login')
      } else if (!this.isInitialized && this.$route.name !== 'launch') {
        this.$router.replace('/launch')
      } else if (this.isInitialized && this.$route.name === 'launch') {
        this.$router.replace('/')
      }
    },
    connect() {
      console.log('Socket Connected', this.socket.id)
      this.isConnected = true
    },
    connectError(err) {
      console.log('Socket connect error', err)
    },
    disconnect() {
      console.log('Socket Disconnected')
      this.isConnected = false
    },
    reconnecting(num) {
      console.log('Socket Reconnecting..', num)
      this.isReconnecting = true
      this.reconnectionAttempt = num
    },
    reconnect() {
      this.isReconnecting = false
    },
    reconnectError(err) {
      console.error('Socket reconnect error', err)
      this.isReconnecting = false
    },
    reconnectFailed() {
      console.error('Socket reconnect failed')
      this.isReconnecting = false
    },
    initialData(data) {
      console.log('InitData', data)
      if (data.user) {
        this.$store.commit('user/setUser', data.user)
      }
      this.$store.commit('setInitialData', data)

      this.isReady = true
    },
    scanStart() {
      this.$store.commit('setIsInitialized', true)
      this.$store.commit('setIsScanning', true)
      console.log('Set Scan Start')

      if (this.$route.name === 'launch') {
        this.$router.push('/')
      }
    },
    scanComplete() {
      this.$store.commit('setIsScanning', false)
      console.log('Scan Complete')
      this.$store.commit('addToast', { text: 'Scan Complete', type: 'success' })
    },
    scanProgress(scanProgress) {
      this.$store.commit('setScanProgress', scanProgress)
    },
    initializeSocket() {
      this.socket = this.$nuxtSocket({
        name: process.env.NODE_ENV === 'development' ? 'dev' : 'prod',
        persist: 'main',
        teardown: true,
        transports: ['websocket'],
        upgrade: false
      })
      this.$root.socket = this.socket

      this.socket.on('connect', this.connect)
      this.socket.on('connect_error', this.connectError)
      this.socket.on('disconnect', this.disconnect)
      this.socket.on('reconnecting', this.reconnecting)
      this.socket.on('reconnect', this.reconnect)
      this.socket.on('reconnect_error', this.reconnectError)
      this.socket.on('reconnect_failed', this.reconnectFailed)
      this.socket.on('reload', () => {
        window.location.reload()
      })

      this.socket.on('added_to_album', (data) => {
        this.$store.commit('updateAlbum', data.album)
        if (data.photos.length === 1) {
          var _photo = data.photos[0]
          this.$store.commit('addToast', { text: `${_photo.basename} added to album ${data.album.name}`, type: 'success' })
        } else {
          this.$store.commit('addToast', { text: `${data.photos.length} Photos added to album ${data.album.name}`, type: 'success' })
        }
      })
      this.socket.on('removed_from_album', (data) => {
        this.$store.commit('updateAlbum', data.album)
        if (data.photos.length === 1) {
          var _photo = data.photos[0]
          this.$store.commit('addToast', { text: `${_photo.basename} removed from album ${data.album.name}`, type: 'info' })
        } else {
          this.$store.commit('addToast', { text: `${data.photos.length} Photos removed from album ${data.album.name}`, type: 'info' })
        }
      })
      this.socket.on('album_deleted', (data) => {
        this.$store.commit('deleteAlbum', data.album)
        this.$store.commit('addToast', { text: `Album ${data.album.name} was deleted`, type: 'info' })
      })
      this.socket.on('init', this.initialData)

      this.socket.on('scan_start', this.scanStart)
      this.socket.on('scan_complete', this.scanComplete)
      this.socket.on('scan_progress', this.scanProgress)

      this.socket.on('generating_thumbnails', (data) => {
        console.log('IsGeneratingThumbnails', data)
        this.$store.commit('setIsGeneratingThumbnails', data.isGenerating)
      })
      this.socket.on('album_not_found', (data) => {
        this.$store.commit('addToast', { text: `Album ${data} not found`, type: 'error' })
      })
      this.socket.on('photo_not_found', (data) => {
        this.$store.commit('addToast', { text: `Photo ${data} not found`, type: 'error' })
      })
      this.socket.on('new_photo', (data) => {
        this.$store.commit('addToast', { text: `Photo ${data.basename} was added`, type: 'info' })
      })
      this.socket.on('photo_removed', (data) => {
        this.$store.commit('addToast', { text: `Photo ${data.basename} was removed`, type: 'info' })
      })
      this.socket.on('settings_updated', (data) => {
        // console.log('Settings Saved')
      })
    }
  },
  beforeMount() {
    this.initializeSocket()
  },
  mounted() {}
}
</script>

<style>
html,
body {
  font-family: 'Ubuntu Mono', monospace;
}
h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: 'Fira Mono', monospace;
  font-weight: bold;
}
</style>