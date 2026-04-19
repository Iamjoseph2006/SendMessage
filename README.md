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

Ejemplo esperado para este proyecto:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=sendmessage-cc6aa.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=sendmessage-cc6aa
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=sendmessage-cc6aa.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=186014509279
EXPO_PUBLIC_FIREBASE_APP_ID=1:186014509279:web:...
```

> Importante: en Expo con SDK JS de Firebase debes usar **Web App config**.  
> Si `EXPO_PUBLIC_FIREBASE_APP_ID` no contiene `:web:`, el proyecto falla de forma intencional.

### Qué copiar desde Firebase Console
1. Ve a **Firebase Console → Project settings (⚙️) → General**.
2. En **Your apps**, selecciona o crea una **Web app** (`</>`), no Android.
3. Copia el bloque `firebaseConfig` de esa Web app:
   - `apiKey` → `EXPO_PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket` → `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` (**debe incluir `:web:`**) → `EXPO_PUBLIC_FIREBASE_APP_ID`

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
