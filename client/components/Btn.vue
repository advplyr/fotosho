<template>
  <a href="" class="rounded-md text-white text-center px-2 py-1 transition duration-300 ease-in-out" @click.stop.prevent="click">
    <slot />
  </a>
</template>

<script>
export default {
  data() {
    return {}
  },
  computed: {},
  methods: {
    click(e) {
      return this.$emit('click', e)
    }
  },
  mounted() {}
}
</script>