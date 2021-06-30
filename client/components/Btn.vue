<template>
  <a href="" class="rounded-md text-white text-center transition duration-300 ease-in-out" :class="btnClass" @click.stop.prevent="click">
    <slot />
  </a>
</template>

<script>
export default {
  props: {
    large: Boolean
  },
  data() {
    return {}
  },
  computed: {
    btnClass() {
      if (this.large) return 'py-2 px-4 text-lg'
      return 'px-2 py-1'
    }
  },
  methods: {
    click(e) {
      return this.$emit('click', e)
    }
  },
  mounted() {}
}
</script>