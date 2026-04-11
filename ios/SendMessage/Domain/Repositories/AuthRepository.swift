import Foundation

protocol AuthRepository {
    func register(email: String, password: String, displayName: String) async throws -> UserEntity
    func login(email: String, password: String) async throws -> UserEntity
    func loginWithApple() async throws -> UserEntity
    func currentUser() async throws -> UserEntity?
    func logout() throws
}
