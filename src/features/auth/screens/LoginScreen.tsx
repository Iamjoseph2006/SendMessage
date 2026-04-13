import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type LoginScreenProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  onGoToRegister: () => void;
  error?: string | null;
};

export default function LoginScreen({ onLogin, onGoToRegister, error }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await onLogin(email, password);
    } catch {
      // El error se maneja desde el hook useAuth y se muestra vía prop `error`.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.primaryButton} disabled={submitting} onPress={handleSubmit}>
        <Text style={styles.primaryButtonText}>{submitting ? 'Ingresando...' : 'Login'}</Text>
      </Pressable>

      <Pressable onPress={onGoToRegister}>
        <Text style={styles.secondaryButtonText}>¿No tienes cuenta? Regístrate</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 14,
    color: '#123',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D0DAE6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: '#1F7AE0',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButtonText: {
    textAlign: 'center',
    color: '#1F7AE0',
    marginTop: 8,
  },
  error: {
    color: '#D93025',
    marginTop: -4,
  },
});
