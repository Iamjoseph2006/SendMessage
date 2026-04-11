# SendMessage

Aplicación móvil con Expo Router enfocada en un **MVP de mensajería local**.

## Estado actual del proyecto

- Interfaz renovada con base visual **blanca** y acentos azules.
- Flujo de chat funcional en memoria local (sin backend y sin base de datos).
- Pantalla de exploración con historias y comunidades de ejemplo.
- Login y registro **fuera de alcance por ahora**.

## Estructura principal

- `app/(tabs)/index.tsx`: Chat principal local con respuestas automáticas.
- `app/(tabs)/explore.tsx`: Vista de historias y canales/comunidades.
- `app/(tabs)/_layout.tsx`: Navegación por pestañas con estilo blanco.
- `app/_layout.tsx`: Layout raíz de navegación.

## Siguiente paso sugerido (sin auth)

1. Definir capa de servicios para API/Realtime (sin acoplarla todavía a UI).
2. Normalizar modelos de datos (`chat`, `message`, `community`).
3. Agregar estado global (por ejemplo Zustand/Redux Toolkit) para preparar integración de backend.
