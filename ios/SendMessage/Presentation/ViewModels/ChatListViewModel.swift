import Foundation

@MainActor
final class ChatListViewModel: ObservableObject {
    @Published var chats: [ChatEntity] = []
    @Published var errorMessage: String?

    private let fetchUserChatsUseCase: FetchUserChatsUseCase
    private let createChatUseCase: CreateChatUseCase

    init(fetchUserChatsUseCase: FetchUserChatsUseCase, createChatUseCase: CreateChatUseCase) {
        self.fetchUserChatsUseCase = fetchUserChatsUseCase
        self.createChatUseCase = createChatUseCase
    }

    func loadChats(userID: String) async {
        do {
            chats = try await fetchUserChatsUseCase.execute(userID: userID)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func createDirectChat(userID: String, otherUserID: String, title: String) async {
        do {
            _ = try await createChatUseCase.execute(currentUserID: userID, participantIDs: [otherUserID], title: title)
            await loadChats(userID: userID)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
