# Firestore model (MVP)

## Collections

- `users/{userId}`
  - `displayName: string`
  - `email: string`
  - `avatarURL: string?`
  - `isOnline: bool`

- `chats/{chatId}`
  - `title: string`
  - `participantIDs: string[]`
  - `lastMessagePreview: string`
  - `updatedAt: timestamp`
  - `isGroup: bool`

- `chats/{chatId}/messages/{messageId}`
  - `chatID: string`
  - `senderID: string`
  - `text: string?`
  - `mediaURL: string?`
  - `createdAt: timestamp`
  - `status: sent|delivered|read`

- `groups/{groupId}` (optional extension)
  - `name, adminIDs, participantIDs, createdAt`
