<template>
  <div v-if="isInitialized" id="cards-wrapper" class="wrapper overflow-y-auto p-6 bg-bg">
    <div class="flex items-center mb-2">
      <p class="text-2xl mr-4">Albums</p>
      <div class="rounded-full text-sm px-2 font-mono bg-black bg-opacity-25">
        <p>{{ albums.length }}</p>
      </div>
    </div>
    <div class="flex flex-wrap">
      <template v-for="album in albums">
        <album-card :key="album.id" :album="album" />
      </template>
    </div>
    <div class="w-full h-px bg-white bg-opacity-50 mx-auto mt-6 mb-3" />

    <gallery ref="gallery" />
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
    return {}
  },
  computed: {
    albums() {
      return this.$store.state.albums
    },
    isInitialized() {
      return this.$store.state.isInitialized
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
    }
  },
  mounted() {
    var socket = this.$root.socket
    if (!socket) return
    socket.on('thumbnails_generated', this.thumbnailsGenerated)
  },
  beforeDestroy() {
    var socket = this.$root.socket
    if (!socket) return
    socket.off('thumbnails_generated', this.thumbnailsGenerated)
  }
}
</script>

<style>
.wrapper {
  height: calc(100vh - 64px);
  max-height: calc(100vh - 64px);
  width: 100%;
}
.wrapper.scanning {
  height: calc(100vh - 96px);
  max-height: calc(100vh - 96px);
  width: 100%;
}
/* Hide scrollbar for Chrome, Safari and Opera */
.wrapper::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.wrapper {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>