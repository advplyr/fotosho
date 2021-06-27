<template>
  <div class="text-white max-h-screen overflow-hidden">
    <appbar :is-connected="isConnected" :is-reconnecting="isReconnecting" />
    <Nuxt />
    <modal />
    <toaster />
  </div>
</template>

<script>
export default {
  data() {
    return {
      socket: null,
      socketStatus: null,
      isReconnecting: false,
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
  beforeMount() {
    console.log('Mounted Default Layout')
    this.socket = this.$nuxtSocket({
      name: process.env.NODE_ENV === 'development' ? 'dev' : 'prod',
      persist: 'main',
      teardown: true
    })
    this.$root.socket = this.socket
    console.log('Socket Has Been Defined', this.$store.state.$nuxtSocket)

    this.socket.on('connect', () => {
      console.log('Socket Connected', this.socket.id)
      this.isConnected = true
    })
    this.socket.on('disconnect', () => {
      console.log('Socket Disconnected')
      this.isConnected = false
    })
    this.socket.on('reconnecting', (num) => {
      this.isReconnecting = true
      this.reconnectionAttempt = num
    })
    this.socket.on('reconnect', () => {
      this.isReconnecting = false
    })
    this.socket.on('reconnect_error', () => {
      this.isReconnecting = false
    })
    this.socket.on('reconnect_failed', () => {
      this.isReconnecting = false
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
    this.socket.on('init', (data) => {
      console.log('InitData', data)
      this.$store.commit('setIsScanning', data.scanning)
      this.$store.commit('setNumPhotos', data.num_photos)
      this.$store.commit('setAlbums', data.albums)
    })
    this.socket.on('scan_complete', () => {
      console.log('scan_complete')
      this.$store.commit('setIsScanning', false)
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