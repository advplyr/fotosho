<template>
  <div v-if="show" class="fixed z-30 top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black bg-opacity-95 flex items-center justify-center" @click.stop="show = false">
    <div class="absolute top-4 right-4 w-14 h-14 text-white hover:text-gray-300 cursor-pointer rounded-full p-2">
      <ui-icon icon="close" />
    </div>
    <div class="w-full max-w-lg h-full max-h-80 rounded-xl shadow-2xl p-4 bg-bg border border-white border-opacity-20" @click.stop>
      <div class="w-full h-full flex max-w-full">
        <div class="w-1/4 h-full">
          <img :src="thumbSrc" class="mb-1 w-full" />
          <div class="flex items-center justify-around mb-2">
            <p class="font-mono text-center">{{ photoSize }}</p>
            <<ui-icon-btn icon="download" :size="7" :padding="1" @click="downloadPhoto" />
          </div>
          <div class="flex flex-col">
            <!-- <ui-btn class="bg-info hover:bg-blue-500 text-sm w-full mb-1" @click="deletePhoto">Move Photo</ui-btn> -->
            <!-- <ui-btn class="bg-error hover:bg-red-600 text-sm w-full" @click="deletePhoto">Delete Photo</ui-btn> -->
          </div>
        </div>
        <div class="h-full px-4 w-3/4">
          <p class="truncate text-sm mb-2">{{ photoPath }}</p>

          <div class="flex">
            <input v-model="newBasename" name="name" class="rounded-l px-2 py-1 w-full outline-none bg-fg placeholder-gray-300" type="text" placeholder="Photo Name" />
            <span class="rounded-r px-3 py-1 bg-success hover:bg-green-500 whitespace-nowrap cursor-pointer" @click.stop="submitNewName">Rename</span>
          </div>

          <div class="h-px w-full bg-white bg-opacity-50 my-4" />

          <p class="mb-1">Albums</p>
          <div v-if="albumsForPhoto.length" class="p-2 border border-gray-600 bg-fg rounded bg-opacity-50 mb-2">
            <template v-for="album in albumsForPhoto">
              <div :key="album.id">
                <a :href="`/album/${album.id}`" class="text-sm underline">{{ album.name }}</a>
              </div>
            </template>
          </div>
          <album-select v-model="selectedAlbum" :albums-to-exclude="albumsForPhoto" @change="albumSelected" />
          <form v-if="showNewAlbumInput" @submit.prevent="submitNewAlbumName">
            <div class="flex my-2">
              <!-- <span class="border border-2 border-gray-600 rounded-l px-4 py-2 bg-gray-600 whitespace-nowrap">Create New</span> -->
              <input v-model="newAlbumName" name="name" class="rounded-l px-4 py-2 w-full outline-none bg-fg placeholder-gray-300" type="text" placeholder="Enter new album name" />
              <span class="rounded-r px-4 py-2 bg-green-500 whitespace-nowrap cursor-pointer" @click.stop="submitNewAlbumName">Submit</span>
            </div>
          </form>
          <div v-else-if="selectedAlbum" class="w-full my-2 flex">
            <ui-btn class="w-full bg-info text-center" @click="addToAlbum">Add to Album</ui-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    value: Boolean,
    photo: {
      type: Object,
      default: () => null
    }
  },
  data() {
    return {
      selectedAlbum: null,
      newBasename: null,
      showNewAlbumInput: false,
      newAlbumName: null,
      errorMsg: null
    }
  },
  watch: {
    value(newVal) {
      if (newVal) {
        this.selectedAlbum = null
        this.newBasename = this.basename
      }
    }
  },
  computed: {
    show: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit('input', val)
      }
    },
    photoId() {
      return this.photo.id
    },
    basename() {
      return this.photo.basename
    },
    thumbPath() {
      return this.photo.thumbPath
    },
    thumbSrc() {
      return this.thumbPath ? `${process.env.serverUrl}${this.thumbPath}` : 'Logo.png'
    },
    photoPath() {
      return this.photo.path
    },
    photoSize() {
      return this.$bytesPretty(this.photo.size)
    },
    albums() {
      return this.$store.state.albums
    },
    albumsForPhoto() {
      return this.albums.filter((album) => album.photos.includes(this.photoId))
    }
  },
  methods: {
    albumSelected(albumId) {
      if (albumId === '__new__') {
        this.showNewAlbumInput = true
      } else {
        this.showNewAlbumInput = false
      }
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

      this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'add_to_new_album', msg: { albumName: cleaned, photos: [this.photoId] } })
      console.log('Emitted add to new album', this.photoId, cleaned)
      this.newAlbumName = null
      this.selectedAlbum = null
      this.showNewAlbumInput = false
      this.show = false
    },
    addToAlbum() {
      var albumId = this.selectedAlbum
      this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'add_to_album', msg: { albumId, photos: [this.photoId] } })
      this.newAlbumName = null
      this.selectedAlbum = null
      this.show = false
    },
    deletePhoto() {},
    downloadPhoto() {
      var uri = `${process.env.serverUrl}/photo/${this.photoId}`
      this.$downloadImage(uri, this.basename)
    },
    submitNewName() {
      if (!this.newBasename) {
        this.newBasename = this.basename
      }
      var sanitized = this.$sanitizeFilename(this.newBasename)
      if (!sanitized || sanitized === this.basename) {
        this.newBasename = this.basename
        return
      }
      if (this.newBasename !== sanitized) {
        this.newBasename = sanitized
        return
      }
      var payload = {
        photoId: this.photoId,
        newName: sanitized
      }
      console.log('Emitting rename', payload)
      this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'rename_photo', msg: payload })
    }
  },
  mounted() {}
}
</script>