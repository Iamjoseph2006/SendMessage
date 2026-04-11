# SendMessage

Aplicación móvil con Expo Router enfocada en una experiencia estilo mensajería moderna, con interfaz completamente funcional a nivel visual e interacción.

## Estado actual del proyecto

- Navegación inferior con cuatro secciones: **Chats**, **Llamadas**, **Estados** y **Perfil**.
- Lista de conversaciones con navegación a detalle de chat.
- Pantalla de conversación con envío de mensajes, acciones rápidas (adjuntos, cámara, audio, ubicación, emojis) y estados de mensaje simulados.
- Pantallas de llamadas, estados y perfil con datos mock e interacción visual.
- Arquitectura preparada para escalar con **Clean Architecture + MVVM** usando repositorios y casos de uso.

## Estructura principal

- `app/(tabs)/index.tsx`: lista de chats.
- `app/chat/[chatId].tsx`: conversación completa con interacciones simuladas.
- `app/(tabs)/calls.tsx`: historial de llamadas.
- `app/(tabs)/status.tsx`: estados tipo historias.
- `app/(tabs)/profile.tsx`: perfil y ajustes visuales.
- `src/domain`: entidades, contratos y casos de uso.
- `src/data`: repositorio mock y datos simulados.
- `src/presentation/viewmodels`: hooks MVVM para cada pantalla.
