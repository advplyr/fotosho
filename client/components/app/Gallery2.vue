<template>
  <div class="w-full h-full relative">
    <div id="cards-wrapper" ref="cardsContainer" class="w-full wrapper overflow-y-auto relative">
      <div class="w-full" :style="{ height: totalHeight + 'px' }" />
      <div class="w-full absolute left-0" :style="{ top: cardsWindowTop + 'px' }">
        <div class="flex flex-wrap justify-center max-w-full">
          <template v-for="photo in photosVisible">
            <thumbnail :key="photo.id" :photo="photo" :size="cardSize" @starred="photoStarred" @edit="editPhoto(photo)" @click="clickedThumbnail" />
          </template>
        </div>
      </div>

      <div v-if="isFetching" class="w-full mt-4 flex items-center justify-center flex-col">
        <p class="text-center text-2xl mb-4">Fetching photos...</p>
        <svg class="w-16 h-16 animate-spin text-white" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
        </svg>
      </div>
      <p v-else-if="!photos.length" class="text-center text-2xl my-4">No Photos</p>

      <slideshow ref="slideshow" v-model="showSlideshow" :num-photos="numPhotos" :photo-index.sync="slideshowPhotoIndex" :request-query="requestQuery" @edit="editPhoto" />
      <edit-modal v-model="showEditModal" :photo="selectedPhoto" />
    </div>

    <div v-show="hasScroll" class="absolute top-0 bottom-0 right-0 z-10 w-4 h-full cursor-pointer" @mousemove="mousemoveScrollBar" @mouseleave="mouseleaveScrollBar" @mousedown="mousedownScrollBar" @click="clickScrollBar">
      <template v-for="tick in numTicks">
        <div :key="tick + '-tick'" class="h-px bg-white bg-opacity-40 pointer-events-none" :class="tick % 4 === 0 ? 'w-full' : 'w-1/2'" :style="{ marginTop: tickSpacing + 'px', marginLeft: tick % 4 === 0 ? '' : '50%' }" />
      </template>

      <div class="absolute z-10 bg-success bg-opacity-75 right-0 pointer-events-none" style="width: 30%" :style="{ top: scrollbarCursorTop + 'px', height: scrollbarCursorHeight + 'px' }"></div>

      <div class="absolute rounded z-20 w-10 py-0.5 bg-white bg-opacity-75 text-black right-4 pointer-events-none text-center" ref="scrollTooltip" style="display: none">
        <p class="text-xs">{{ tooltipText }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    albumId: String
  },
  data() {
    return {
      scrollwrapper: null,
      showSlideshow: false,
      showEditModal: false,
      selectedPhoto: null,
      fetchingStart: null,
      isFetching: false,
      photos: [],
      slideshowPhotoIndex: null,
      isScrollable: false,
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
      search: null,
      requestQuery: null,
      bufferRows: 2,
      viewportHeight: 0,
      containerWidth: 0,
      containerHeight: 0,
      containerTop: 0,
      cardsWindowTop: 0,
      startRow: 0,
      startIndex: 0,
      tooltipText: 'Tooltip',
      scrollbarCursorTop: 0,
      draggingScroll: false,
      hasScroll: false
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
    photosVisible() {
      return this.photos.slice(this.startIndex, this.startIndex + this.cardsPerPage)
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
    cardSizeObj() {
      return this.cardSizes.find((size) => size.value === this.cardSize)
    },
    cardSizeHeight() {
      return this.cardSizeObj.height
    },
    cardsPerRow() {
      return Math.floor(this.containerWidth / this.cardSizeHeight)
    },
    rowsPerPage() {
      return Math.ceil(this.viewportHeight / this.cardSizeHeight)
    },
    cardsPerPage() {
      return this.cardsPerRow * (this.rowsPerPage + this.bufferRows)
    },
    cardsViewportHeight() {
      return (this.rowsPerPage + this.bufferRows) * this.cardSizeHeight
    },
    cardsWindowBottom() {
      return this.cardsWindowTop + this.cardsViewportHeight
    },
    totalRows() {
      return Math.ceil(this.numPhotos / this.cardsPerRow)
    },
    totalHeight() {
      return this.totalRows * this.cardSizeHeight
    },
    numTicks() {
      return Math.floor(this.containerHeight / this.tickSpacing)
    },
    tickSpacing() {
      return 20
    },
    scrollbarCursorHeight() {
      return (this.containerHeight / this.totalHeight) * this.containerHeight
    }
  },
  methods: {
    performSearch(search) {
      this.search = search
      this.requestPhotos(0, true)
    },
    changedOrderBy() {
      this.requestPhotos(0, true)
    },
    changeCardSize() {
      this.initViewport()
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
        // console.error('Already fetching start', this.fetchingStart, this.requestQuery)
        return
      }
      this.fetchingStart = start
      this.isFetching = true

      this.requestQuery = query
      var uri = `${process.env.serverUrl}/photos?s=${start}&qty=${this.numPhotos}&${query}`

      // console.log('REQUEST PHOTOS', start, 'Should Reset?', reset)
      this.$axios
        .$get(uri)
        .then((res) => {
          this.photos = res.photos
          if (reset) {
            this.slideshowPhotoIndex = null
            if (this.$refs.slideshow) {
              this.$refs.slideshow.resetLoaded()
            }
          }
          this.isFetching = false
        })
        .catch((error) => {
          console.error(error)
        })
    },
    initViewport() {
      this.containerWidth = this.$refs.cardsContainer.clientWidth
      this.containerHeight = this.$refs.cardsContainer.clientHeight

      var containerBoundingRect = this.$refs.cardsContainer.getBoundingClientRect()
      this.containerTop = containerBoundingRect.top

      this.viewportHeight = window.innerHeight
    },
    init() {
      this.initViewport()

      this.photos = []
      for (let i = 0; i < this.numPhotos; i++) {
        this.photos.push({
          id: i,
          src: '/Logo.png',
          index: i,
          loaded: false
        })
      }
    },
    setCardsVisisble() {
      var startRow = Math.floor(this.scrollwrapper.scrollTop / this.cardSizeHeight)
      // Start 1 row back as a buffer
      startRow = Math.max(0, startRow - 1)
      this.startRow = startRow

      var startIndex = startRow * this.cardsPerRow
      var lastIndex = startIndex + this.cardsPerPage

      if (lastIndex > this.numPhotos) {
        this.bufferRows = 1
        // console.log('Only 1 buffer row', this.cardsViewportHeight)
      } else {
        this.bufferRows = 2
        // console.log('Only 2 buffer row', this.cardsViewportHeight)
      }

      this.startIndex = startRow * this.cardsPerRow
    },
    scroll() {
      var st = this.scrollwrapper.scrollTop
      var ch = this.scrollwrapper.clientHeight

      var viewportTop = st
      var viewportBottom = st + ch

      var diffFromBottom = this.cardsWindowBottom - viewportBottom
      var diffFromTop = viewportTop - this.cardsWindowTop
      if (diffFromBottom < this.cardSizeHeight) {
        this.setCardsVisisble()
        this.cardsWindowTop = Math.min(this.totalHeight - this.cardsViewportHeight, Math.max(0, viewportTop - this.cardSizeHeight))
      } else if (diffFromTop < this.cardSizeHeight) {
        this.setCardsVisisble()
        this.cardsWindowTop = Math.max(0, viewportTop - this.cardSizeHeight)
      }

      var perc = st / this.totalHeight
      var scrollbarContainerHeight = (this.containerHeight / this.totalHeight) * this.containerHeight
      this.scrollbarCursorTop = perc * this.containerHeight
    },
    setScrollTooltip(y) {
      if (!this.$refs.scrollTooltip) {
        console.error('No tooltip')
        return
      }
      this.$refs.scrollTooltip.style.top = y + 'px'
      this.$refs.scrollTooltip.style.display = ''
    },
    hideScrollTooltip() {
      if (!this.$refs.scrollTooltip) {
        console.error('No tooltip')
        return
      }
      this.$refs.scrollTooltip.style.display = 'none'
    },
    mousemoveScrollBar(e) {
      var offsetY = e.offsetY
      var perc = offsetY / this.containerHeight
      var rowNum = Math.max(0, Math.min(Math.round(perc * this.totalRows), this.totalRows))
      var photoNum = rowNum * this.cardsPerRow
      this.tooltipText = photoNum
      this.setScrollTooltip(offsetY - 8)
    },
    mouseleaveScrollBar() {
      this.hideScrollTooltip()
    },
    mousedownScrollBar(e) {
      this.draggingScroll = true
      e.preventDefault()
    },
    mouseup() {
      this.draggingScroll = false
    },
    mousemove(e) {
      if (this.draggingScroll) {
        var posContainer = e.y - this.containerTop
        var perc = posContainer / this.containerHeight
        var scrollbarContainerHeight = (this.containerHeight / this.totalHeight) * this.totalHeight
        this.scrollwrapper.scrollTop = perc * this.totalHeight - scrollbarContainerHeight / 2
        e.preventDefault()
      }
    },
    clickScrollBar(e) {
      var offsetY = e.offsetY
      var perc = offsetY / this.containerHeight
      var top = perc * this.totalHeight
      this.scrollwrapper.scrollTop = top - this.containerHeight / 2
    }
  },
  mounted() {
    this.scrollwrapper = this.$refs.cardsContainer
    if (!this.$refs.cardsContainer) {
      console.error('Invalid refs', this.$refs)
      return
    }
    this.scrollwrapper.addEventListener('scroll', this.scroll)
    window.addEventListener('mouseup', this.mouseup)
    window.addEventListener('mousemove', this.mousemove)

    this.init()
    this.setCardsVisisble()
    this.requestPhotos(0)

    this.$nextTick(() => {
      var scrollHeight = this.scrollwrapper.scrollHeight
      var clientHeight = this.scrollwrapper.clientHeight
      this.hasScroll = scrollHeight > clientHeight
    })
  },
  beforeDestroy() {
    if (this.scrollwrapper) {
      this.scrollwrapper.removeEventListener('scroll', this.scroll)
    }
    window.removeEventListener('mouseup', this.mouseup)
    window.removeEventListener('mousemove', this.mousemove)
  }
}
</script>


<style>
.wrapper {
  height: calc(100vh - 64px - 64px);
  max-height: calc(100vh - 64px - 64px);
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