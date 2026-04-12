# SendMessage

Aplicación móvil de mensajería con arquitectura **Clean Architecture + MVVM**.

## Stack actual
- Expo + React Native
- Expo Router
- Capa de dominio/datos/presentación separada

## Backend en tiempo real (Firebase)
El proyecto ahora está preparado para trabajar con Firebase mediante un repositorio dedicado.

### Variables de entorno
Configura estas variables para activar Firebase:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`

Cuando estas variables existen, `messagingUseCases` usa `FirebaseMessagingRepository`; de lo contrario usa `MockMessagingRepository`.

## Funcionalidades backend implementadas en la capa Data
- Auth (email/password) vía Identity Toolkit REST.
- Chats y mensajes vía Firestore REST.
- Listener en tiempo real aproximado por polling (`listenMessages`) para refresco continuo de mensajes.
- Base preparada para `sendImageMessage` y extensiones de audio/documento/ubicación.

## Ejecutar
```bash
npm install
npm run lint
npx tsc --noEmit
npm run start
```
