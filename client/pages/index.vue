<template>
  <div v-if="isInitialized" class="bg-bg h-full">
    <div class="w-full h-16 flex items-center pr-4 bg-fg bg-opacity-50">
      <div class="h-full px-8 hover:bg-fg flex items-center justify-center text-center text-2xl border-b-2 cursor-pointer" :class="showAlbums ? 'border-transparent' : 'border-success bg-fg bg-opacity-75'" @click="showAlbums = false">
        <span class="pr-2">Photos</span>
        <div class="rounded-full px-2 py-0.5 font-mono text-sm bg-black bg-opacity-25">
          <p>{{ numPhotos }}</p>
        </div>
      </div>
      <div class="h-full px-8 hover:bg-fg flex items-center justify-center text-center text-2xl border-b-2 cursor-pointer" :class="!showAlbums ? 'border-transparent' : 'border-success bg-fg bg-opacity-75'" @click="showAlbums = true">
        <span class="pr-2">Albums</span>
        <div class="rounded-full px-2 py-0.5 font-mono text-sm bg-black bg-opacity-25">
          <p>{{ albums.length }}</p>
        </div>
      </div>

      <div class="flex-grow" />
      <search-input v-show="!showAlbums" v-model="search" @change="performSearch" class="mr-2" />
      <ui-order-select v-show="!showAlbums" v-model="orderBy" :descending.sync="orderDesc" class="mr-2 w-40" @change="changedOrderBy" />
      <ui-select-dropdown v-show="!showAlbums" v-model="cardSize" :items="cardSizes" label="Size" class="w-32" @change="changeCardSize" />
    </div>

    <div v-show="showAlbums" class="w-full">
      <div class="flex flex-wrap justify-center">
        <template v-for="album in albums">
          <album-card :key="album.id" :album="album" />
        </template>
      </div>
    </div>
    <app-gallery2 v-show="!showAlbums" ref="gallery" />
  </div>
  <div v-else class="text-black p-8">
    <h1>Not Initialized</h1>
  </div>
</template>

<script>
export default {
  props: {
    socket: {
      type: Object,
      default: () => {}
    }
  },
  data() {
    return {
      showAlbums: false,
      refreshTimeout: null,
      cardSizes: [
        {
          text: 'X-Small',
          value: 'xs',
          height: 80
        },
        {
          text: 'Small',
          value: 'sm',
          height: 112
        },
        {
          text: 'Medium',
          value: 'md',
          height: 176
        },
        {
          text: 'Large',
          value: 'lg',
          height: 240
        },
        {
          text: 'X-Large',
          value: 'xl',
          height: 320
        }
      ],
      search: null
    }
  },
  computed: {
    albums() {
      return this.$store.state.albums
    },
    isInitialized() {
      return this.$store.state.isInitialized
    },
    cardSize: {
      get() {
        return this.$store.state.settings.card_size
      },
      set(val) {
        this.$store.commit('setCardSize', val)
        this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'update_settings', msg: { card_size: val } })
      }
    },
    orderBy: {
      get() {
        return this.$store.state.settings.order_by
      },
      set(val) {
        this.$store.commit('setOrderBy', val)
        this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'update_settings', msg: { order_by: val } })
      }
    },
    orderDesc: {
      get() {
        return this.$store.state.settings.order_desc
      },
      set(val) {
        this.$store.commit('setOrderDesc', !!val)
        this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'update_settings', msg: { order_desc: !!val } })
      }
    },
    numPhotos() {
      return this.$store.state.numPhotos
    }
  },
  methods: {
    performSearch() {
      if (this.$refs.gallery) this.$refs.gallery.performSearch(this.search)
    },
    changedOrderBy() {
      if (this.$refs.gallery) this.$refs.gallery.changedOrderBy()
    },
    changeCardSize() {
      if (this.$refs.gallery) this.$refs.gallery.changeCardSize()
    },
    thumbnailsGenerated(data) {
      if (!this.$refs.gallery) {
        console.error('Invalid gallery not there..')
        return
      }
      console.log('Thumbnails Generated', data)
      data.photos.forEach((photo) => {
        this.$refs.gallery.updateThumbnail(photo)
      })
    },
    newPhotoAdded(data) {
      // Todo: first check if a refresh is needed
      clearTimeout(this.refreshTimeout)
      this.refreshTimeout = setTimeout(() => {
        if (this.$refs.gallery) {
          this.$refs.gallery.refreshPhotos()
        }
      }, 1000)
    },
    photoRemoved(data) {
      // Todo: first check if a refresh is needed
      clearTimeout(this.refreshTimeout)
      this.refreshTimeout = setTimeout(() => {
        if (this.$refs.gallery) {
          this.$refs.gallery.refreshPhotos()
        }
      }, 1000)
    }
  },
  mounted() {
    var socket = this.$root.socket
    if (!socket) return
    socket.on('thumbnails_generated', this.thumbnailsGenerated)
    socket.on('new_photo', this.newPhotoAdded)
    socket.on('photo_removed', this.photoRemoved)
  },
  beforeDestroy() {
    var socket = this.$root.socket
    if (!socket) return
    socket.off('thumbnails_generated', this.thumbnailsGenerated)
    socket.off('new_photo', this.newPhotoAdded)
    socket.off('photo_removed', this.photoRemoved)
  }
}
</script>
