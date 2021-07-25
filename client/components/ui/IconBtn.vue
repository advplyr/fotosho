<template>
  <div class="rounded-full bg-white bg-opacity-0 hover:bg-opacity-10 flex items-center justify-center cursor-pointer" :class="`w-${size} h-${size} p-${padding}`" @click.stop.prevent="click">
    <ui-icon :icon="icon" />
  </div>
</template>

<script>
export default {
  props: {
    icon: String,
    size: {
      type: Number,
      default: 12
    },
    padding: {
      type: [Number, String],
      default: 2
    }
  },
  data() {
    return {}
  },
  computed: {},
  methods: {
    click(e) {
      this.$emit('click', e)
    }
  },
  mounted() {}
}
</script>