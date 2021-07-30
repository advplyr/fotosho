<template>
  <div v-if="show" class="fixed w-screen h-screen top-0 left-0 right-0 botttom-0 bg-black z-20" :class="hideOverlay ? 'cursor-none' : ''" @click.prevent>
    <div class="w-full h-full">
      <div @click.stop.prevent class="h-full w-full relative flex items-center justify-center">
        <img id="slideshowImg" ref="img" :class="photoClass" />

        <transition name="fadebg">
          <div v-show="loading" class="bg-black opacity-0 w-full h-full absolute top-0 left-0 z-10" />
        </transition>
        <transition name="fade">
          <loading-indicator v-show="loading" class="opacity-0" />
        </transition>
      </div>
    </div>

    <div v-show="!hideOverlay" class="transition-opacity">
      <ui-icon-btn icon="arrowLeft" class="absolute top-4 left-4 z-20" @click.stop.prevent="show = false" />

      <!-- Gradient Top -->
      <div class="w-full absolute top-0 left-0 right-0 h-20 bg-gradient-to-t from-transparent to-black" />

      <!-- Photo Number -->
      <div class="absolute left-20 top-6 flex items-center justify-center flex-col">
        <p class="text-xl font-mono font-medium">
          {{ photoShowingIndex + 1 }} <span class="text-xs">of {{ numPhotos }}</span>
        </p>
      </div>

      <!-- Photo Path & Size -->
      <div v-show="!loading" class="absolute left-0 bottom-0 py-4 px-6 z-20">
        <div class="flex mb-2">
          <p class="font-mono text-sm mr-4">{{ photoPath }}</p>
          <div class="rounded-full px-2 py-1 font-mono bg-black bg-opacity-25">
            <p class="text-xs">{{ photoSizePretty }}</p>
          </div>
        </div>
      </div>

      <!-- Top Right Options -->
      <div v-show="!loading" class="absolute right-0 top-0 py-4 px-6 z-20">
        <div v-if="photo" class="flex items-center">
          <ui-checkbox v-model="auto" class="mx-2" @input="autoCheckboxChanged">Auto Slide</ui-checkbox>

          <ui-select-dropdown v-show="auto" v-model="slideDuration" :items="slideDurationItems" icon="clock" transparent class="w-20" />

          <ui-checkbox v-model="shuffleSlide" class="mx-2" @input="shuffleCheckboxChanged">Shuffle</ui-checkbox>

          <ui-icon-btn icon="pencil" :size="8" :padding="1.5" @click="editClick" />
          <ui-icon-btn icon="download" @click="downloadClick" :size="9" :padding="1.5" />
          <!-- <<ui-icon-btn icon="trash" @click="deleteClick" /> -->
        </div>
      </div>

      <!-- Toggle Original Image Icon -->
      <div v-show="!loading" class="absolute right-0 bottom-0 py-4 px-6 z-20">
        <ui-icon-btn icon="image" :class="showOriginal ? 'text-warning' : 'text-success'" :size="9" :padding="1.5" @click="toggleIsOriginal" />
      </div>

      <!-- Prev Arrow -->
      <div class="absolute top-0 left-0 bottom-0 h-full w-1/3 bg-transparent opacity-0 hover:opacity-100 transition-opacity z-10 cursor-pointer" @click.stop.prevent="goPrevImage">
        <div class="absolute top-0 bottom-0 left-8 flex items-center justify-center pointer-events-none">
          <div class="h-20 w-20 p-2 text-white hover:text-gray-400 rounded-full pointer-events-auto cursor-pointer shadow-xl">
            <ui-icon icon="chevronLeft" />
          </div>
        </div>
      </div>

      <!-- Next Arrow -->
      <div class="absolute top-0 right-0 bottom-0 h-full w-1/3 bg-transparent opacity-0 hover:opacity-100 transition-opacity z-10 cursor-pointer" @click.stop.prevent="goNextImage">
        <div class="absolute top-0 bottom-0 right-8 flex items-center justify-center pointer-events-none">
          <div class="h-20 w-20 p-2 text-white hover:text-gray-400 rounded-full pointer-events-auto cursor-pointer shadow-xl">
            <ui-icon icon="chevronRight" />
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
      slideTimeout: null,
      shuffleSlide: false,
      shuffledPhotoIndexes: []
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
    },
    slideDuration: {
      handler(newVal) {
        if (newVal && this.auto) {
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
    slideDurationInSeconds() {
      return Math.floor(this.slideDuration / 1000)
    },
    slideDurationItems() {
      var items = []
      for (let i = 2; i < 31; i++) {
        items.push({
          text: `${i}s`,
          value: i * 1000
        })
      }
      return items
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
    },
    photoShowingIndex() {
      return this.shuffleSlide ? this.shuffledPhotoIndexes[this.selectedPhotoIndex] : this.selectedPhotoIndex
    }
  },
  methods: {
    setRemainingPhotosShuffled() {
      var shuffledPhotoIndexes = new Array(this.numPhotos)
      for (let i = 0; i < this.numPhotos; i++) {
        var ranIndex = Math.floor(Math.random() * i)
        shuffledPhotoIndexes[ranIndex] = i
        shuffledPhotoIndexes[i] = ranIndex
      }
      var indexOfSelected = shuffledPhotoIndexes.findIndex((p) => p === this.selectedPhotoIndex)
      var indexAtSelected = shuffledPhotoIndexes[this.selectedPhotoIndex]

      shuffledPhotoIndexes[indexOfSelected] = indexAtSelected
      shuffledPhotoIndexes[this.selectedPhotoIndex] = this.selectedPhotoIndex
      this.shuffledPhotoIndexes = shuffledPhotoIndexes
    },
    shuffleCheckboxChanged(val) {
      if (val) {
        this.setRemainingPhotosShuffled()
      }
    },
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

      var photoIndexToShow = this.shuffleSlide ? this.shuffledPhotoIndexes[this.selectedPhotoIndex] : this.selectedPhotoIndex
      var loadingIndex = photoIndexToShow
      this.loading = true
      var photo = this.loadedPhotos.find((lp) => lp.index === photoIndexToShow)

      // await new Promise((resolve) => setTimeout(resolve, 1000))

      var src = null
      if (!photo) {
        var uri = `${process.env.serverUrl}/slideshow/photo/${photoIndexToShow}?${this.requestQuery}`
        photo = await this.$axios.$get(uri)
        if (loadingIndex !== photoIndexToShow) {
          console.warn('LoadingIndex != photoIndexToShow', loadingIndex, photoIndexToShow)
          return
        }

        photo.index = photoIndexToShow
        photo.previewSrc = photo.previewPath ? `${process.env.serverUrl}${photo.previewPath}` : null
        photo.originalSrc = photo.path ? `${process.env.serverUrl}${photo.path}` : 'Logo.png'

        if (!this.showOriginal && !photo.previewSrc) {
          this.$store.commit('addToast', { text: `Preview Image not available for photo ${photo.id}`, type: 'error' })
          this.showOriginal = true
        }

        src = this.showOriginal ? photo.originalSrc : photo.previewSrc
        var img = await this.loadImg(src)
        if (loadingIndex !== photoIndexToShow) {
          console.warn('LoadingIndex != photoIndexToShow', loadingIndex, photoIndexToShow)
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
      this.loading = false
      this.$nextTick(() => {
        if (this.$refs.img) {
          this.$refs.img.src = src
        } else {
          console.error('No Img Ref', ticks)
        }
      })
      this.photo = photo
    },
    getRandomPhotoIndex() {},
    goPrevImage() {
      if (this.selectedPhotoIndex === 0) {
        this.selectedPhotoIndex = this.numPhotos - 1
      } else {
        this.selectedPhotoIndex--
      }
    },
    goNextImage() {
      if (this.selectedPhotoIndex === this.numPhotos - 1) {
        if (this.shuffleSlide) this.setRemainingPhotosShuffled()
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
.fade-enter-active {
  /* transition: opacity 1s; */
  animation: fadein 2s;
}
.fade-leave-active {
  transition: opacity 0s;
}
@keyframes fadein {
  0% {
    opacity: 0;
  }
  33% {
    opacity: 0;
  }
  34% {
    opacity: 1;
  }
  100% {
    opacity: 1;
  }
}
.fade-enter {
  opacity: 0;
}
.fade-leave-to {
  opacity: 1;
}

.fadebg-enter-active {
  transition: opacity 0s;
}
.fadebg-leave-active {
  animation: fadebgout 0.5s;
}
@keyframes fadebgout {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

.fadebg-enter {
  opacity: 0;
}
.fadebg-leave-to {
  opacity: 0.5;
}
</style>