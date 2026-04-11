import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type User = {
  id: string;
  name: string;
  email: string;
};

type ChatMessage = {
  id: string;
  sender: 'me' | 'other';
  text: string;
  timestamp: string;
};

const seededMessages: ChatMessage[] = [
  {
    id: 'seed-1',
    sender: 'other',
    text: '¡Bienvenido a SendMessage! Este es tu chat principal.',
    timestamp: '09:00',
  },
  {
    id: 'seed-2',
    sender: 'me',
    text: 'Perfecto 🚀 Empecemos con el MVP.',
    timestamp: '09:01',
  },
];

const automatedReplies = [
  'Te respondo en tiempo real ✅',
  'Recibido. Manteniendo todo rápido y fluido.',
  'Muy buena idea. ¿Lo pasamos a canal o grupo?',
  'Podemos mejorar esto con IA para respuestas sugeridas.',
];

const formatHour = (date = new Date()) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export default function SendMessageMvpScreen() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState(seededMessages);

  const canSubmitAuth = useMemo(() => {
    if (isRegisterMode) {
      return name.trim().length >= 2 && email.includes('@') && password.length >= 6;
    }

    return email.includes('@') && password.length >= 6;
  }, [email, isRegisterMode, name, password]);

  const handleAuth = () => {
    if (!canSubmitAuth) return;

    const displayName = isRegisterMode ? name.trim() : email.split('@')[0];

    setUser({
      id: `user-${Date.now()}`,
      name: displayName,
      email,
    });

    setPassword('');
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const nextMessage: ChatMessage = {
      id: `me-${Date.now()}`,
      sender: 'me',
      text: messageText.trim(),
      timestamp: formatHour(),
    };

    setMessages((prev) => [...prev, nextMessage]);
    setMessageText('');

    setTimeout(() => {
      const randomReply = automatedReplies[Math.floor(Math.random() * automatedReplies.length)];
      const botMessage: ChatMessage = {
        id: `other-${Date.now()}`,
        sender: 'other',
        text: randomReply,
        timestamp: formatHour(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 800);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.authSafeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.authContainer}>
          <Text style={styles.appLabel}>SendMessage</Text>
          <Text style={styles.authTitle}>{isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
          <Text style={styles.authSubtitle}>
            Comunicación moderna, rápida y segura con estilo iOS.
          </Text>

          {isRegisterMode && (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nombre"
              placeholderTextColor="#8ca8d9"
              style={styles.input}
            />
          )}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#8ca8d9"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            secureTextEntry
            placeholderTextColor="#8ca8d9"
            style={styles.input}
          />

          <Pressable
            style={[styles.primaryButton, !canSubmitAuth && styles.disabledButton]}
            onPress={handleAuth}
            disabled={!canSubmitAuth}>
            <Text style={styles.primaryButtonText}>{isRegisterMode ? 'Crear cuenta' : 'Entrar'}</Text>
          </Pressable>

          <Pressable onPress={() => setIsRegisterMode((prev) => !prev)}>
            <Text style={styles.linkText}>
              {isRegisterMode ? 'Ya tengo cuenta' : 'Quiero registrarme'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.chatSafeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.chatKeyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.chatHeader}>
          <View>
            <Text style={styles.chatTitle}>Chat principal</Text>
            <Text style={styles.chatSubtitle}>{user.name} · En línea</Text>
          </View>
          <Pressable onPress={() => setUser(null)}>
            <Text style={styles.linkText}>Salir</Text>
          </Pressable>
        </View>

        <FlatList
          style={styles.chatList}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatListContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.sender === 'me' ? styles.myBubble : styles.otherBubble,
              ]}>
              <Text style={item.sender === 'me' ? styles.myBubbleText : styles.otherBubbleText}>
                {item.text}
              </Text>
              <Text style={styles.bubbleTime}>{item.timestamp}</Text>
            </View>
          )}
        />

        <View style={styles.composerContainer}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#6d8ec2"
            style={styles.composerInput}
          />
          <Pressable style={styles.sendButton} onPress={handleSendMessage}>
            <Text style={styles.sendButtonText}>Enviar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authSafeArea: {
    flex: 1,
    backgroundColor: '#0a3b82',
  },
  authContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 12,
  },
  appLabel: {
    color: '#bcd4ff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  authTitle: {
    color: 'white',
    fontSize: 30,
    fontWeight: '700',
  },
  authSubtitle: {
    color: '#cddcff',
    marginBottom: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#194b97',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2f63b4',
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#57a2ff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#083164',
    fontWeight: '700',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  linkText: {
    color: '#b9d3ff',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  chatSafeArea: {
    flex: 1,
    backgroundColor: '#0a3b82',
  },
  chatKeyboardView: {
    flex: 1,
  },
  chatHeader: {
    backgroundColor: '#114890',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2c5faa',
  },
  chatTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  chatSubtitle: {
    color: '#b7d0ff',
    marginTop: 4,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 12,
    paddingVertical: 18,
    gap: 10,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 7,
    gap: 5,
  },
  myBubble: {
    backgroundColor: '#57a2ff',
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: '#f1f5ff',
    alignSelf: 'flex-start',
  },
  myBubbleText: {
    color: '#073061',
    fontSize: 15,
  },
  otherBubbleText: {
    color: '#17396b',
    fontSize: 15,
  },
  bubbleTime: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: '#4a6c9f',
  },
  composerContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2f63b4',
    backgroundColor: '#114890',
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#f6f9ff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1f3150',
  },
  sendButton: {
    backgroundColor: '#57a2ff',
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sendButtonText: {
    color: '#0b2e5d',
    fontWeight: '700',
  },
});
