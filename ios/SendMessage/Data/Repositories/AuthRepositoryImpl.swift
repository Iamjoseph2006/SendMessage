import Foundation

final class AuthRepositoryImpl: AuthRepository {
    private let dataSource: FirebaseAuthDataSource

    init(dataSource: FirebaseAuthDataSource) {
        self.dataSource = dataSource
    }

    func register(email: String, password: String, displayName: String) async throws -> UserEntity {
        try await dataSource.register(email: email, password: password, displayName: displayName)
    }

    func login(email: String, password: String) async throws -> UserEntity {
        try await dataSource.login(email: email, password: password)
    }

    func loginWithApple() async throws -> UserEntity {
        throw NSError(domain: "SendMessage", code: -1001, userInfo: [NSLocalizedDescriptionKey: "Login con Apple pendiente de implementación"])
    }

    func currentUser() async throws -> UserEntity? {
        try await dataSource.fetchCurrentUser()
    }

    func logout() throws {
        try dataSource.logout()
    }
}
