import Foundation
import FirebaseAuth
import FirebaseFirestore

enum AuthDataSourceError: Error {
    case missingUser
}

final class FirebaseAuthDataSource {
    private let auth: Auth
    private let db: Firestore

    init(auth: Auth = Auth.auth(), db: Firestore = Firestore.firestore()) {
        self.auth = auth
        self.db = db
    }

    func register(email: String, password: String, displayName: String) async throws -> UserEntity {
        let result = try await auth.createUser(withEmail: email, password: password)
        try await result.user.sendEmailVerification()

        let user = UserEntity(
            id: result.user.uid,
            displayName: displayName,
            email: email,
            avatarURL: nil,
            isOnline: true
        )

        try db.collection("users").document(user.id).setData(from: user)
        return user
    }

    func login(email: String, password: String) async throws -> UserEntity {
        let result = try await auth.signIn(withEmail: email, password: password)
        return try await fetchUser(userID: result.user.uid)
    }

    func fetchCurrentUser() async throws -> UserEntity? {
        guard let userID = auth.currentUser?.uid else { return nil }
        return try await fetchUser(userID: userID)
    }

    func logout() throws {
        try auth.signOut()
    }

    private func fetchUser(userID: String) async throws -> UserEntity {
        let snapshot = try await db.collection("users").document(userID).getDocument()
        guard let user = try snapshot.data(as: UserEntity?.self) else {
            throw AuthDataSourceError.missingUser
        }
        return user
    }
}
