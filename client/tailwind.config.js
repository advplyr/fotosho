module.exports = {
  purge: {
    options: {
      safelist: [
        'w-10',
        'h-10'
      ]
    }
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        bg: '#222222',
        fg: '#444444',
        yellowgreen: 'yellowgreen',
        error: '#FF5252',
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#FB8C00'
      },
      cursor: {
        none: 'none'
      }
    }
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
