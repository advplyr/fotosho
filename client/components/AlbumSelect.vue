<template>
  <select-dropdown v-model="selected" :items="albumItems" placeholder="Select Album" @change="selectChanged" />
</template>

<script>
export default {
  props: {
    value: String,
    albumsToExclude: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {}
  },
  computed: {
    selected: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit('input', val)
      }
    },
    albums() {
      return this.$store.state.albums
    },
    albumItems() {
      var albums = [
        ...this.albums.map((album) => {
          return {
            value: album.id,
            text: album.name
          }
        }),
        {
          value: '__new__',
          text: 'Create new Album'
        }
      ]
      return albums.filter((alb) => {
        if (this.albumsToExclude.find((_alb) => _alb.id === alb.value)) return false
        return true
      })
    }
  },
  methods: {
    selectChanged(albumId) {
      this.$emit('change', albumId)
    }
  },
  mounted() {}
}
</script>