<template>
  <div class="wrapper overflow-y-auto p-6 bg-bg">
    <gallery ref="gallery" :album-id="albumId" />
  </div>
</template>

<script>
export default {
  asyncData({ params }) {
    return {
      albumId: params.id
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
    }
  },
  methods: {
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

<style>
.wrapper {
  height: calc(100vh - 64px);
  max-height: calc(100vh - 64px);
  width: 100%;
}
</style>