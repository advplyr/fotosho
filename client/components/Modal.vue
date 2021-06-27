<template>
  <div v-if="show" class="fixed z-10 top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black bg-opacity-95 flex items-center justify-center" @click.stop="clickBackground">
    <div class="absolute top-4 right-8 w-14 h-14 text-white hover:text-gray-300 cursor-pointer rounded-full p-2">
      <icon icon="close" />
    </div>
    <div class="w-full max-w-lg h-full max-h-80 rounded-xl shadow-2xl p-4 bg-bg border border-white border-opacity-20" @click.stop>
      <h1 class="text-2xl mb-8">Add to Album</h1>
      <div class="flex justify-center mb-8">
        <div class="bg-fg shadow-xl rounded-lg w-full overflow-hidden">
          <ul class="divide-y divide-gray-400">
            <template v-for="album in albums">
              <li :key="album.id" class="text-lg px-4 py-2 hover:bg-gray-500 cursor-pointer flex" @click.stop="addToAlbum(album.id)">
                <span>{{ album.name }}</span>
                <div class="flex-grow" />
                <div class="w-6 h-6 rounded-full bg-white bg-opacity-25 flex items-center justify-center">
                  <span class="font-mono">{{ album.photos.length }}</span>
                </div>
              </li>
            </template>
          </ul>
        </div>
      </div>

      <p v-if="errorMsg" class="px-4 text-red-600 mb-2 mt-4">{{ errorMsg }}</p>
      <form @submit.prevent="submitNewAlbumName">
        <div class="flex">
          <!-- <span class="border border-2 border-gray-600 rounded-l px-4 py-2 bg-gray-600 whitespace-nowrap">Create New</span> -->
          <input v-model="newAlbumName" name="name" class="rounded-l px-4 py-2 w-full outline-none text-lg bg-fg placeholder-gray-300" type="text" placeholder="Enter new album name" />
          <span class="rounded-r px-4 py-2 bg-green-500 whitespace-nowrap cursor-pointer text-lg" @click.stop="submitNewAlbumName">Submit</span>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      errorMsg: null,
      newAlbumName: null
    }
  },
  computed: {
    show: {
      get() {
        return this.$store.state.showAlbumModal
      },
      set(val) {
        this.$store.commit('setShowAlbumModal', val)
      }
    },
    albums() {
      return this.$store.state.albums
    },
    selectedPhotos() {
      return this.$store.state.selectedPhotos
    }
  },
  methods: {
    clickBackground() {
      this.show = false
    },
    submitNewAlbumName() {
      this.errorMsg = null
      if (!this.newAlbumName) {
        console.error('No Album Name')
        return
      }
      var cleaned = this.newAlbumName.trim()
      if (this.albums.find((a) => a.name === cleaned)) {
        this.errorMsg = 'Name already taken'
        return
      }
      var photoIds = this.selectedPhotos.map((p) => p.id)
      this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'add_to_new_album', msg: { albumName: cleaned, photos: photoIds } })
      console.log('Emitted add to new album', photoIds, cleaned)
      this.show = false
      this.newAlbumName = null
      this.$store.commit('cancelSelection')
    },
    addToAlbum(albumId) {
      var photoIds = this.selectedPhotos.map((p) => p.id)
      this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'add_to_album', msg: { albumId, photos: photoIds } })
      console.log('Dispatch emit')
      this.show = false
      this.newAlbumName = null
      this.$store.commit('cancelSelection')
    }
  },
  mounted() {}
}
</script>