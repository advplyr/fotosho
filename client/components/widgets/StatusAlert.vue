<template>
  <div v-show="show" class="fixed bottom-0 left-0 right-0 mx-auto z-20 max-w-lg">
    <div class="w-full my-1 rounded-lg drop-shadow-lg px-4 py-2 flex items-center justify-center text-center transition-all border border-white border-opacity-40 shadow-md" :class="`bg-${color}`">
      <p class="text-lg font-sans" v-html="text" />
    </div>
    <div class="absolute top-3 bottom-0 left-4">
      <ui-icon icon="loading" class="animate-spin w-7 h-7 text-white" />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {}
  },
  computed: {
    show() {
      return this.isScanning || this.isGeneratingThumbnails
    },
    color() {
      return this.isScanning ? 'warning' : 'info'
    },
    text() {
      if (this.isScanning) {
        return `Scanning... <span class="font-mono">${this.scanNum}</span> of <span class="font-mono">${this.scanTotal}</span> <strong class='font-mono px-2'>${this.scanPercent}</strong>`
      } else {
        return 'Generating Thumbnails...'
      }
    },
    isScanning() {
      return this.$store.state.isScanning
    },
    scanProgress() {
      return this.$store.state.scanProgress
    },
    scanPercent() {
      return this.scanProgress ? this.scanProgress.percent : '0%'
    },
    scanNum() {
      return this.scanProgress ? this.scanProgress.scanned : 0
    },
    scanTotal() {
      return this.scanProgress ? this.scanProgress.total : 0
    },
    isGeneratingThumbnails() {
      return this.$store.state.isGeneratingThumbnails
    }
  },
  methods: {},
  mounted() {}
}
</script>