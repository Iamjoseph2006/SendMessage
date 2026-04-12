# SendMessage

Aplicación móvil de mensajería con arquitectura **Clean Architecture + MVVM**.

## Stack actual
- Expo + React Native
- Expo Router
- Capa de dominio/datos/presentación separada

## Backend en tiempo real (Firebase SDK)
Se agregó una implementación escalable con separación por features:

```text
src/
  config/
    firebase.ts
  features/
    auth/
      services/
      hooks/
    chat/
      services/
      hooks/
```

### Variables de entorno
Configura estas variables para activar Firebase SDK:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

### Servicios disponibles
- Auth:
  - `registerUser(email, password)`
  - `loginUser(email, password)`
  - `logoutUser()`
  - `getCurrentUser()`
- Chats:
  - `createChat(userId1, userId2)`
  - `getUserChats(userId)`
  - `listenUserChats(userId, callback)`
- Mensajes:
  - `sendMessage(chatId, text, senderId)`
  - `listenMessages(chatId, callback)` (suscripción tipo `onSnapshot` con `unsubscribe`)

### Hooks listos para UI
- `useAuth()`
- `useUserChats(userId)`
- `useChatMessages(chatId)`

## Ejecutar
```bash
npm install
npm run lint
npx tsc --noEmit
npm run start
```
