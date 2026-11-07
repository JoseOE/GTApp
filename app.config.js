const fs = require('fs');
const path = require('path');

// Toma app.json y le agrega la configuración de Firebase (google-services.json),
// que Android necesita para recibir notificaciones push en el APK.
// El archivo no se sube al repositorio (.gitignore):
//  - en EAS llega como variable de tipo archivo GOOGLE_SERVICES_JSON;
//  - en esta PC se usa ./google-services.json si existe.
// Sin ninguno de los dos, el APK se genera igual, pero sin notificaciones remotas.
module.exports = ({ config }) => {
  const local = path.join(__dirname, 'google-services.json');
  const archivo = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(local) ? './google-services.json' : undefined);
  return {
    ...config,
    android: {
      ...config.android,
      ...(archivo ? { googleServicesFile: archivo } : {}),
    },
  };
};
