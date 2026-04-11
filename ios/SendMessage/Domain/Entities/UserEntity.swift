import Foundation

struct UserEntity: Identifiable, Codable, Equatable {
    let id: String
    let displayName: String
    let email: String
    let avatarURL: String?
    let isOnline: Bool
}
