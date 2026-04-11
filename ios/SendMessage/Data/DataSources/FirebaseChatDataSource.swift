import Foundation
import FirebaseFirestore
import FirebaseStorage

final class FirestoreListenerToken: ListenerToken {
    private let registration: ListenerRegistration

    init(registration: ListenerRegistration) {
        self.registration = registration
    }

    func cancel() {
        registration.remove()
    }
}

final class FirebaseChatDataSource {
    private let db: Firestore
    private let storage: Storage

    init(db: Firestore = Firestore.firestore(), storage: Storage = Storage.storage()) {
        self.db = db
        self.storage = storage
    }

    func fetchChats(for userID: String) async throws -> [ChatEntity] {
        let snapshot = try await db.collection("chats")
            .whereField("participantIDs", arrayContains: userID)
            .order(by: "updatedAt", descending: true)
            .getDocuments()

        return try snapshot.documents.compactMap { try $0.data(as: ChatEntity.self) }
    }

    func observeMessages(chatID: String, onUpdate: @escaping ([MessageEntity]) -> Void) -> ListenerToken {
        let registration = db.collection("chats")
            .document(chatID)
            .collection("messages")
            .order(by: "createdAt", descending: false)
            .addSnapshotListener { snapshot, _ in
                let messages = snapshot?.documents.compactMap { try? $0.data(as: MessageEntity.self) } ?? []
                onUpdate(messages)
            }

        return FirestoreListenerToken(registration: registration)
    }

    func sendMessage(chatID: String, senderID: String, text: String?) async throws {
        let messageRef = db.collection("chats").document(chatID).collection("messages").document()
        let message = MessageEntity(
            id: messageRef.documentID,
            chatID: chatID,
            senderID: senderID,
            text: text,
            mediaURL: nil,
            createdAt: Date(),
            status: .sent
        )

        try messageRef.setData(from: message)

        try await db.collection("chats").document(chatID).setData([
            "lastMessagePreview": text ?? "📎 Archivo",
            "updatedAt": Timestamp(date: Date())
        ], merge: true)
    }

    func createChat(currentUserID: String, participantIDs: [String], title: String, isGroup: Bool) async throws -> ChatEntity {
        let chatRef = db.collection("chats").document()
        let participants = Array(Set(participantIDs + [currentUserID]))
        let entity = ChatEntity(
            id: chatRef.documentID,
            title: title,
            participantIDs: participants,
            lastMessagePreview: "",
            updatedAt: Date(),
            isGroup: isGroup
        )

        try chatRef.setData(from: entity)
        return entity
    }

    func uploadMedia(chatID: String, senderID: String, data: Data, mimeType: String) async throws -> URL {
        let path = "media/\(chatID)/\(senderID)-\(UUID().uuidString)"
        let metadata = StorageMetadata()
        metadata.contentType = mimeType

        let ref = storage.reference(withPath: path)
        _ = try await ref.putDataAsync(data, metadata: metadata)
        return try await ref.downloadURL()
    }
}
