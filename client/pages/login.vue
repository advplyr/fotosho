<template>
  <div class="w-full h-screen bg-bg">
    <div class="w-full flex h-1/2 items-center justify-center">
      <div class="w-full max-w-md border border-opacity-0 rounded-xl px-8 pb-8 pt-4">
        <p class="text-3xl text-white text-center mb-4">Login</p>
        <div class="w-full h-px bg-white bg-opacity-10 my-4" />
        <p v-if="error" class="text-error text-center py-2">{{ error }}</p>
        <form @submit.prevent="submitForm">
          <ui-text-input v-model="username" :readonly="nopass" :disabled="processing" label="Username" class="my-3" />
          <p v-if="nopass" class="py-2 text-center text-error">Note: Root user has no password, press submit if you want to remain passwordless.</p>
          <ui-text-input v-model="password" type="password" :disabled="processing" :label="nopass ? 'Set a root password (optional)' : 'Password'" class="my-3" />
          <div class="w-full flex justify-end">
            <button type="submit" :disabled="processing" class="bg-blue-600 hover:bg-blue-800 px-8 py-1 mt-3 rounded-md text-white text-center transition duration-300 ease-in-out focus:outline-none">{{ processing ? 'Checking...' : 'Submit' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  layout: 'blank',
  data() {
    return {
      error: null,
      processing: false,
      username: 'root',
      password: null,
      ready: false
    }
  },
  watch: {
    user(newVal) {
      if (newVal) {
        if (process.env.NODE_ENV !== 'production') {
          this.$router.replace('/')
        } else {
          window.location.reload()
        }
      }
    }
  },
  computed: {
    user() {
      return this.$store.state.user.user
    },
    nopass() {
      return this.$route.query.nopass === '1'
    }
  },
  methods: {
    async submitForm() {
      this.error = null
      this.processing = true
      var uri = `${process.env.serverUrl}/auth`
      var payload = {
        username: this.username,
        password: this.password || ''
      }
      var authRes = await this.$axios.$post(uri, payload).catch((error) => {
        console.error('Failed', error)
        return false
      })
      console.log('Auth res', authRes)
      if (!authRes) {
        this.error = 'Unknown Failure'
      } else if (authRes.error) {
        this.error = authRes.error
      } else if (authRes.setroot) {
        // Root password was set
        this.$store.commit('user/setUser', authRes.user)
      } else {
        this.$store.commit('user/setUser', authRes.user)
      }
      this.processing = false
    }
  },
  mounted() {
    setTimeout(() => {
      this.ready = true
    }, 2000)
  }
}
</script>