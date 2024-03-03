// import '!style-loader!css-loader!postcss-loader!tailwindcss/tailwind.css'
// import '!style-loader!css-loader!postcss-loader!../src/index.css'

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}