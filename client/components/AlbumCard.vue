<template>
  <nuxt-link :to="`/album/${id}`">
    <div class="w-36 h-36 rounded-xl overflow-hidden m-2 relative cursor-pointer border border-transparent hover:border-gray-300">
      <img :src="imgPath" class="w-full h-full" />
      <div class="w-full h-full absolute top-0 left-0 flex flex-col items-center justify-center z-10 bg-black bg-opacity-50 text-center">
        <h1 :class="nameClass">{{ name }}</h1>
        <p>{{ photos.length }} Photos</p>
      </div>
    </div>
  </nuxt-link>
</template>

<script>
export default {
  props: {
    album: {
      type: Object,
      default: () => {}
    }
  },
  computed: {
    id() {
      return this.album.id
    },
    name() {
      return this.album.name
    },
    nameClass() {
      if (this.name.length > 20) return 'text-lg'
      if (this.name.length > 10) return 'text-xl'
      return 'text-2xl'
    },
    imgPath() {
      return `${process.env.serverUrl}/album/photo/${this.id}`
      // return this.album.thumbPath || 'Logo.png'
    },
    photos() {
      return this.album.photos || []
    }
  }
}
</script>