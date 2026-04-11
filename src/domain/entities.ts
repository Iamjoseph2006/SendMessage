export type MessageStatus = 'sent' | 'received' | 'read';

export type ChatSummary = {
  id: string;
  name: string;
  avatarColor: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
};

export type Message = {
  id: string;
  chatId: string;
  sender: 'me' | 'contact';
  text: string;
  time: string;
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
