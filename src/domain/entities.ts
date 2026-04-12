export type MessageStatus = 'sent' | 'received' | 'read' | 'delivered';
export type MessageType = 'text' | 'image' | 'audio' | 'document' | 'location';

export type User = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  lastSeen?: string;
};

export type ChatSummary = {
  id: string;
  name: string;
  avatarColor: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  participants?: string[];
  updatedAt?: string;
};

export type Message = {
  id: string;
  chatId: string;
  sender: 'me' | 'contact';
  senderId?: string;
  text: string;
  type?: MessageType;
  mediaUrl?: string;
  time: string;
  createdAt?: string;
  status: MessageStatus;
};

export type CallLog = {
  id: string;
  name: string;
  time: string;
  type: 'incoming' | 'outgoing' | 'missed';
};

export type StatusItem = {
  id: string;
  name: string;
  time: string;
  viewed: boolean;
};

export type Profile = {
  name: string;
  about: string;
  phone: string;
};

export type AuthSession = {
  userId: string;
  email: string;
  idToken: string;
  refreshToken: string;
};
