<template>
  <div class="w-full">
    <div class="flex items-center mb-2">
      <p class="text-2xl mr-4">Photos</p>
      <div class="rounded-full px-2 py-1 font-mono text-sm bg-black bg-opacity-25">
        <p>{{ numPhotos }}</p>
      </div>
      <div class="flex-grow" />
      <!-- <p class="text-sm font-mono leading-4 px-4">{{ totalSizePretty }}</p> -->
      <search-input v-model="search" :processing="isFetching" @change="performSearch" class="mr-2" />
      <order-select v-model="orderBy" :descending.sync="orderDesc" class="mr-2 w-40" @change="changedOrderBy" />
      <select-dropdown v-model="cardSize" :items="cardSizes" label="Size" class="w-32" @change="changeCardSize" />
    </div>

    <div class="flex flex-wrap justify-center max-w-full">
      <template v-for="photo in photos">
        <thumbnail :key="photo.id" :photo="photo" :size="cardSize" @starred="photoStarred" @edit="editPhoto(photo)" @click="clickedThumbnail" />
      </template>
    </div>
    <div v-if="isFetching" class="w-full mt-4 flex items-center justify-center flex-col">
      <p class="text-center text-2xl mb-4">Fetching photos...</p>
      <svg class="w-16 h-16 animate-spin text-white" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
      </svg>
    </div>
    <p v-else-if="!photos.length" class="text-center text-2xl my-4">No Photos</p>

    <div v-if="hasLoadedAll && isScrollable" class="w-full py-4 flex items-center justify-around">
      <div class="w-5/12 h-px bg-white bg-opacity-25 hidden md:block" />
      <p class="text-center px-4 opacity-60">The End</p>
      <div class="w-5/12 h-px bg-white bg-opacity-25 hidden md:block" />
    </div>
    <div class="py-px">
      <div id="bottom" class="w-full h-1 bg-red-500 bg-opacity-0" />
    </div>

    <slideshow ref="slideshow" v-model="showSlideshow" :num-photos="numPhotos" :photo-index.sync="slideshowPhotoIndex" :request-query="requestQuery" @edit="editPhoto" />
    <edit-modal v-model="showEditModal" :photo="selectedPhoto" />
  </div>
</template>

<script>
export default {
  props: {
    albumId: String
  },
  data() {
    return {
      showSlideshow: false,
      showEditModal: false,
      selectedPhoto: null,
      hasLoadedAll: false,
      fetchingStart: null,
      isFetching: false,
      photos: [],
      slideshowPhotoIndex: null,
      isScrollable: false,
      cardSizes: [
        {
          text: 'X-Small',
          value: 'xs'
        },
        {
          text: 'Small',
          value: 'sm'
        },
        {
          text: 'Medium',
          value: 'md'
        },
        {
          text: 'Large',
          value: 'lg'
        },
        {
          text: 'X-Large',
          value: 'xl'
        }
      ],
      search: null,
      requestQuery: null
    }
  },
  computed: {
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
    hasSearch() {
      return this.search && this.search.length
    },
    numPhotos() {
      if (this.albumId) return this.album ? this.album.photos.length : 0
      return this.$store.state.numPhotos
    },
    album() {
      if (!this.albumId) return null
      return this.$store.getters.getAlbum(this.albumId)
    },
    totalSize() {
      var _size = 0
      this.photos.forEach((photo) => {
        if (photo.size && !isNaN(photo.size)) _size += photo.size
      })
      return _size
    },
    totalSizePretty() {
      return this.$bytesPretty(this.totalSize)
    },
    numPhotosToFetch() {
      if (this.cardSize === 'xs') return 100
      else if (this.cardSize === 'sm') return 75
      else if (this.cardSize === 'md') return 50
      else if (this.cardSize === 'lg') return 30
      return 15
    }
  },
  methods: {
    performSearch() {
      this.requestPhotos(0, true)
    },
    changedOrderBy(orderBy) {
      this.requestPhotos(0, true)
    },
    changeCardSize() {
      // this.checkPageScrollHeight()
      this.$nextTick(this.checkPageScrollHeight)
    },
    refreshPhotos() {
      this.requestPhotos(0, true)
    },
    editPhoto(photo) {
      this.selectedPhoto = photo
      this.showEditModal = true
    },
    clickedThumbnail(photo) {
      var index = this.photos.findIndex((p) => p.id === photo.id)
      this.slideshowPhotoIndex = index
      this.showSlideshow = true
    },
    photoStarred({ photoId, isStarred }) {
      const payload = {
        photoId: photoId,
        albumId: 'starred'
      }
      if (isStarred) {
        this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'add_to_album', msg: payload })
      } else {
        this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'remove_from_album', msg: payload })
      }
    },
    updateThumbnail(photo) {
      var _photo = this.photos.find((p) => p.id === photo.id)
      if (_photo) {
        _photo.thumbPath = photo.thumbPath
        _photo.thumb = photo.thumb

        var el = document.getElementById(`thumb-${_photo.id}`)
        if (el) {
          el.src = `${process.env.serverUrl}${_photo.thumbPath}`
        }
      }
    },
    requestPhotos(start, reset = false) {
      var query = `orderBy=${this.orderBy}&orderDesc=${this.orderDesc ? 1 : 0}`
      if (this.albumId) {
        query += `&album=${this.albumId}`
      }
      if (this.search) {
        query += `&search=${this.search}`
      }

      if (!reset && this.fetchingStart === start && query === this.requestQuery) {
        console.error('Already fetching start', this.fetchingStart, this.requestQuery)
        return
      }
      this.fetchingStart = start
      this.isFetching = true

      this.requestQuery = query
      var uri = `${process.env.serverUrl}/photos?s=${start}&qty=${this.numPhotosToFetch}&${query}`

      console.log('REQUEST PHOTOS', start, 'Should Reset?', reset)
      this.$axios
        .$get(uri)
        .then((res) => {
          if (!res.photos.length) {
            this.hasLoadedAll = true
          }

          if (reset) {
            this.photos = res.photos
            this.slideshowPhotoIndex = null
            if (this.$refs.slideshow) {
              this.$refs.slideshow.resetLoaded()
            }
          } else this.photos = this.photos.concat(res.photos)
          this.isFetching = false

          this.$nextTick(this.checkPageScrollHeight)
        })
        .catch((error) => {
          console.error(error)
        })
    },
    checkPageScrollHeight() {
      var wrapper = document.getElementById('cards-wrapper')
      if (wrapper) {
        this.isScrollable = wrapper.scrollHeight > wrapper.clientHeight
        if (wrapper.scrollHeight <= wrapper.clientHeight + 100) {
          this.requestPhotos(this.photos.length)
        }
      }
    },
    onIntersection(entries, opts) {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !this.hasLoadedAll) {
          if (this.fetchingStart === this.photos.length) {
            console.log('Already fetching this start', this.fetchingStart)
            return
          }
          this.requestPhotos(this.photos.length)
        }
      })
    },
    initObserver() {
      var bottom = document.getElementById('bottom')
      var cardsContainer = document.getElementById('cards-wrapper')
      var observer = new IntersectionObserver(this.onIntersection, { root: cardsContainer, threshold: 0.5 })
      observer.observe(bottom)
    }
  },
  mounted() {
    this.requestPhotos(0)
    this.initObserver()
  }
}
</script>