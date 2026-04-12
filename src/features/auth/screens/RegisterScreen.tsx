import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type RegisterScreenProps = {
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  error?: string | null;
};

export default function RegisterScreen({ onRegister, error }: RegisterScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await onRegister(name, email, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>

      <TextInput style={styles.input} placeholder="Nombre" value={name} onChangeText={setName} />
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
        <Text style={styles.primaryButtonText}>{submitting ? 'Creando...' : 'Crear cuenta'}</Text>
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
    marginTop: 8,
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
  error: {
    color: '#D93025',
    marginTop: -4,
  },
});
