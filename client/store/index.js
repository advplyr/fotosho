
export const state = () => ({
  photoPath: null,
  configPath: null,
  thumbnailPath: null,
  settings: {},
  albums: [],
  numPhotos: 0,
  selectedPhotos: [],
  showAlbumModal: false,
  toasts: [],
  isScanning: false,
  isInitialized: false,
  isSocketConnected: false,
  isGeneratingThumbnails: false,
  scanProgress: null
})

export const getters = {
  getAlbum: state => albumId => {
    return state.albums.find(a => String(a.id) === albumId)
  },
  getAlbumsForPhoto: state => photoId => {
    return state.albums.filter(alb => (alb.photos && alb.photos.includes(photoId)))
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
  setInitialData(state, data) {
    state.albums = data.albums
    state.numPhotos = data.num_photos
    state.photoPath = data.photoPath
    state.thumbnailPath = data.thumbnailPath
    state.configPath = data.configPath
    state.isScanning = data.isScanning
    state.isInitialized = data.isInitialized
    state.settings = data.settings || {}
  },
  setAutoSlide(state, val) {
    state.settings.auto_slide = val
  },
  setSlideDuration(state, val) {
    state.settings.slide_duration = val
  },
  setCardSize(state, val) {
    state.settings.card_size = val
  },
  setOrderBy(state, val) {
    state.settings.order_by = val
  },
  setOrderDesc(state, val) {
    state.settings.order_desc = val
  },
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
  setIsInitialized(state, val) {
    state.isInitialized = val
  },
  setSocketConnected(state, val) {
    state.isSocketConnected = val
  },
  setScanProgress(state, val) {
    state.scanProgress = val
  },
  setIsGeneratingThumbnails(state, val) {
    state.isGeneratingThumbnails = val
  }
}