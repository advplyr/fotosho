<template>
  <div class="absolute top-0 left-0 w-full h-full flex items-start justify-center z-20">
    <div class="py-6 px-5 rounded-lg flex items-center flex-col">
      <div class="loader-dots block relative w-20 h-5 mt-2">
        <div class="absolute top-0 mt-1 w-3 h-3 rounded-full" :class="`bg-${dotColor}`"></div>
        <div class="absolute top-0 mt-1 w-3 h-3 rounded-full" :class="`bg-${dotColor}`"></div>
        <div class="absolute top-0 mt-1 w-3 h-3 rounded-full" :class="`bg-${dotColor}`"></div>
        <div class="absolute top-0 mt-1 w-3 h-3 rounded-full" :class="`bg-${dotColor}`"></div>
      </div>
      <div class="text-white text-xs font-light mt-1 text-center whitespace-nowrap">Loading...</div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {}
  },
  computed: {
    dotColor() {
      return 'white'
    }
  },
  methods: {},
  mounted() {}
}
</script>

<style>
.loader-dots div {
  animation-timing-function: cubic-bezier(0, 1, 1, 0);
}
.loader-dots div:nth-child(1) {
  left: 8px;
  animation: loader-dots1 0.6s infinite;
}
.loader-dots div:nth-child(2) {
  left: 8px;
  animation: loader-dots2 0.6s infinite;
}
.loader-dots div:nth-child(3) {
  left: 32px;
  animation: loader-dots2 0.6s infinite;
}
.loader-dots div:nth-child(4) {
  left: 56px;
  animation: loader-dots3 0.6s infinite;
}
@keyframes loader-dots1 {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes loader-dots3 {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(0);
  }
}
@keyframes loader-dots2 {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(24px, 0);
  }
}
</style>