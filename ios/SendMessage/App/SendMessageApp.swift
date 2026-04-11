import SwiftUI
import FirebaseCore

@main
struct SendMessageApp: App {
    @StateObject private var authViewModel = AuthViewModel(
        registerUserUseCase: AppContainer.shared.registerUserUseCase,
        loginUserUseCase: AppContainer.shared.loginUserUseCase
    )

    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if let currentUser = authViewModel.user {
                    ChatListView(
                        viewModel: ChatListViewModel(
                            fetchUserChatsUseCase: AppContainer.shared.fetchUserChatsUseCase,
                            createChatUseCase: AppContainer.shared.createChatUseCase
                        ),
                        currentUser: currentUser
                    )
                } else {
                    AuthView(viewModel: authViewModel)
                }
            }
            .background(Color.white)
        }
    }
}
