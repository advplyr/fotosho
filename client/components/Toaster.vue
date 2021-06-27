<template>
  <div ref="toaster" class="w-72 fixed bottom-1 right-1">
    <transition-group tag="div" class="img-slider" name="slide">
      <template v-for="toast in toasts">
        <div :key="toast.id" :id="`toast-${toast.id}`" class="w-full my-1 rounded-lg drop-shadow-lg p-4 flex items-center justify-center text-center transition-all" :class="`bg-${toast.type}`">
          <p class="text-sm">{{ toast.text }}</p>
        </div>
      </template>
    </transition-group>
  </div>
</template>

<script>
export default {
  data() {
    return {
      activeToasts: {}
    }
  },
  watch: {
    pendingToasts(newVal, oldVal) {
      if (newVal && newVal.length) {
        this.$nextTick(this.pushToasts)
      }
    }
  },
  computed: {
    pendingToasts() {
      return this.$store.state.toasts
    },
    toasts() {
      return Object.values(this.activeToasts).sort((a, b) => {
        return b.timestamp - a.timestamp
      })
    }
  },
  methods: {
    clearToast(toastId) {
      this.$delete(this.activeToasts, toastId)
    },
    pushToast(toast) {
      var toastDurationMs = 5000
      if (!toast.type) toast.type = 'info'
      var newToast = {
        ...toast,
        timestamp: Date.now(),
        timer: setTimeout(() => {
          this.clearToast(toast.id)
        }, toastDurationMs)
      }
      this.$set(this.activeToasts, toast.id, newToast)
    },
    pushToasts() {
      this.pendingToasts.forEach((toast) => {
        if (this.activeToasts[toast.id]) {
          return
        }
        this.pushToast(toast)
      })
      this.$store.commit('clearToasts')
    }
  },
  mounted() {}
}
</script>

<style>
.slide-leave-active,
.slide-enter-active {
  transition: 0.5s;
  opacity: 1;
}
.slide-enter {
  transform: translate(-20%, 0);
  opacity: 0;
}
.slide-leave-to {
  transform: translate(50%, 0);
  opacity: 0;
}
</style>