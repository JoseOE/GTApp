# GTApp — Aplicación móvil de GymTrack

App móvil de **GymTrack** para los miembros de los gimnasios (lado B2C del ecosistema B2B2C). Desarrollada con **React Native, Expo (SDK 57), Expo Router y TypeScript**.

La plataforma web administrativa y el backend (Spring Boot + MongoDB Atlas) viven en el repositorio [GTWeb](https://github.com/JoseOE/GTWeb).

## Funcionalidades

* Registro e inicio de sesión.
* Unirse a un gimnasio (código de invitación) y directorio de gimnasios.
* Consultar el estado de la membresía y su vencimiento.
* Ver las rutinas asignadas por el gimnasio y las máquinas disponibles.
* Registrar entrenamientos (series, repeticiones, peso).
* Consultar progreso, récords e historial.
* Notificaciones push.

## Ejecución local

Requisitos: **Node.js 18+** y la app **Expo Go** (o un emulador Android / simulador iOS).

```bash
npm install
```

```bash
npx expo start
```

Presiona `a` (Android), `i` (iOS) o `w` (web), o escanea el QR con Expo Go.

### Backend

Por defecto la app se conecta al backend publicado en `https://gtweb.onrender.com` (ver [lib/api.ts](lib/api.ts)). Para usar un backend local de GTWeb en el puerto 8080:

```bash
EXPO_PUBLIC_API_URL=local npx expo start
```

También puedes asignar a `EXPO_PUBLIC_API_URL` una URL completa.

## Estructura

```plaintext
app/          Pantallas (Expo Router): (auth), (tabs), gimnasio y registro de entrenamiento
components/   Componentes de UI reutilizables
constants/    Colores, tema y rutinas iniciales
hooks/        Hooks de tema
lib/          Cliente de API, sesión, cuenta y notificaciones
assets/       Fuentes e imágenes
patches/      Parches de dependencias (patch-package)
```

## Proyecto académico

GymTrack — Administra. Identifica. Accede. Entrena. Analiza. Mejora.
