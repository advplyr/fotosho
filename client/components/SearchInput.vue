<template>
  <div>
    <label class="block text-sm font-medium text-gray-300">Search</label>
    <div class="relative">
      <input v-model="inputValue" type="text" :disabled="processing" class="bg-fg border border-gray-500 shadow rounded px-3 py-2 focus:outline-none text-sm" placeholder="Search.." @keyup="keyup" />
      <div class="absolute right-0 top-0 bottom-0 h-full flex items-center mr-4 text-purple-lighter">
        <!-- <svg v-if="!processing" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg> -->
        <icon v-if="!processing" :icon="inputValue ? 'close' : 'search'" class="w-5 h-5 cursor-pointer" @click="clickIcon" />
        <svg v-else class="w-5 h-5 animate-spin" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    value: String,
    processing: Boolean
  },
  data() {
    return {
      typingTimeout: null,
      lazyValue: String
    }
  },
  computed: {
    inputValue: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit('input', val)
      }
    }
  },
  methods: {
    keyup() {
      clearTimeout(this.typingTimeout)
      this.isTyping = true
      this.typingTimeout = setTimeout(() => {
        this.isTyping = false
        console.log('CHANGE', this.inputValue)
        this.$emit('change', this.inputValue)
      }, 750)
    },
    clickIcon() {
      if (this.inputValue) {
        this.inputValue = null
        this.$emit('change', this.inputValue)
      }
    }
  },
  mounted() {}
}
</script>