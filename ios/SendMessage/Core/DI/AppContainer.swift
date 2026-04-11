import Foundation

final class AppContainer {
    static let shared = AppContainer()

    private init() {}

    lazy var authRepository: AuthRepository = AuthRepositoryImpl(
        dataSource: FirebaseAuthDataSource()
    )

    lazy var chatRepository: ChatRepository = ChatRepositoryImpl(
        dataSource: FirebaseChatDataSource()
    )

    lazy var registerUserUseCase = RegisterUserUseCase(authRepository: authRepository)
    lazy var loginUserUseCase = LoginUserUseCase(authRepository: authRepository)
    lazy var fetchUserChatsUseCase = FetchUserChatsUseCase(chatRepository: chatRepository)
    lazy var sendMessageUseCase = SendMessageUseCase(chatRepository: chatRepository)
    lazy var receiveMessagesUseCase = ReceiveMessagesUseCase(chatRepository: chatRepository)
    lazy var createChatUseCase = CreateChatUseCase(chatRepository: chatRepository)
    lazy var createGroupUseCase = CreateGroupUseCase(chatRepository: chatRepository)
    lazy var uploadMediaUseCase = UploadMediaUseCase(chatRepository: chatRepository)
}
