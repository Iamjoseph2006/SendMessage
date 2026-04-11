import SwiftUI

struct AuthView: View {
    @StateObject var viewModel: AuthViewModel

    var body: some View {
        VStack(spacing: 16) {
            Text("SendMessage")
                .font(.largeTitle.bold())

            if viewModel.isRegisterMode {
                TextField("Nombre", text: $viewModel.displayName)
                    .textFieldStyle(.roundedBorder)
            }

            TextField("Email", text: $viewModel.email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .textFieldStyle(.roundedBorder)

            SecureField("Contraseña", text: $viewModel.password)
                .textFieldStyle(.roundedBorder)

            Button(viewModel.isRegisterMode ? "Crear cuenta" : "Entrar") {
                Task { await viewModel.submit() }
            }
            .buttonStyle(.borderedProminent)
            .tint(.blue)

            Button(viewModel.isRegisterMode ? "Ya tengo cuenta" : "Quiero registrarme") {
                viewModel.isRegisterMode.toggle()
            }
            .foregroundStyle(.blue)

            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundStyle(.red)
                    .font(.footnote)
            }
        }
        .padding(24)
        .background(Color.white)
    }
}
