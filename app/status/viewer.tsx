import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import {
  StatusComment,
  StatusItem,
  addStatusComment,
  getStatusesByUser,
  listenStatusComments,
  markStatusAsViewed,
} from '@/src/features/status/services/statusService';
import { createOrGetChat } from '@/src/features/chat/services/chatService';
import { UserProfile, getUsersByUids } from '@/src/features/users/services/userService';

export default function StatusViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string | string[] }>();
  const normalizedUserId = Array.isArray(userId) ? userId[0] : userId;
  const { user } = useAuth();
  const router = useRouter();
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [index, setIndex] = useState(0);
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<StatusComment[]>([]);

  useEffect(() => {
    if (!normalizedUserId) return;

    getStatusesByUser(normalizedUserId).then(setStatuses).catch(() => setStatuses([]));
    getUsersByUids([normalizedUserId])
      .then(([owner]) => setOwnerProfile(owner ?? null))
      .catch(() => setOwnerProfile(null));
  }, [normalizedUserId]);

  useEffect(() => {
    const current = statuses[index];
    if (current?.id && user?.uid) {
      markStatusAsViewed(current.id, user.uid).catch(() => undefined);
    }
  }, [index, statuses, user?.uid]);

  const current = useMemo(() => statuses[index] ?? null, [statuses, index]);

  useEffect(() => {
    if (!current?.id) {
      return;
    }

    return listenStatusComments(current.id, (nextComments) => setComments(nextComments));
  }, [current?.id]);

  const openChatWithOwner = async () => {
    if (!user?.uid || !normalizedUserId) {
      return;
    }

    const chatId = await createOrGetChat(user.uid, normalizedUserId);
    router.push(`/chat/${chatId}`);
  };

  const onComment = async () => {
    if (!user?.uid || !current?.id || !commentText.trim()) {
      return;
    }

    await addStatusComment(current.id, user.uid, commentText);
    setCommentText('');
  };

  if (!current) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.empty}>No hay estados para mostrar.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" color="#FFF" size={24} />
        </Pressable>
        <Pressable style={styles.ownerWrap} onPress={openChatWithOwner}>
          {ownerProfile?.photoURL ? <Image source={{ uri: ownerProfile.photoURL }} style={styles.ownerAvatar} /> : null}
          <Text style={styles.headerTitle}>{ownerProfile?.name ?? ownerProfile?.email ?? 'Estado'}</Text>
        </Pressable>
      </View>

      <View style={styles.progressWrap}>
        {statuses.map((item, idx) => (
          <View key={item.id} style={[styles.progressBar, idx <= index ? styles.progressActive : null]} />
        ))}
      </View>

      <View style={[styles.viewerBody, { backgroundColor: current.backgroundColor ?? '#000' }]}>
        {current.imageUri ? <Image source={{ uri: current.imageUri }} style={styles.image} resizeMode="cover" /> : null}
        {!!current.content && <Text style={styles.content}>{current.content}</Text>}
        {current.location ? <Text style={styles.meta}>📍 {current.location.label ?? `${current.location.latitude.toFixed(4)}, ${current.location.longitude.toFixed(4)}`}</Text> : null}
        {current.audioUri ? <Text style={styles.meta}>🎤 Estado con audio</Text> : null}
      </View>

      <View style={styles.controls}>
        <Pressable disabled={index <= 0} onPress={() => setIndex((prev) => Math.max(0, prev - 1))}>
          <Ionicons name="chevron-back-circle" color={index <= 0 ? '#64758B' : '#FFFFFF'} size={38} />
        </Pressable>
        <Pressable disabled={index >= statuses.length - 1} onPress={() => setIndex((prev) => Math.min(statuses.length - 1, prev + 1))}>
          <Ionicons name="chevron-forward-circle" color={index >= statuses.length - 1 ? '#64758B' : '#FFFFFF'} size={38} />
        </Pressable>
      </View>
      <View style={styles.commentWrap}>
        <View style={styles.commentList}>
          {comments.slice(-3).map((comment) => (
            <Text key={comment.id} style={styles.commentItem} numberOfLines={1}>
              {comment.text}
            </Text>
          ))}
        </View>
        <View style={styles.commentComposer}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Responder estado..."
            placeholderTextColor="#A8B9CC"
            style={styles.commentInput}
          />
          <Pressable onPress={onComment} disabled={!commentText.trim()}>
            <Ionicons name="send" size={20} color={commentText.trim() ? '#FFF' : '#6B7F98'} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  empty: { color: '#FFF', textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10 },
  ownerWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  ownerAvatar: { width: 32, height: 32, borderRadius: 16 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  progressWrap: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 12 },
  progressBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#3A4B60' },
  progressActive: { backgroundColor: '#FFFFFF' },
  viewerBody: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 10 },
  image: { width: '100%', height: '70%', borderRadius: 12 },
  content: { color: '#FFF', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  meta: { color: '#D7E2EF', fontSize: 14 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 30 },
  commentWrap: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  commentList: { gap: 4 },
  commentItem: { color: '#E8F0FA', fontSize: 12 },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#182532',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  commentInput: { flex: 1, color: '#FFFFFF', fontSize: 14, paddingVertical: 3 },
});
