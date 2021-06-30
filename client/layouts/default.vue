<template>
  <div class="text-white max-h-screen overflow-hidden">
    <div v-if="!isReady" class="w-full h-full flex items-center justify-center fixed top-0 left-0 bg-bg">
      <div>
        <p class="text-2xl text-center mb-2">Waiting for socket connection...</p>
        <p v-if="reconnectionAttempt" class="text-center text-lg">Reconnection Attempt: {{ reconnectionAttempt }}</p>
      </div>
    </div>
    <div v-else>
      <appbar :is-connected="isConnected" :is-reconnecting="isReconnecting" />
      <Nuxt />
      <modal />
      <toaster />
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
  computed: {
    isConnected: {
      get() {
        return this.$store.state.isSocketConnected
      },
      set(val) {
        this.$store.commit('setSocketConnected', val)
      }
    }
  },
  methods: {
    connect() {
      console.log('Socket Connected', this.socket.id)
      this.isConnected = true
    },
    disconnect() {
      console.log('Socket Disconnected')
      this.isConnected = false
    },
    reconnecting(num) {
      this.isReconnecting = true
      this.reconnectionAttempt = num
    },
    reconnect() {
      this.isReconnecting = false
    },
    reconnectError() {
      this.isReconnecting = false
    },
    reconnectFailed() {
      this.isReconnecting = false
    },
    initialData(data) {
      console.log('InitData', data)
      this.$store.commit('setInitialData', data)

      if (!this.isReady) {
        // First socket connection
        if (!data.isInitialized || data.scanning) {
          if (this.$route.name !== 'launch') {
            this.$router.replace('/launch')
          }
        } else if (this.$route.name === 'launch') {
          this.$router.replace('/')
        }

        this.$nextTick(() => {
          this.isReady = true
        })
      }
    },
    initializeSocket() {
      this.socket = this.$nuxtSocket({
        name: process.env.NODE_ENV === 'development' ? 'dev' : 'prod',
        persist: 'main',
        teardown: true
      })
      this.$root.socket = this.socket
      console.log('Socket Has Been Defined', this.$store.state.$nuxtSocket)

      this.socket.on('connect', this.connect)
      this.socket.on('disconnect', this.disconnect)
      this.socket.on('reconnecting', this.reconnecting)
      this.socket.on('reconnect', this.reconnect)
      this.socket.on('reconnect_error', this.reconnectError)
      this.socket.on('reconnect_failed', this.reconnectFailed)

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

      this.socket.on('scan_start', () => {
        this.$store.commit('setIsScanning', true)
      })
      this.socket.on('scan_complete', () => {
        this.$store.commit('setIsScanning', false)
        window.location.reload()
      })

      this.socket.on('generating_thumbnails', (data) => {
        console.log('IsGeneratingThumbnails', data)
      })
      this.socket.on('album_not_found', (data) => {
        this.$store.commit('addToast', { text: `Album ${data} not found`, type: 'error' })
      })
      this.socket.on('photo_not_found', (data) => {
        this.$store.commit('addToast', { text: `Photo ${data} not found`, type: 'error' })
      })
      this.socket.on('new_photo', (data) => {
        this.$store.commit('addToast', { text: `Photo ${data.basename} was added`, type: 'error' })
      })
      this.socket.on('photo_removed', (data) => {
        this.$store.commit('addToast', { text: `Photo ${data.basename} was removed`, type: 'error' })
      })
    }
  },
  beforeMount() {
    console.log('Mounted Default Layout')
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