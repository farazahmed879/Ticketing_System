import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import babel from 'vite-plugin-babel'

export default defineConfig({
  plugins: [
    react({
      // Disable the built-in babel to avoid conflicts with our custom one
      babel: {
        babelrc: true,
        configFile: true,
      }
    }),
    babel({
      babelConfig: {
        babelrc: true,
        configFile: true,
      },
      filter: /\.[jt]sx?$/,
    })
  ],
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
      modules: path.resolve(__dirname, './src/lib_legacy'),
      actions: path.resolve(__dirname, './src/actions'),
      api: path.resolve(__dirname, './src/api'),
      singleton: path.resolve(__dirname, './src/singleton'),
      components: path.resolve(__dirname, './src/components'),
      containers: path.resolve(__dirname, './src/containers'),
      reducers: path.resolve(__dirname, './src/reducers'),
      sagas: path.resolve(__dirname, './src/sagas'),
      lib: path.resolve(__dirname, './src/lib_legacy'),
      lib2: path.resolve(__dirname, './src/lib'),
      sass: path.resolve(__dirname, './src/sass'),
      vendor: path.resolve(__dirname, './src/vendor'),
      plugins: path.resolve(__dirname, './src/plugins'),
      uikit: path.resolve(__dirname, './src/vendor/uikit_shim.js'),
      serverSocket: path.resolve(__dirname, './src/socketio'),
      jscookie: path.resolve(__dirname, './src/vendor/jscookie_shim.js'),
      underscore: path.resolve(__dirname, './src/vendor/underscore_shim.js'),
      jquery: path.resolve(__dirname, './src/vendor/jquery_shim.js'),
      handlebars: path.resolve(__dirname, './src/vendor/handlebars/handlebars'),
      jquery_scrollTo: path.resolve(__dirname, './src/vendor/jquery/jquery.scrollTo.min'),
      easing: path.resolve(__dirname, './src/vendor/jquery/jquery.easing'),
      modernizr: path.resolve(__dirname, './src/vendor/modernizr/modernizr'),
      async: path.resolve(__dirname, './src/vendor/async_shim.js'),
      jquery_custom: path.resolve(__dirname, './src/plugins/jquery.custom'),
      datatables: path.resolve(__dirname, './src/vendor/datatables/jquery.dataTables'),
      dt_responsive: path.resolve(__dirname, './src/vendor/datatables/dataTables.responsive'),
      dt_grouping: path.resolve(__dirname, './src/vendor/datatables/dataTables.grouping'),
      dt_scroller: path.resolve(__dirname, './src/vendor/datatables/dataTables.scroller'),
      dt_ipaddress: path.resolve(__dirname, './src/vendor/datatables/dataTables.ipaddress'),
      easypiechart: path.resolve(__dirname, './src/vendor/easypiechart/easypiechart'),
      chosen: path.resolve(__dirname, './src/vendor/chosen/chosen.jquery.min'),
      autogrow: path.resolve(__dirname, './src/plugins/autogrow'),
      pace: path.resolve(__dirname, './src/vendor/pace/pace.min'),
      tomarkdown: path.resolve(__dirname, './src/vendor/tomarkdown_shim.js'),
      colorpicker: path.resolve(__dirname, './src/vendor/simplecolorpicker/jquery.simplecolorpicker'),
      datepicker: path.resolve(__dirname, './src/vendor/datepicker/foundation-datepicker'),
      d3: path.resolve(__dirname, './src/vendor/d3_shim.js'),
      c3: path.resolve(__dirname, './src/vendor/c3/c3'),
      metricsgraphics: path.resolve(__dirname, './src/vendor/metricsgraphics_shim.js'),
      d3pie: path.resolve(__dirname, './src/vendor/d3pie/d3pie.min'),
      peity: path.resolve(__dirname, './src/vendor/peity/jquery.peity.min'),
      countup: path.resolve(__dirname, './src/vendor/countup_shim.js'),
      velocity: path.resolve(__dirname, './src/vendor/velocity_shim.js'),
      selectize: path.resolve(__dirname, './src/vendor/selectize/selectize'),
      multiselect: path.resolve(__dirname, './src/vendor/multiselect/js/jquery.multi-select'),
      waves: path.resolve(__dirname, './src/vendor/waves/waves'),
      isinview: path.resolve(__dirname, './src/plugins/jquery.isinview'),
      jquery_docsize: path.resolve(__dirname, './src/plugins/jquery.documentsize'),
      jquery_steps: path.resolve(__dirname, './src/plugins/jquery.steps'),
      jquery_actual: path.resolve(__dirname, './src/plugins/jquery.actual'),
      formvalidator: path.resolve(__dirname, './src/vendor/formvalidator/jquery.form-validator'),
      qrcode: path.resolve(__dirname, './src/vendor/qrcode/jquery.qrcode.min'),
      tether: path.resolve(__dirname, './src/vendor/tether/tether.min'),
      shepherd: path.resolve(__dirname, './src/vendor/shepherd/js/shepherd.min'),
      easymde: path.resolve(__dirname, './src/vendor/easymde_shim.js'),
      inlineAttachment: path.resolve(__dirname, './src/vendor/easymde/dist/inline-attachment'),
      inputInlineAttachment: path.resolve(__dirname, './src/vendor/easymde/dist/input.inline-attachment'),
      cm4InlineAttachment: path.resolve(__dirname, './src/vendor/easymde/dist/codemirror-4.inline-attachment'),
      grapesjs: path.resolve(__dirname, './src/vendor/grapesjs/grapes.min'),
      grapesjsEmail: path.resolve(__dirname, './src/vendor/grapesjs/grapesjs-preset-email.min'),
      waypoints: path.resolve(__dirname, './src/vendor/waypoints/jquery.waypoints'),
      snackbar: path.resolve(__dirname, './src/plugins/snackbar'),
    },
  },
  define: {
    'process.env': {},
    'global': 'window',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8118',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8118',
        ws: true,
      },
      '/uploads': {
        target: 'http://localhost:8118',
      },
      '/assets': {
        target: 'http://localhost:8118',
      },
    },
  },
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  css: {
    preprocessorOptions: {
      sass: {
        indentedSyntax: true,
        includePaths: [path.resolve(__dirname, './src/sass')],
        quietDeps: true,
        silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions'],
      },
    },
  },
})
