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
* **Tienda del gimnasio**: el miembro compra desde su casa y recoge en recepción (ver abajo).
* **Mi cuenta**: cambiar la contraseña (obligatorio si es la temporal que dio recepción), PayPal vinculado y cerrar sesión.

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

## Sesión

El login y el registro devuelven un `token`. La app lo guarda y lo manda en cada llamada como `Authorization: Bearer <token>` (junto con `X-User-Id` mientras dure la transición). Si el servidor responde `{sesionVencida: true}`, la app borra la sesión y vuelve al login. Con esto ya se puede activar `EXIGIR_TOKEN=true` en Render.

## Tienda

La web es el panel del dueño y su mostrador; la app es el canal del miembro. Usa las mismas rutas de GTWeb, con `?canal=app` en el carrito.

* **Catálogo**: búsqueda, categorías, estrellas, marca y proveedor, y la advertencia sanitaria de los suplementos.
* **Reseñas**: califica quien compró y pagó el producto (una por persona, editable). Arriba de la tienda aparece el carrusel "Lo mejor calificado".
* **Antes de pagar** (obligatorio): advertencia sanitaria si hay suplementos, "¿Confirmas tu compra?" con el desglose de IVA, la forma de pago y quién vende (razón social y RFC), y la casilla de Términos y Aviso de privacidad. El consentimiento viaja en el checkout con `terminosVersion: "1"`. Con esto ya se puede activar `EXIGIR_CONSENTIMIENTO_APP=true` en Render.
* **Formas de pago** (todas simuladas, no se cobra dinero real):
  * Tarjeta: de contado o a 3, 6, 9 y 12 meses sin intereses con crédito (desde $300, $600, $900 y $1,200).
  * PayPal: se aprueba en la página del simulador y vuelve a la app por `gymtrack://pago-paypal`; con la cuenta vinculada se paga con solo confirmar.
  * Efectivo en tiendas: ficha con código de barras y referencia, válida 72 h (OXXO, 7-Eleven, Walmart, Bodega Aurrerá, Farmacias del Ahorro y Circle K).
* **Mis pedidos**: "Por recoger" con el QR que escanea recepción, y "Entregado" en cuanto lo entregan. Comprobante en PDF para ver o compartir, enlace por WhatsApp (vence a los 7 días) y reenvío al correo.

### Tarjetas de prueba

| Tarjeta | Resultado |
|---|---|
| 4242 4242 4242 4242 | Visa crédito aprobada |
| 5555 5555 5555 4444 | Mastercard crédito aprobada |
| 3782 822463 10005 | American Express aprobada |
| 4000 0566 5566 5556 | Visa débito aprobada |
| 5200 8282 8282 8210 | Mastercard débito aprobada |
| 4000 0000 0000 0002 | Rechazada |

Cualquier nombre, una fecha futura y CVC de 3 dígitos (4 en American Express).

## Estructura

```plaintext
app/          Pantallas (Expo Router): (auth), (tabs), gimnasio, entrenamiento, tienda, pago, pedidos y cuenta
components/   Componentes de UI reutilizables, de la tienda y del pago
constants/    Colores, tema y rutinas iniciales
hooks/        Hooks de tema
lib/          Cliente de API, sesión, cuenta, tienda, pagos, recibos y notificaciones
assets/       Fuentes e imágenes
patches/      Parches de dependencias (patch-package)
```

## Proyecto académico

GymTrack — Administra. Identifica. Accede. Entrena. Analiza. Mejora.
