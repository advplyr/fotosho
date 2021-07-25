<template>
  <div v-if="show" class="fixed w-screen h-screen top-0 left-0 right-0 botttom-0 bg-black z-20" :class="hideOverlay ? 'cursor-none' : ''" @click.prevent>
    <div class="w-full h-full">
      <div @click.stop.prevent class="h-full w-full relative flex items-center justify-center">
        <img id="slideshowImg" ref="img" :class="photoClass" />
        <transition name="fade">
          <loading-indicator v-show="loading" />
        </transition>
      </div>
    </div>

    <div v-show="!hideOverlay" class="transition-opacity">
      <icon-btn icon="arrowLeft" class="absolute top-4 left-4 z-20" @click.stop.prevent="show = false" />

      <div class="absolute left-20 top-6 flex items-center justify-center flex-col">
        <p class="text-2xl font-mono font-medium">{{ selectedPhotoIndex + 1 }} of {{ numPhotos }}</p>
      </div>

      <!-- <div class="absolute top-4 right-4 flex items-center justify-center pointer-events-none z-20">
        <div class="h-14 w-14 p-2 text-white hover:text-gray-200 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full pointer-events-auto cursor-pointer shadow-xl" @click.stop.prevent="show = false">
          <icon icon="close" />
        </div>
      </div> -->

      <div v-show="!loading" class="absolute left-0 bottom-0 py-4 px-6 z-20">
        <div class="flex mb-2">
          <p class="font-mono text-sm mr-4">{{ photoPath }}</p>
          <div class="rounded-full px-2 py-1 font-mono bg-black bg-opacity-25">
            <p class="text-xs">{{ photoSizePretty }}</p>
          </div>
        </div>
      </div>

      <div v-show="!loading" class="absolute right-0 bottom-0 py-4 px-6 z-20">
        <div v-if="photo" class="flex items-center">
          <label class="flex justify-start items-start mr-4" @click.stop>
            <div class="bg-white border-2 rounded border-gray-400 w-6 h-6 flex flex-shrink-0 justify-center items-center mr-2 focus-within:border-blue-500">
              <input v-model="auto" type="checkbox" class="opacity-0 absolute" @change="autoCheckboxChanged" />
              <svg class="fill-current hidden w-4 h-4 text-green-500 pointer-events-none" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z" /></svg>
            </div>
            <div class="select-none">Auto Slide</div>
          </label>

          <icon-btn icon="image" :class="showOriginal ? 'text-warning' : 'text-success'" @click="toggleIsOriginal" />
          <icon-btn icon="pencil" :size="10" :padding="1.5" @click="editClick" />
          <icon-btn icon="download" @click="downloadClick" />
          <!-- <icon-btn icon="trash" @click="deleteClick" /> -->
        </div>
      </div>

      <div class="absolute top-0 left-0 bottom-0 h-full w-1/3 bg-transparent opacity-0 hover:opacity-100 transition-opacity z-10 cursor-pointer" @click.stop.prevent="goPrevImage">
        <div class="absolute top-0 bottom-0 left-8 flex items-center justify-center pointer-events-none">
          <div class="h-20 w-20 p-2 text-white hover:text-gray-400 rounded-full pointer-events-auto cursor-pointer shadow-xl">
            <icon icon="chevronLeft" />
          </div>
        </div>
      </div>

      <div class="absolute top-0 right-0 bottom-0 h-full w-1/3 bg-transparent opacity-0 hover:opacity-100 transition-opacity z-10 cursor-pointer" @click.stop.prevent="goNextImage">
        <div class="absolute top-0 bottom-0 right-8 flex items-center justify-center pointer-events-none">
          <div class="h-20 w-20 p-2 text-white hover:text-gray-400 rounded-full pointer-events-auto cursor-pointer shadow-xl">
            <icon icon="chevronRight" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import LoadingIndicator from './LoadingIndicator.vue'
