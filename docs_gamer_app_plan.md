# GamerHub — Plan de app de gamers (de 0 a fin)

## 1) Idea de producto
**GamerHub**: app social para gamers donde puedes:
- crear tu perfil gamer (plataformas, rangos, juegos favoritos),
- encontrar teammates por juego/rol/rango,
- crear squads y eventos (scrims, rankeds, torneos internos),
- chat en tiempo real por squad y por evento,
- sistema de reputación anti-toxicidad,
- mini tienda interna (skins virtuales de perfil, stickers, etc.).

---

## 2) MVP (versión 1) — lo mínimo para lanzar
1. Registro / login.
2. Perfil gamer.
3. Búsqueda de jugadores.
4. Crear squad.
5. Chat 1:1 y grupal.
6. Crear eventos.
7. Notificaciones push.

---

## 3) Stack recomendado para probar Codex rápido
Como este repo ya usa **Expo + React Native + Firebase**, te conviene seguir ahí:
- **Frontend móvil**: Expo Router + React Native + TypeScript.
- **Estado**: Zustand o Redux Toolkit.
- **Backend BaaS**: Firebase Auth + Firestore + Cloud Functions + Storage.
- **Push notifications**: Expo Notifications / FCM.
- **Analítica**: Firebase Analytics.

---

## 4) Separación de carpetas recomendada
Estructura sugerida (escalable y clara):

```txt
app/
  (auth)/
    login.tsx
    register.tsx
  (tabs)/
    home.tsx
    squads.tsx
    discover.tsx
    events.tsx
    profile.tsx
  chat/
    [chatId].tsx
    new.tsx
  squad/
    [squadId].tsx
    create.tsx
  event/
    [eventId].tsx
    create.tsx
  _layout.tsx

src/
  components/
    ui/
    forms/
    cards/
    chat/
  features/
    auth/
      hooks/
      services/
      types/
    profile/
      hooks/
      services/
      types/
    squads/
      hooks/
      services/
      types/
    chat/
      hooks/
      services/
      types/
    events/
      hooks/
      services/
      types/
  store/
    auth.store.ts
    squads.store.ts
    chat.store.ts
  lib/
    firebase/
      client.ts
      auth.ts
      firestore.ts
      storage.ts
    utils/
      date.ts
      validation.ts
  config/
    env.ts
    constants.ts
  theme/
    colors.ts
    spacing.ts
  types/
    index.ts

functions/
  src/
    matchmaking/
    moderation/
    notifications/
    index.ts

assets/
  images/
  icons/
  sounds/
```

---

## 5) Modelo de datos base (Firestore)
Colecciones sugeridas:
- `users`
- `profiles`
- `games`
- `squads`
- `squadMembers`
- `events`
- `chats`
- `messages`
- `reports`
- `ratings`

Ejemplo `profiles/{userId}`:
```json
{
  "displayName": "NeoPlayer",
  "platforms": ["PC", "PS5"],
  "games": [
    { "id": "valorant", "rank": "Diamond", "roles": ["Duelist"] },
    { "id": "warzone", "rank": "Crimson", "roles": ["IGL"] }
  ],
  "language": ["es", "en"],
  "region": "LATAM",
  "reputation": 4.7,
  "createdAt": "serverTimestamp"
}
```

---

## 6) Roadmap por fases
### Fase 1 (1–2 semanas)
- Auth + perfil + navegación base.
- CRUD de squads.
- Chat básico.

### Fase 2 (2–3 semanas)
- Matchmaking por filtros.
- Eventos y recordatorios.
- Notificaciones push.

### Fase 3 (2 semanas)
- Reputación y reportes.
- Moderación automática básica en mensajes.
- Mejoras UX/UI.

### Fase 4 (continuo)
- Rankings, torneos, monetización, panel admin.

---

## 7) Siguientes pasos concretos para Codex
1. Crear rutas nuevas `(auth)`, `squad`, `event`, `discover`.
2. Mover lógica a `src/features/*` por dominio.
3. Definir tipos (`User`, `Profile`, `Squad`, `Event`, `Message`).
4. Implementar servicios Firestore por feature.
5. Agregar reglas de seguridad de Firestore por colección.
6. Crear seeds de datos de prueba.

Con esto tienes una base de nivel producción para crecer sin desorden.
