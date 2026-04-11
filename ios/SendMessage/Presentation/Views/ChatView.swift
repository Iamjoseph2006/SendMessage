import SwiftUI

struct ChatView: View {
    @StateObject var viewModel: ChatViewModel
    let chat: ChatEntity
    let currentUser: UserEntity

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 8) {
                    ForEach(viewModel.messages) { message in
                        HStack {
                            if message.senderID == currentUser.id { Spacer() }
                            VStack(alignment: .leading, spacing: 4) {
                                Text(message.text ?? "📎 Multimedia")
                                Text(message.status.rawValue.capitalized)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(10)
                            .background(message.senderID == currentUser.id ? Color.blue.opacity(0.2) : Color.gray.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            if message.senderID != currentUser.id { Spacer() }
                        }
                    }
                }
                .padding()
            }
            .background(Color.white)

            HStack(spacing: 8) {
                TextField("Mensaje...", text: $viewModel.composingText)
                    .textFieldStyle(.roundedBorder)

                Button {
                    Task { await viewModel.send(chatID: chat.id, senderID: currentUser.id) }
                } label: {
                    Image(systemName: "paperplane.fill")
                        .foregroundStyle(.white)
                        .padding(10)
                        .background(Color.blue)
                        .clipShape(Circle())
                }
            }
            .padding()
            .background(Color.white)
        }
        .navigationTitle(chat.title)
        .onAppear { viewModel.bind(chatID: chat.id) }
    }
}