export default {
  components: { LoadingIndicator },
  props: {
    value: Boolean,
    numPhotos: Number,
    photoIndex: Number,
    requestQuery: String
  },
  data() {
    return {
      photo: null,
      showOriginal: false,
      loading: false,
      loadedPhotos: [],
      mousemoveTimeout: null,
      hideOverlay: false,
      auto: false,
      slideTimeout: null
    }
  },
  watch: {
    selectedPhotoIndex: {
      handler(newVal, oldVal) {
        if (newVal !== null && newVal !== undefined) {
          this.loadPhoto()
        }
      }
    },
    show: {
      handler(newVal) {
        if (!newVal) {
          this.stopAutoSlider()
          this.selectedPhotoIndex = null
        } else if (this.auto) {
          this.startAutoSlider()
        }
      }
    }
  },
  computed: {
    selectedPhotoIndex: {
      get() {
        return this.photoIndex
      },
      set(val) {
        this.$emit('update:photoIndex', val)
      }
    },
    show: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit('input', val)
      }
    },
    slideDuration: {
      get() {
        return this.$store.state.settings.slide_duration
      },
      set(val) {
        if (!val || isNaN(val) || Number(val) < 1000) {
          console.error('Invalid slide duration', val)
          return
        }
        this.$store.commit('setSlideDuration', Number(val))
        this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'update_settings', msg: { slide_duration: Number(val) } })
      }
    },
    autoSlide: {
      get() {
        return this.$store.state.settings.auto_slide
      },
      set(val) {
        this.$store.commit('setAutoSlide', !!val)
        this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'update_settings', msg: { auto_slide: !!val } })
      }
    },
    photoId() {
      return this.photo ? this.photo.id : null
    },
    photoPath() {
      if (!this.photo || !this.photo.path) return null
      return this.photo.path
    },
    photoBasename() {
      return this.photo ? this.photo.basename : null
    },
    photoSrc() {
      if (!this.photoPath) {
        return 'Logo.png'
      }
      return `${process.env.serverUrl}${this.photoPath}`
    },
    photoSize() {
      return this.photo ? this.photo.size : 0
    },
    photoSizePretty() {
      return this.$bytesPretty(this.photoSize)
    },
    photoBirthtime() {
      return this.photo ? this.photo.birthtime : null
    },
    photoDownloadSrc() {
      if (!this.photo) return ''
      return `${process.env.serverUrl}/photo/${this.photo.id}`
    },
    photoThumb() {
      return this.photo ? this.photo.thumb || {} : {}
    },
    photoWidth() {
      return this.photo ? this.photo.width : 0
    },
    photoHeight() {
      return this.photo ? this.photo.height : 0
    },
    photoClass() {
      var newHeight = screen.height
      var newWidth = newHeight * (this.photoWidth / this.photoHeight)
      if (newWidth > screen.width) {
        return 'w-full'
      }
      return 'h-full'
    }
  },
  methods: {
    toggleIsOriginal() {
      if (!this.photo) {
        return null
      }
      this.showOriginal = !this.showOriginal
      if (!this.showOriginal && !this.photo.previewPath) {
        this.$store.commit('addToast', { text: `Preview Image not available for photo ${this.photo.id}`, type: 'error' })
        this.showOriginal = true
        return
      }

      if (this.$refs.img) {
        this.$refs.img.src = this.showOriginal ? this.photo.originalSrc : this.photo.previewSrc
      }
    },
    resetLoaded() {
      this.loadedPhotos = []
    },
    loadImg(src) {
      return new Promise((resolve) => {
        var img = new Image()
        img.onload = () => {
          resolve(img)
        }
        img.src = src
      })
    },
    async loadPhoto(ticks = 0) {
      // Wait for DOM element to be there
      if (!this.$refs.img) {
        if (ticks > 100) {
          console.error('Too many ticks')
          return
        }
        // console.error('Img Ref is not here', ticks)
        this.$nextTick(() => {
          this.loadPhoto(++ticks)
        })
        return
      }

      var loadingIndex = this.selectedPhotoIndex
      this.loading = true
      var photo = this.loadedPhotos.find((lp) => lp.index === this.selectedPhotoIndex)
      var src = null
      if (!photo) {
        var uri = `${process.env.serverUrl}/slideshow/photo/${this.selectedPhotoIndex}?${this.requestQuery}`
        photo = await this.$axios.$get(uri)
        if (loadingIndex !== this.selectedPhotoIndex) {
          console.warn('LoadingIndex != SelectedPhotoIndex', loadingIndex, this.selectedPhotoIndex)
          return
        }
        // console.log('Recieved photo by index', this.selectedPhotoIndex, photo)

        photo.index = this.selectedPhotoIndex
        photo.previewSrc = photo.previewPath ? `${process.env.serverUrl}${photo.previewPath}` : null
        photo.originalSrc = photo.path ? `${process.env.serverUrl}${photo.path}` : 'Logo.png'

        if (!this.showOriginal && !photo.previewSrc) {
          this.$store.commit('addToast', { text: `Preview Image not available for photo ${photo.id}`, type: 'error' })
          this.showOriginal = true
        }

        src = this.showOriginal ? photo.originalSrc : photo.previewSrc
        var img = await this.loadImg(src)
        if (loadingIndex !== this.selectedPhotoIndex) {
          console.warn('LoadingIndex != SelectedPhotoIndex', loadingIndex, this.selectedPhotoIndex)
          return
        }
        photo.width = img.naturalWidth
        photo.height = img.naturalHeight

        this.loadedPhotos.push(photo)
      } else {
        if (!this.showOriginal && !photo.previewSrc) {
          this.showOriginal = true
        }
        src = this.showOriginal ? photo.originalSrc : photo.previewSrc
      }

      if (this.$refs.img) {
        this.$refs.img.src = src
      } else {
        console.error('No Img Ref', ticks)
      }
      this.photo = photo
      this.loading = false
    },
    goPrevImage() {
      if (this.selectedPhotoIndex === 0) {
        this.selectedPhotoIndex = this.numPhotos - 1
      } else {
        this.selectedPhotoIndex--
      }
    },
    goNextImage() {
      if (this.selectedPhotoIndex === this.numPhotos - 1) {
        this.selectedPhotoIndex = 0
      } else {
        this.selectedPhotoIndex++
      }
    },
    editClick() {
      this.$emit('edit', this.photo)
    },
    downloadClick() {
      var uri = `${process.env.serverUrl}/photo/${this.photo.id}`
      this.$downloadImage(uri, this.photoBasename)
    },
    deleteClick() {},
    autoCheckboxChanged() {
      if (this.auto) {
        this.startAutoSlider()
      } else {
        this.stopAutoSlider()
      }
    },
    stopAutoSlider() {
      clearInterval(this.slideTimeout)
    },
    startAutoSlider() {
      clearInterval(this.slideTimeout)
      this.slideTimeout = setInterval(() => {
        this.goNextImage()
      }, this.slideDuration)
    },
    keydown(ev) {
      var keycodes = [37, 39, 32, 27]
      if (this.show && keycodes.includes(ev.keyCode)) {
        ev.preventDefault()
      }
    },
    keyup(ev) {
      if (!this.show) return

      if (ev.keyCode === 37) {
        this.goPrevImage()
        ev.preventDefault()
      } else if (ev.keyCode === 39 || ev.keyCode === 32) {
        this.goNextImage()
        ev.preventDefault()
      } else if (ev.keyCode === 27) {
        this.show = false
        ev.preventDefault()
      }
    },
    mousemove(e) {
      this.hideOverlay = false
      clearTimeout(this.mousemoveTimeout)
      this.mousemoveTimeout = setTimeout(() => {
        this.hideOverlay = true
      }, 3000)
    }
  },
  mounted() {
    document.addEventListener('keydown', this.keydown)
    document.addEventListener('keyup', this.keyup)
    document.addEventListener('mousemove', this.mousemove)
  }
}
</script>

<style>
input:checked + svg {
  display: block;
}
.fade-enter-active {
  transition: opacity 1s;
}
.fade-leave-active {
  transition: opacity 0s;
}
.fade-enter {
  opacity: 0;
}
.fade-leave-to {
  opacity: 1;
}
</style>