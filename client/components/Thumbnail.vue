<template>
  <div class="rounded-xl overflow-hidden cursor-pointer m-1.5 relative border" :class="selected ? 'border-yellowgreen' : 'border-transparent hover:border-gray-300'" :style="{ height: cardHeight + 'rem', width: cardWidth + 'rem', margin: cardMargin + 'rem' }">
    <img :id="thumbnailId" :src="path" loading="lazy" class="w-full h-full" />

    <div v-if="isSocketConnected" class="w-full h-full bg-black absolute top-0 left-0" :class="bgClassList" @mouseenter="mouseenter" @mouseleave="mouseleave" @click="clickCard">
      <div class="absolute top-1.5 left-1.5 hover:text-yellowgreen cursor-pointer" :class="radioClass" @click.prevent.stop="selectClick">
        <icon :icon="selected ? 'radioFilled' : 'radioEmpty'" />
      </div>
      <div ref="star" class="absolute top-1.5 right-1.5 hover:text-yellowgreen cursor-pointer" :class="starClass" @click.stop.prevent="clickStar">
        <icon icon="star" :fill="isStarred ? 'currentColor' : 'none'" :stroke-width="isStarred ? 1 : 2" />
      </div>
      <div ref="pencil" class="absolute bottom-1.5 right-1.5 z-10 hover:text-yellowgreen cursor-pointer" :class="editClass" @click.stop.prevent="editClicked">
        <icon icon="pencil" />
      </div>
      <!-- <div ref="download" class="w-6 h-6 absolute bottom-1.5 right-1.5 z-10 hover:text-yellowgreen cursor-pointer" :class="downloadClass" @click.stop.prevent="clickDownload">
        <icon icon="download" />
      </div> -->
      <div v-if="numCopies > 1" class="absolute text-xs font-mono bottom-1.5 right-1.5 bg-black bg-opacity-50 rounded-sm leading-4 px-1" :class="copiesClass">
        {{ numCopies }}
      </div>
      <div v-if="showBasename" class="w-5/6 py-1.5 absolute bottom-0 left-0 right-0 px-1.5" :class="nameClass">
        <p class="truncate text-xs">{{ basename }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    photo: {
      type: Object,
      default: () => {}
    },
    size: {
      type: String,
      default: 'sm'
    }
  },
  data() {
    return {
      isMouseOver: false,
      cardSizes: {
        xs: {
          width: 5, // 80px
          height: 5,
          margin: 0.125
        },
        sm: {
          width: 7, // 112px
          height: 7,
          margin: 0.25
        },
        md: {
          width: 11, // 176px
          height: 11,
          margin: 0.3
        },
        lg: {
          width: 15, // 240px
          height: 15,
          margin: 0.375
        },
        xl: {
          width: 20, // 320px
          height: 20,
          margin: 0.5
        }
      }
    }
  },
  computed: {
    isSocketConnected() {
      return this.$store.state.isSocketConnected
    },
    sizeObj() {
      return this.cardSizes[this.size] || this.cardSizes.sm
    },
    cardHeight() {
      return this.sizeObj.height
    },
    cardWidth() {
      return this.sizeObj.width
    },
    cardMargin() {
      return this.sizeObj.margin
    },
    numCopies() {
      return this.photo.numCopies || 1
      // return this.photo.duplicates.length + 1
      // return 1
    },
    basename() {
      return this.photo.basename
    },
    thumbnailId() {
      return `thumb-${this.photo.id}`
    },
    path() {
      if (!this.photo.thumbPath) {
        return 'Logo.png'
      }
      return `${process.env.serverUrl}${this.photo.thumbPath}`
    },
    isStarred() {
      return !!this.albums.find((alb) => alb.id === 'starred')
    },
    albums() {
      return this.$store.getters.getAlbumsForPhoto(this.photo.id) || []
    },
    copiesClass() {
      return this.isMouseOver || this.selectionMode ? 'opacity-0' : 'opacity-100'
    },
    bgClassList() {
      var classList = []
      if (this.selectionMode || this.isMouseOver) classList.push('bg-opacity-40')
      else classList.push('bg-opacity-0')
      return classList.join(' ')
    },
    radioClass() {
      var classList = []
      if (this.size === 'xs') classList.push('w-5 h-5')
      else classList.push('w-6 h-6')

      if (this.selectionMode || this.isMouseOver) classList.push('opacity-100')
      else classList.push('opacity-0 pointer-events-none')
      return classList.join(' ')
    },
    editClass() {
      var classList = []
      if (this.size === 'xs') classList.push('w-4 h-4')
      else classList.push('w-5 h-5')

      if (this.isMouseOver && !this.selectionMode) classList.push('opacity-100')
      else classList.push('opacity-0 pointer-events-none')
      return classList.join(' ')
    },
    starClass() {
      var classList = []
      if (this.size === 'xs') classList.push('w-5 h-5')
      else classList.push('w-6 h-6')

      if (this.selectionMode) classList.push('pointer-events-none')
      if (this.isStarred || (this.isMouseOver && !this.selectionMode)) classList.push('opacity-100')
      else classList.push('opacity-0 pointer-events-none')
      if (this.isStarred) classList.push('text-yellow-200')
      return classList.join(' ')
    },
    nameClass() {
      return this.selectionMode || this.isMouseOver ? 'opacity-100' : 'opacity-0 pointer-events-none'
    },
    selected() {
      return this.$store.getters.getIsSelected(this.photo.id)
    },
    selectionMode() {
      return this.$store.getters.getIsSelectionMode
    },
    showBasename() {
      return this.size !== 'sm' && this.size !== 'xs'
    }
  },
  methods: {
    mouseenter() {
      this.isMouseOver = true
    },
    mouseleave() {
      this.isMouseOver = false
    },
    editClicked() {
      this.$emit('edit')
    },
    clickDownload() {
      var uri = `${process.env.serverUrl}/photo/${this.photo.id}`
      this.$downloadImage(uri, this.basename)
    },
    clickCard() {
      if (this.selectionMode) {
        return this.selectClick()
      }
      this.$emit('click', this.photo)
    },
    selectClick() {
      this.$store.commit('selectPhoto', this.photo)
    },
    clickStar() {
      console.log('Clicked star', this.isStarred)
      var data = {
        isStarred: !this.isStarred,
        photoId: this.photo.id
      }
      this.$emit('starred', data)
    }
  }
}
</script>