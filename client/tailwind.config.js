module.exports = {
  purge: {
    options: {
      safelist: [
        'w-7',
        'h-7',
        'w-8',
        'h-8',
        'w-9',
        'h-9',
        'w-10',
        'h-10',
        'p-1',
        'p-1.5',
        'p-2'
      ]
    }
  },
  darkMode: false,
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
