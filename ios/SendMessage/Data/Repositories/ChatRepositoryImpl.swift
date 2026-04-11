import Foundation

final class ChatRepositoryImpl: ChatRepository {
    private let dataSource: FirebaseChatDataSource

    init(dataSource: FirebaseChatDataSource) {
        self.dataSource = dataSource
    }

    func fetchUserChats(userID: String) async throws -> [ChatEntity] {
        try await dataSource.fetchChats(for: userID)
    }

    func observeMessages(chatID: String, onUpdate: @escaping ([MessageEntity]) -> Void) throws -> ListenerToken {
        dataSource.observeMessages(chatID: chatID, onUpdate: onUpdate)
    }

    func sendMessage(chatID: String, senderID: String, text: String?) async throws {
        try await dataSource.sendMessage(chatID: chatID, senderID: senderID, text: text)
    }

    func uploadMedia(chatID: String, senderID: String, data: Data, mimeType: String) async throws -> URL {
        try await dataSource.uploadMedia(chatID: chatID, senderID: senderID, data: data, mimeType: mimeType)
    }

    func createChat(currentUserID: String, participantIDs: [String], title: String) async throws -> ChatEntity {
        try await dataSource.createChat(currentUserID: currentUserID, participantIDs: participantIDs, title: title, isGroup: false)
    }

    func createGroup(ownerID: String, title: String, participantIDs: [String]) async throws -> ChatEntity {
        try await dataSource.createChat(currentUserID: ownerID, participantIDs: participantIDs, title: title, isGroup: true)
    }
}
