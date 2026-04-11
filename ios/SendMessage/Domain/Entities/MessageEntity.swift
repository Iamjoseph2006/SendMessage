import Foundation

enum MessageDeliveryStatus: String, Codable {
    case sent
    case delivered
    case read
}

struct MessageEntity: Identifiable, Codable, Equatable {
    let id: String
    let chatID: String
    let senderID: String
    let text: String?
    let mediaURL: String?
    let createdAt: Date
    let status: MessageDeliveryStatus
}
