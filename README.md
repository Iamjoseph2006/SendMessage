# SendMessage MVP (Expo + React Native)

Prototipo funcional inicial de **SendMessage**, inspirado en experiencias de WhatsApp, Instagram y Telegram, con una interfaz azul estilo clásico de iPhone.

## Qué incluye este MVP

- Registro e inicio de sesión local (flujo UI completo).
- Chat en tiempo real simulado (envío inmediato + respuesta automática asíncrona).
- Base de interfaz para historias, canales y comunidades.
- Diseño minimalista orientado a iOS.

> Nota: este repositorio usa Expo/React Native como base inicial de prototipado rápido. El siguiente paso recomendado es portar módulos clave a SwiftUI nativo y conectar backend real para producción.

## Estructura principal

- `app/(tabs)/index.tsx`: autenticación + chat principal.
- `app/(tabs)/explore.tsx`: historias y comunidades.
- `app/(tabs)/_layout.tsx`: navegación y estilo global de tabs.

## Ejecutar en local

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar:

```bash
npm run ios
```

o

```bash
npm run start
```

## Próximos pasos sugeridos (camino a producción)

1. Integrar backend real-time (Firebase/Supabase/Node + WebSockets).
2. APNs para notificaciones push.
3. Auth con email/teléfono/OAuth.
4. Cifrado de extremo a extremo para mensajes.
5. Llamadas de voz y video (WebRTC).
6. Migración gradual a módulos nativos SwiftUI para iOS.
