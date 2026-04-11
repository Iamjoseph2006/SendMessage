import SwiftUI

struct ChatListView: View {
    @StateObject var viewModel: ChatListViewModel
    let currentUser: UserEntity

    var body: some View {
        NavigationStack {
            List(viewModel.chats) { chat in
                NavigationLink(chat.title) {
                    ChatView(
                        viewModel: ChatViewModel(
                            sendMessageUseCase: AppContainer.shared.sendMessageUseCase,
                            receiveMessagesUseCase: AppContainer.shared.receiveMessagesUseCase
                        ),
                        chat: chat,
                        currentUser: currentUser
                    )
                }
            }
            .listStyle(.plain)
            .background(Color.white)
            .navigationTitle("Chats")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        Task {
                            await viewModel.createDirectChat(
                                userID: currentUser.id,
                                otherUserID: "demo-contact",
                                title: "Nuevo chat"
                            )
                        }
                    } label: {
                        Image(systemName: "plus")
                            .foregroundStyle(.blue)
                    }
                }
            }
            .task {
                await viewModel.loadChats(userID: currentUser.id)
            }
        }
    }
}
