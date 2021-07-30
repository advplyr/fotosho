<template>
  <div>
    <label class="flex justify-start items-start cursor-pointer" @click.stop>
      <div style="width: 18px; height: 18px" class="bg-white border-2 rounded border-gray-400 flex flex-shrink-0 justify-center items-center mr-1.5">
        <input v-model="input" type="checkbox" class="opacity-0 absolute cursor-pointer" />
        <svg :class="input ? '' : 'hidden'" class="fill-current w-3 h-3 text-green-500 pointer-events-none" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z" /></svg>
      </div>
      <div class="select-none text-sm -mt-0.5"><slot /></div>
    </label>
  </div>
</template>

<script>
export default {
  props: {
    value: Boolean
  },
  data() {
    return {}
  },
  computed: {
    input: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit('input', val)
      }
    }
  },
  methods: {},
  mounted() {}
}
</script>