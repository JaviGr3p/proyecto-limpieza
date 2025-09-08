// Cargar configuración desde el entorno o archivo de configuración
const path = require('path');

// Anulaciones de variables de entorno
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === 'true',
};

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      
      // Deshabilitar la recarga hot por completo si la variable de entorno está configurada
      if (config.disableHotReload) {
        // Eliminar plugins relacionados con la recarga hot
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
        });

        // Deshabilitar modo de vigilancia
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/, // Ignorar todos los archivos
        };
      }
      
      return webpackConfig;
    },
  },
};
  
