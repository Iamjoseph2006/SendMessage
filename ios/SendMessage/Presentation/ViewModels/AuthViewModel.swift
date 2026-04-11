import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var displayName = ""
    @Published var isRegisterMode = false
    @Published var user: UserEntity?
    @Published var errorMessage: String?

    private let registerUserUseCase: RegisterUserUseCase
    private let loginUserUseCase: LoginUserUseCase

    init(registerUserUseCase: RegisterUserUseCase, loginUserUseCase: LoginUserUseCase) {
        self.registerUserUseCase = registerUserUseCase
        self.loginUserUseCase = loginUserUseCase
    }

    func submit() async {
        do {
            if isRegisterMode {
                user = try await registerUserUseCase.execute(
                    email: email,
                    password: password,
                    displayName: displayName
                )
            } else {
                user = try await loginUserUseCase.execute(email: email, password: password)
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
