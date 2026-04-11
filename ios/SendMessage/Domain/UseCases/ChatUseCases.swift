import Foundation

struct SendMessageUseCase {
    let chatRepository: ChatRepository

    func execute(chatID: String, senderID: String, text: String) async throws {
        try await chatRepository.sendMessage(chatID: chatID, senderID: senderID, text: text)
    }
}

struct ReceiveMessagesUseCase {
    let chatRepository: ChatRepository

    func execute(chatID: String, onUpdate: @escaping ([MessageEntity]) -> Void) throws -> ListenerToken {
        try chatRepository.observeMessages(chatID: chatID, onUpdate: onUpdate)
    }
}

struct CreateChatUseCase {
    let chatRepository: ChatRepository

    func execute(currentUserID: String, participantIDs: [String], title: String) async throws -> ChatEntity {
        try await chatRepository.createChat(currentUserID: currentUserID, participantIDs: participantIDs, title: title)
    }
}

struct CreateGroupUseCase {
    let chatRepository: ChatRepository

    func execute(ownerID: String, title: String, participantIDs: [String]) async throws -> ChatEntity {
        try await chatRepository.createGroup(ownerID: ownerID, title: title, participantIDs: participantIDs)
    }
}

struct UploadMediaUseCase {
    let chatRepository: ChatRepository

    func execute(chatID: String, senderID: String, data: Data, mimeType: String) async throws -> URL {
        try await chatRepository.uploadMedia(chatID: chatID, senderID: senderID, data: data, mimeType: mimeType)
    }
}

struct FetchUserChatsUseCase {
    let chatRepository: ChatRepository

    func execute(userID: String) async throws -> [ChatEntity] {
        try await chatRepository.fetchUserChats(userID: userID)
    }
}
