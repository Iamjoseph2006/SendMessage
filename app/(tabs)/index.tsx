import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// Modelo local para cada mensaje del chat (sin base de datos por ahora).
type ChatMessage = {
  id: string;
  sender: 'me' | 'assistant';
  text: string;
  timestamp: string;
};

// Datos semilla para mostrar el flujo completo del chat desde el arranque.
const initialMessages: ChatMessage[] = [
  {
    id: 'seed-1',
    sender: 'assistant',
    text: '¡Hola! Este chat funciona en modo local, sin login y sin base de datos.',
    timestamp: '09:00',
  },
  {
    id: 'seed-2',
    sender: 'me',
    text: 'Perfecto, dejemos autenticación y BD para más adelante.',
    timestamp: '09:01',
  },
];

// Respuestas automáticas de ejemplo para simular conversación en tiempo real.
const assistantReplies = [
  'Recibido ✅ Podemos seguir con la interfaz.',
  'Genial. Ya estamos en modo MVP sin backend.',
  'Cuando quieras conectamos Firebase o la API elegida.',
  'Podemos agregar adjuntos y estados de entrega después.',
];

// Formatea la hora local para mostrarla junto a cada mensaje.
const formatHour = (date = new Date()) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export default function ChatScreen() {
  // Estado principal del chat en memoria local.
  const [messages, setMessages] = useState(initialMessages);
  const [messageText, setMessageText] = useState('');

  // Evita enviar mensajes vacíos o solo con espacios.
  const canSend = useMemo(() => messageText.trim().length > 0, [messageText]);

  // Envía un mensaje del usuario y agrega una respuesta automática.
  const handleSendMessage = () => {
    if (!canSend) return;

    const nextMessage: ChatMessage = {
      id: `me-${Date.now()}`,
      sender: 'me',
      text: messageText.trim(),
      timestamp: formatHour(),
    };

    setMessages((prev) => [...prev, nextMessage]);
    setMessageText('');

    setTimeout(() => {
      const randomReply = assistantReplies[Math.floor(Math.random() * assistantReplies.length)];
      const botMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: randomReply,
        timestamp: formatHour(),
      };

      setMessages((prev) => [...prev, botMessage]);
    }, 600);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>Chat principal</Text>
          <Text style={styles.subtitle}>MVP local · Sin login · Sin base de datos</Text>
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
                item.sender === 'me' ? styles.myBubble : styles.assistantBubble,
              ]}>
              <Text style={item.sender === 'me' ? styles.myBubbleText : styles.assistantBubbleText}>
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
            placeholderTextColor="#93a1b3"
            style={styles.composerInput}
          />
          <Pressable
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!canSend}>
            <Text style={styles.sendButtonText}>Enviar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e6ebf2',
  },
  title: {
    color: '#1a2b44',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#5f7086',
    marginTop: 4,
    fontSize: 13,
  },
  chatList: {
    flex: 1,
    backgroundColor: '#f9fbff',
  },
  chatListContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 10,
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 7,
    gap: 5,
  },
  myBubble: {
    backgroundColor: '#1f7ae0',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f2',
  },
  myBubbleText: {
    color: '#ffffff',
    fontSize: 15,
  },
  assistantBubbleText: {
    color: '#24364d',
    fontSize: 15,
  },
  bubbleTime: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: '#7a8ca4',
  },
  composerContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e6ebf2',
    backgroundColor: '#ffffff',
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1f3150',
    borderWidth: 1,
    borderColor: '#d8e1ee',
  },
  sendButton: {
    backgroundColor: '#1f7ae0',
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
