import Foundation

struct ChatEntity: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let participantIDs: [String]
    let lastMessagePreview: String
    let updatedAt: Date
    let isGroup: Bool
}
