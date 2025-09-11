export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      overrideBrowserslist: [
        '>0.2%',
        'not dead',
        'not op_mini all',
        'ie >= 11',
        'last 2 versions',
      ],
      grid: 'autoplace',
      cascade: false,
    },
  },
};
