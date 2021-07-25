<template>
  <div class="w-full h-16">
    <div class="w-full flex items-center bg-fg px-4 h-16">
      <nuxt-link v-if="album" to="/" class="w-12 h-12 cursor-pointer mr-2 p-2 rounded-full hover:bg-opacity-25 bg-black bg-opacity-0">
        <ui-icon icon="arrowLeft" />
      </nuxt-link>

      <h1 v-if="!isSelectionMode" class="text-2xl">{{ title }}</h1>
      <h1 v-else class="text-2xl">Selected {{ selectedPhotos.length }} Photos</h1>
      <div class="mx-4 h-4 w-4 shadow-md relative">
        <div class="w-3 h-3 rounded-full animate-ping duration-1000 absolute top-0.5 left-0.5" :class="isConnected ? 'bg-success' : isReconnecting ? 'bg-warning' : 'bg-error'" />
        <div class="w-4 h-4 rounded-full absolute top-0 left-0" :class="isConnected ? 'bg-success' : isReconnecting ? 'bg-warning' : 'bg-error'" />
      </div>

      <div class="flex-grow" />
      <div v-if="isSelectionMode" class="flex items-center">
        <ui-btn v-if="!album" class="bg-yellow-500 hover:bg-yellow-600 mr-6" @click="addToAlbumClick">Add to Album</ui-btn>
        <ui-btn v-else class="bg-red-500 hover:bg-red-600 mr-6" @click="removeFromAlbum">Remove from Album</ui-btn>

        <a href="" class="flex bg-black bg-opacity-0 rounded-full font-bold text-white p-2 h-12 w-12 transition duration-300 ease-in-out hover:bg-opacity-40 mr-6" @click.stop.prevent="cancelSelection">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </a>
      </div>
      <div v-else-if="album && album.id !== 'starred'">
        <ui-btn class="bg-red-500 hover:bg-red-600 mr-6" @click="deleteAlbum">Delete Album</ui-btn>
      </div>
      <div v-else class="flex items-center">
        <p>v{{ $config.version }}</p>
        <!-- <p class="text-lg pl-4 underline font-semibold">{{ username }}</p> -->
        <ui-menu :label="username" :items="userMenuItems" class="ml-4 w-24" @action="menuAction" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    isConnected: Boolean,
    isReconnecting: Boolean
  },
  computed: {
    userMenuItems() {
      return [
        // {
        //   text: 'Settings',
        //   value: 'settings'
        // },
        {
          text: 'Logout',
          value: 'logout'
        }
      ]
    },
    user() {
      return this.$store.state.user.user
    },
    username() {
      return this.user ? this.user.username : null
    },
    routeParams() {
      return this.$route.params
    },
    albumId() {
      return this.routeParams.id
    },
    album() {
      if (!this.albumId) return null
      return this.$store.getters.getAlbum(this.albumId)
    },
    title() {
      if (this.album) return `Album: ${this.albumName}`
      return 'Fotosho'
    },
    isSelectionMode() {
      return this.selectedPhotos.length > 0
    },
    selectedPhotos() {
      return this.$store.state.selectedPhotos
    },
    albumName() {
      return this.album ? this.album.name : null
    }
  },
  methods: {
    menuAction(action) {
      if (action === 'logout') {
        this.$axios.$get(`${process.env.serverUrl}/logout`).then(() => {
          console.log('Logged out')
          window.location.reload()
        })
      }
    },
    cancelSelection() {
      this.$store.commit('cancelSelection')
    },
    addToAlbumClick() {
      this.$store.commit('setShowAlbumModal', true)
    },
    removeFromAlbum() {
      var photos = this.selectedPhotos.map((p) => p.id)
      this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'remove_from_album', msg: { albumId: this.albumId, photos } })
      this.$store.commit('cancelSelection')
    },
    deleteAlbum() {
      this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'delete_album', msg: { albumId: this.albumId } })
    }
  }
}
</script>

<style>
.animate-ping {
  animation-duration: 4s;
}
</style>