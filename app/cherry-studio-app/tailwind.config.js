import heroUINativePlugin from 'heroui-native/tailwind-plugin'

/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ['./src/**/*.{js,jsx,ts,tsx}', './node_modules/heroui-native/lib/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Base color tokens
        brand: '#00b96b',
        purple: {
          100: '#9c96f9',
          20: '#9c96f933',
          'dark-100': '#b5affd',
          'dark-20': '#b5affd33'
        },
        orange: {
          100: '#ffb26e',
          20: '#ffb26e33',
          10: '#ffb26e1a',
          'dark-100': '#ffc27f',
          'dark-20': '#ffc27f33'
        },
        blue: {
          100: '#6fb1fa',
          20: '#6fb1fa33',
          10: '#6fb1fa1a',
          'dark-100': '#8fc2ff',
          'dark-20': '#8fc2ff33'
        },
        pink: {
          100: '#e398c9',
          20: '#e398c933',
          'dark-100': '#f0a8d7',
          'dark-20': '#f0a8d733'
        },
        red: {
          100: '#ff0000',
          20: '#ff000033',
          10: '#ff00001a'
        },
        gray: {
          80: '#a0a1b0cc',
          60: '#a0a1b099',
          40: '#a0a1b066',
          20: '#a0a1b033',
          10: '#a0a1b01a'
        },
        yellow: {
          100: '#f2e218', // light
          20: '#f2e21833', // light
          'dark-100': '#f9ea42', // dark
          'dark-20': '#f9ea4233' // dark
        },
        'text-delete': '#dc3e42',
        'text-link': '#0090ff',
        'border-color': 'rgba(0, 0, 0, 0.1)',

        // Theme-aware colors with dark mode variants
        green: {
          100: '#81df94', // light
          20: '#8de59e4d', // light
          10: '#8de59e26', // light
          'dark-100': '#acf3a6', // dark
          'dark-20': '#acf3a633', // dark
          'dark-10': '#acf3a61a' // dark
        },
        'ui-card-background': {
          DEFAULT: '#ffffff', // light
          dark: '#19191c' // dark
        },
        'color-border-linear': {
          DEFAULT: '#000000', // light
          dark: '#ffffff' // dark
        },
        'background-primary': {
          DEFAULT: '#f7f7f7', // light
          dark: '#121213' // dark
        },
        'background-secondary': {
          DEFAULT: '#ffffff99', // light
          dark: '#20202099' // dark
        },
        'ui-card': {
          DEFAULT: '#ffffff', // light
          dark: '#19191c' // dark
        },
        'text-primary': {
          DEFAULT: '#202020', // light
          dark: '#f9f9f9' // dark
        },
        'text-secondary': {
          DEFAULT: '#646464', // light
          dark: '#cecece' // dark
        },
        'background-opacity': {
          DEFAULT: '#ffffff', // light
          dark: 'rgba(34,34,34,0.7)' // dark
        }
      }
    }
  },
  darkMode: 'class',
  plugins: [heroUINativePlugin]
}
