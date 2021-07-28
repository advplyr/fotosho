<template>
  <div class="bg-bg">
    <div class="w-full h-16 flex items-center pr-4 bg-fg bg-opacity-50">
      <div class="h-full px-8 hover:bg-fg flex items-center justify-center text-center text-2xl border-b-2 cursor-pointer">
        <span class="pr-2">Photos</span>
        <div class="rounded-full px-2 py-0.5 font-mono text-sm bg-black bg-opacity-25">
          <p>{{ numPhotos }}</p>
        </div>
      </div>

      <div class="flex-grow" />
      <search-input v-model="search" @change="performSearch" class="mr-2" />
      <ui-order-select v-model="orderBy" :descending.sync="orderDesc" class="mr-2 w-40" @change="changedOrderBy" />
      <ui-select-dropdown v-model="cardSize" :items="cardSizes" label="Size" class="w-32" @change="changeCardSize" />
    </div>
    <app-gallery2 ref="gallery" :album-id="albumId" />
  </div>
</template>

<script>
export default {
  asyncData({ params }) {
    return {
      albumId: params.id,
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
  data() {
    return {}
  },
  computed: {
    albums() {
      return this.$store.state.albums
    },
    album() {
      return this.$store.getters.getAlbum(this.albumId)
    },
    albumPhotos() {
      return this.album ? this.album.photos || [] : []
    },
    numPhotos() {
      if (this.albumId) return this.album ? this.album.photos.length : 0
      return this.$store.state.numPhotos
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
    addedToAlbum(data) {
      console.log('Photo Added to Album', data)
      this.$refs.gallery.refreshPhotos()
    },
    removedFromAlbum(data) {
      console.log('Photo Removed from Album', data)
      this.$refs.gallery.refreshPhotos()
    },
    albumDeleted(data) {
      console.log('Album Deleted', data)
      if (String(data.album.id) === this.albumId) {
        console.log('This album was deleted')
        this.$router.replace('/')
      }
    }
  },
  mounted() {
    var socket = this.$root.socket
    if (!socket) {
      console.error('No Socket')
      return
    }
    socket.on('thumbnails_generated', this.thumbnailsGenerated)
    socket.on('added_to_album', this.addedToAlbum)
    socket.on('removed_from_album', this.removedFromAlbum)
    socket.on('album_deleted', this.albumDeleted)
  },
  beforeDestroy() {
    var socket = this.$root.socket
    if (!socket) {
      console.error('No Socket')
      return
    }
    socket.off('thumbnails_generated', this.thumbnailsGenerated)
    socket.off('added_to_album', this.addedToAlbum)
    socket.off('removed_from_album', this.removedFromAlbum)
    socket.off('album_deleted', this.albumDeleted)
  }
}
</script>
