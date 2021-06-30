<template>
  <div class="wrapper mx-auto bg-bg p-6">
    <h1 class="text-2xl text-center mb-4">Fotosho Launch</h1>
    <div class="flex flex-col justify-center w-full max-w-xl mx-auto">
      <table id="info-table" class="mb-4">
        <tr>
          <td>Photo Path</td>
          <td>{{ photoPath }}</td>
        </tr>
        <tr>
          <td>Thumbnail Path</td>
          <td>{{ thumbnailPath }}</td>
        </tr>
        <tr>
          <td>Config Path</td>
          <td>{{ configPath }}</td>
        </tr>
        <tr>
          <td>Photos</td>
          <td v-if="numPhotos">{{ numPhotos }} in database</td>
          <td v-else>None</td>
        </tr>
      </table>

      <btn v-if="!isScanning && !hasRequestedInit" class="bg-success" large @click="startInitialScan">Start Scan</btn>
      <div v-else-if="isScanning" class="flex justify-center items-center">
        <p class="pr-4 text-2xl">Scanning...</p>
        <svg class="w-10 h-10 animate-spin" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
        </svg>
      </div>

      <p class="mb-2 mt-6 text-center">* Initial scan looks for all photos in Photo Path and Thumbnail Path and syncs them with the database stored at Config Path.<br /><br />* After scanning is complete thumbnails are generated for every photo that needs one.<br /><br /><span class="text-error text-lg">First time scan can take several minutes!</span></p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      hasRequestedInit: false
    }
  },
  computed: {
    photoPath() {
      return this.$store.state.photoPath
    },
    configPath() {
      return this.$store.state.configPath
    },
    thumbnailPath() {
      return this.$store.state.thumbnailPath
    },
    numPhotos() {
      return this.$store.state.numPhotos
    },
    isScanning() {
      return this.$store.state.isScanning
    }
  },
  methods: {
    startInitialScan() {
      this.hasRequestedInit = true
      this.$store.dispatch('$nuxtSocket/emit', { label: 'main', evt: 'start_init' })
    }
  },
  mounted() {}
}
</script>

<style>
#info-table {
  border-collapse: collapse;
  width: 100%;
}

#info-table td,
#info-table th {
  border: 1px solid rgb(65, 65, 65);
  padding: 8px;
}

#info-table tr:nth-child(even) {
  background-color: #222222;
}

#info-table tr:hover {
  background-color: rgb(49, 49, 49);
}

#info-table th {
  padding-top: 12px;
  padding-bottom: 12px;
  text-align: left;
  background-color: #04aa6d;
  color: white;
}

.wrapper {
  height: calc(100vh - 64px);
  max-height: calc(100vh - 64px);
  width: 100%;
}
</style>