
export const state = () => ({
  albums: [],
  numPhotos: 0,
  selectedPhotos: [],
  showAlbumModal: false,
  toasts: [],
  isScanning: false,
  isSocketConnected: false
})

export const getters = {
  getAlbum: state => albumId => {
    return state.albums.find(a => String(a.id) === albumId)
  },
  getAlbumsForPhoto: state => photoId => {
    return state.albums.filter(alb => alb.photos.includes(photoId))
  },
  getIsSelectionMode: state => {
    return state.selectedPhotos.length > 0
  },
  getIsSelected: state => photoId => {
    return !!state.selectedPhotos.find(p => p.id === photoId)
  }
}

export const actions = {

}

export const mutations = {
  setAlbums(state, albums) {
    state.albums = albums
  },
  setNumPhotos(state, num_photos) {
    state.numPhotos = num_photos
  },
  updateAlbum(state, album) {
    var albumIndex = state.albums.findIndex(a => a.id === album.id)
    if (albumIndex >= 0) {
      state.albums.splice(albumIndex, 1, album)
    } else {
      state.albums.push(album)
    }
  },
  deleteAlbum(state, album) {
    state.albums = state.albums.filter(a => a.id !== album.id)
  },
  selectPhoto(state, photo) {
    if (state.selectedPhotos.find(p => p.id === photo.id)) {
      state.selectedPhotos = state.selectedPhotos.filter(p => p.id !== photo.id)
    } else {
      state.selectedPhotos.push(photo)
    }
  },
  cancelSelection(state) {
    state.selectedPhotos = []
  },
  setShowAlbumModal(state, val) {
    state.showAlbumModal = val
  },
  addToast(state, toastData) {
    toastData.id = Date.now() + '-' + Math.floor(Math.random() * 90 + 10)
    state.toasts.push(toastData)
  },
  removeToast(state, toastId) {
    state.toasts = state.toasts.filter(t => t.id !== toastId)
  },
  clearToasts(state) {
    state.toasts = []
  },
  setIsScanning(state, val) {
    state.isScanning = val
  },
  setSocketConnected(state, val) {
    console.log('SET SOCKET CONNECTED', val)
    state.isSocketConnected = val
  }
}