import Foundation

struct RegisterUserUseCase {
    let authRepository: AuthRepository

    func execute(email: String, password: String, displayName: String) async throws -> UserEntity {
        try await authRepository.register(email: email, password: password, displayName: displayName)
    }
}

struct LoginUserUseCase {
    let authRepository: AuthRepository

    func execute(email: String, password: String) async throws -> UserEntity {
        try await authRepository.login(email: email, password: password)
    }
}
