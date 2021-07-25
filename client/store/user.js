
export const state = () => ({
  user: null
})

export const getters = {}

export const actions = {}

export const mutations = {
  setUser(state, user) {
    state.user = user
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('user', JSON.stringify(user))
    }
  }
}