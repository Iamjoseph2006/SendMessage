import Foundation

protocol ChatRepository {
    func fetchUserChats(userID: String) async throws -> [ChatEntity]
    func observeMessages(chatID: String, onUpdate: @escaping ([MessageEntity]) -> Void) throws -> ListenerToken
    func sendMessage(chatID: String, senderID: String, text: String?) async throws
    func uploadMedia(chatID: String, senderID: String, data: Data, mimeType: String) async throws -> URL
    func createChat(currentUserID: String, participantIDs: [String], title: String) async throws -> ChatEntity
    func createGroup(ownerID: String, title: String, participantIDs: [String]) async throws -> ChatEntity
}

protocol ListenerToken {
    func cancel()
}
