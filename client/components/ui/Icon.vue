<template>
  <svg xmlns="http://www.w3.org/2000/svg" :fill="svgFillFinal" viewBox="0 0 24 24" :stroke="svgStrokeFinal" @click="$emit('click')">
    <template v-for="(path, index) in paths">
      <path :key="index" :stroke-linecap="path.strokeLinecap" :stroke-linejoin="path.strokeLinejoin" :stroke-width="path.strokeWidth" :d="path.d" />
    </template>
  </svg>
</template>

<script>
export default {
  props: {
    icon: String,
    svgFill: {
      type: String,
      default: null
    },
    strokeWidth: {
      type: Number,
      default: null
    }
  },
  computed: {
    svgFillFinal() {
      if (this.svgFill) {
        return this.svgFill
      }
      return this.iconObj.fill || 'none'
    },
    svgStrokeFinal() {
      return this.iconObj.stroke || 'currentColor'
    },
    icons() {
      return {
        clock: {
          paths: [
            {
              d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            }
          ]
        },
        trash: {
          paths: [
            {
              d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
            }
          ]
        },
        chevronRight: {
          paths: [
            {
              d: 'M9 5l7 7-7 7'
            }
          ]
        },
        chevronLeft: {
          paths: [
            {
              d: 'M15 19l-7-7 7-7'
            }
          ]
        },
        arrowLeft: {
          paths: [
            {
              d: 'M10 19l-7-7m0 0l7-7m-7 7h18'
            }
          ]
        },
        star: {
          paths: [
            {
              d: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
            }
          ]
        },
        download: {
          paths: [
            {
              d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
            }
          ]
        },
        radioEmpty: {
          fill: 'currentColor',
          stroke: 'none',
          paths: [
            {
              strokeWidth: 0,
              strokeLinejoin: 'miter',
              strokeLinecap: 'butt',
              d: 'M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z'
            }
          ]
        },
        radioFilled: {
          fill: 'currentColor',
          stroke: 'none',
          paths: [
            {
              strokeWidth: 0,
              strokeLinejoin: 'miter',
              strokeLinecap: 'butt',
              d: 'M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z'
            }
          ]
        },
        loading: {
          fill: 'currentColor',
          stroke: 'none',
          paths: [
            {
              strokeWidth: 0,
              strokeLinejoin: 'miter',
              strokeLinecap: 'butt',
              d: 'M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z'
            }
          ]
        },
        folderMove: {
          fill: 'currentColor',
          stroke: 'none',
          paths: [
            {
              strokeWidth: 0,
              strokeLinejoin: 'miter',
              strokeLinecap: 'butt',
              d: 'M20 18H4V8H20V18M12 6L10 4H4C2.9 4 2 4.89 2 6V18C2 19.11 2.9 20 4 20H20C21.11 20 22 19.11 22 18V8C22 6.9 21.11 6 20 6H12M11 14V12H15V9L19 13L15 17V14H11Z'
            }
          ]
        },
        close: {
          paths: [
            {
              d: 'M6 18L18 6M6 6l12 12'
            }
          ]
        },
        pencil: {
          paths: [
            {
              d: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
            }
          ]
        },
        chevronUp: {
          paths: [
            {
              d: 'M5 15l7-7 7 7'
            }
          ]
        },
        chevronDown: {
          paths: [
            {
              d: 'M19 9l-7 7-7-7'
            }
          ]
        },
        search: {
          paths: [
            {
              d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            }
          ]
        },
        image: {
          paths: [
            {
              d: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
            }
          ]
        },
        user: {
          paths: [
            {
              d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
            }
          ]
        }
      }
    },
    iconObj() {
      return this.icons[this.icon] || this.icons.star
    },
    paths() {
      return this.iconObj.paths.map((path) => {
        var strokeWidth = 2
        if (this.strokeWidth && !isNaN(this.strokeWidth)) strokeWidth = this.strokeWidth
        else if (path.strokeWidth !== null && !isNaN(path.strokeWidth)) strokeWidth = path.strokeWidth
        return {
          d: path.d,
          strokeWidth,
          strokeLinecap: path.strokeLinecap || 'round',
          strokeLinejoin: path.strokeLinejoin || 'round'
        }
      })
    }
  }
}
</script>