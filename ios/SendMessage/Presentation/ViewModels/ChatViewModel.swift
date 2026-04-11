import Foundation

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [MessageEntity] = []
    @Published var composingText = ""
    @Published var errorMessage: String?

    private let sendMessageUseCase: SendMessageUseCase
    private let receiveMessagesUseCase: ReceiveMessagesUseCase
    private var listenerToken: ListenerToken?

    init(sendMessageUseCase: SendMessageUseCase, receiveMessagesUseCase: ReceiveMessagesUseCase) {
        self.sendMessageUseCase = sendMessageUseCase
        self.receiveMessagesUseCase = receiveMessagesUseCase
    }

    func bind(chatID: String) {
        do {
            listenerToken = try receiveMessagesUseCase.execute(chatID: chatID) { [weak self] incoming in
                Task { @MainActor in
                    self?.messages = incoming
                }
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func send(chatID: String, senderID: String) async {
        let text = composingText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        do {
            try await sendMessageUseCase.execute(chatID: chatID, senderID: senderID, text: text)
            composingText = ""
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    deinit {
        listenerToken?.cancel()
    }
}
