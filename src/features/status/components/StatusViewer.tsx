import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StatusComment,
  StatusItem,
  addStatusComment,
  createNotification,
  deleteStatus,
  getStatusesByUser,
  listenStatusComments,
  markStatusAsViewed,
  toggleStatusLike,
} from '@/src/features/status/services/statusService';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { createOrGetChat, sendMessagePayload } from '@/src/features/chat/services/chatService';
import { UserProfile, getUsersByUids } from '@/src/features/users/services/userService';

export function StatusViewer({ userId, initialStatusId, ownerMode = false }: { userId: string; initialStatusId?: string; ownerMode?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [index, setIndex] = useState(0);
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<StatusComment[]>([]);

  useEffect(() => {
    getStatusesByUser(userId).then((items) => {
      setStatuses(items);
      if (initialStatusId) {
        const idx = items.findIndex((item) => item.id === initialStatusId);
        if (idx >= 0) setIndex(idx);
      }
    }).catch(() => setStatuses([]));
    getUsersByUids([userId]).then(([owner]) => setOwnerProfile(owner ?? null)).catch(() => setOwnerProfile(null));
  }, [initialStatusId, userId]);

  const current = useMemo(() => statuses[index] ?? null, [statuses, index]);

  useEffect(() => {
    if (!current?.id || !user?.uid) return;
    markStatusAsViewed(current.id, user.uid).catch(() => undefined);
  }, [current?.id, user?.uid]);

  useEffect(() => {
    if (!current?.id) return;
    return listenStatusComments(current.id, setComments);
  }, [current?.id]);

  const onComment = async () => {
    if (!user?.uid || !current?.id || !commentText.trim()) return;
    await addStatusComment(current.id, user.uid, commentText);
    if (!ownerMode) {
      const chatId = await createOrGetChat(user.uid, userId);
      await sendMessagePayload(chatId, {
        senderId: user.uid,
        text: `💬 ${commentText.trim()}`,
        replyTo: { id: current.id, senderId: current.userId, text: current.content || 'Estado', type: 'text' },
      });
      if (current.userId !== user.uid) {
        await createNotification(current.userId, 'status_reply', user.uid, { statusId: current.id, text: commentText.trim() });
      }
    }
    setCommentText('');
  };

  if (!current) {
    return <SafeAreaView style={styles.safeArea}><Text style={styles.empty}>No hay estados para mostrar.</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="close" color="#FFF" size={24} /></Pressable>
        <View style={styles.ownerWrap}>
          <Text style={styles.headerTitle}>{ownerMode ? 'Mi estado' : ownerProfile?.name ?? ownerProfile?.email ?? 'Estado'}</Text>
          <Text style={styles.headerHint}>{ownerMode ? 'Administrador' : 'Visor'}</Text>
        </View>
        {ownerMode && current?.id ? <Pressable onPress={() => deleteStatus(current.id).then(() => router.back())}><Ionicons name="trash-outline" size={22} color="#FF9B99" /></Pressable> : null}
      </View>

      <View style={styles.progressWrap}>{statuses.map((item, idx) => <View key={item.id} style={[styles.progressBar, idx <= index ? styles.progressActive : null]} />)}</View>

      <View style={[styles.viewerBody, { backgroundColor: current.backgroundColor ?? '#000' }]}>
        {current.imageUri ? <Image source={{ uri: current.imageUri }} style={styles.image} resizeMode="cover" /> : null}
        {!!current.content && <Text style={styles.content}>{current.content}</Text>}
        {current.location ? <Text style={styles.meta}>📍 {current.location.label ?? `${current.location.latitude.toFixed(4)}, ${current.location.longitude.toFixed(4)}`}</Text> : null}
        {current.audioUri ? <Text style={styles.meta}>🎤 Audio adjunto</Text> : null}
      </View>

      <View style={styles.controls}>
        <Pressable disabled={index <= 0} onPress={() => setIndex((prev) => Math.max(0, prev - 1))}><Ionicons name="chevron-back-circle" color={index <= 0 ? '#64758B' : '#FFFFFF'} size={38} /></Pressable>
        <Pressable style={styles.likeButton} onPress={async () => {
          if (!user?.uid || !current?.id) return;
          const alreadyLiked = current.likesBy?.includes(user.uid);
          await toggleStatusLike(current.id, user.uid, !alreadyLiked);
        }}>
          <Ionicons name={current.likesBy?.includes(user?.uid ?? '') ? 'heart' : 'heart-outline'} color="#FFF" size={20} />
          <Text style={styles.likeText}>{current.likesBy?.length ?? 0}</Text>
        </Pressable>
        <Pressable disabled={index >= statuses.length - 1} onPress={() => setIndex((prev) => Math.min(statuses.length - 1, prev + 1))}><Ionicons name="chevron-forward-circle" color={index >= statuses.length - 1 ? '#64758B' : '#FFFFFF'} size={38} /></Pressable>
      </View>

      <View style={styles.commentWrap}>
        <View style={styles.commentList}>{comments.slice(-3).map((comment) => <Text key={comment.id} style={styles.commentItem} numberOfLines={1}>{comment.text}</Text>)}</View>
        <View style={styles.commentComposer}>
          <TextInput value={commentText} onChangeText={setCommentText} placeholder={ownerMode ? 'Escribe una nota...' : 'Responder estado...'} placeholderTextColor="#A8B9CC" style={styles.commentInput} />
          <Pressable onPress={onComment} disabled={!commentText.trim()}><Ionicons name="send" size={20} color={commentText.trim() ? '#FFF' : '#6B7F98'} /></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  empty: { color: '#FFF', textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10 },
  ownerWrap: { flex: 1 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  headerHint: { color: '#A8BDD8', fontSize: 12 },
  progressWrap: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 12 },
  progressBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#3A4B60' },
  progressActive: { backgroundColor: '#FFFFFF' },
  viewerBody: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 10 },
  image: { width: '100%', height: '70%', borderRadius: 12 },
  content: { color: '#FFF', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  meta: { color: '#D1E3FA' },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  likeButton: { backgroundColor: '#1F2D3D', borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  likeText: { color: '#FFF', fontWeight: '700' },
  commentWrap: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  commentList: { gap: 4 },
  commentItem: { color: '#E8F0FA', fontSize: 12 },
  commentComposer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#182532', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  commentInput: { flex: 1, color: '#FFFFFF', fontSize: 14, paddingVertical: 3 },
});
