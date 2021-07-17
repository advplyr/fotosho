<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-gray-300">{{ label }}</label>
    <input v-model="inputValue" :type="type" :disabled="disabled" :readonly="readonly" :inputmode="inputmode" class="bg-fg border border-gray-500 shadow rounded px-3 py-2 focus:outline-none text-sm w-full" :placeholder="placeholder" />
  </div>
</template>

<script>
export default {
  props: {
    value: [String, Number],
    type: {
      type: String,
      default: 'text'
    },
    inputmode: String,
    placeholder: String,
    label: String,
    disabled: Boolean,
    readonly: Boolean
  },
  data() {
    return {}
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
  methods: {},
  mounted() {}
}
</script>

<style>
input {
  color: white;
}
input:read-only {
  color: #888;
  background-color: #444;
  border-color: #444;
}
</style>