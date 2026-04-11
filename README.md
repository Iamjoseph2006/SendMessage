# SendMessage

Este repositorio ahora incluye una base **iOS nativa en SwiftUI** con **Clean Architecture + MVVM** y backend en **Firebase** para mensajería en tiempo real.

## Arquitectura implementada

Estructura en `ios/SendMessage/`:

- **Presentation**: Views + ViewModels (`AuthView`, `ChatListView`, `ChatView`).
- **Domain**: Entities, Repositories (protocolos), UseCases.
- **Data**: Implementaciones de repositorios y DataSources Firebase (Auth, Firestore, Storage).
- **Core/DI**: Contenedor de dependencias (`AppContainer`).

## UseCases incluidos

- `RegisterUserUseCase`
- `LoginUserUseCase`
- `SendMessageUseCase`
- `ReceiveMessagesUseCase` (listener tiempo real)
- `CreateChatUseCase`
- `CreateGroupUseCase`
- `UploadMediaUseCase`
- `FetchUserChatsUseCase`

## Backend y seguridad

- DataSources conectados a `FirebaseAuth`, `Firestore`, `Storage`.
- Modelo de datos documentado en `ios/SendMessage/Config/FirestoreModel.md`.
- Reglas de seguridad base en `backend/firestore.rules`.

## UI/UX aplicada (MVP)

- Fondo principal blanco.
- Azul como color primario para botones, iconos y highlights.
- Flujo funcional: registro/login → lista de chats → conversación en tiempo real.
- Estado de mensaje: `sent`, `delivered`, `read`.

## Integración pendiente sugerida

1. Login con Apple/Google (el contrato existe, falta implementación completa).
2. Notificaciones push APNs/FCM.
3. Indicador “escribiendo...” y presencia online/offline en Firestore.
4. E2E encryption en capa de dominio/crypto.
