import { CallLog, ChatSummary, Message, Profile, StatusItem } from '@/src/domain/entities';

export const chatSummaries: ChatSummary[] = [
  {
    id: 'c1',
    name: 'María López',
    avatarColor: '#CFE7FF',
    lastMessage: 'Perfecto, te escribo al salir.',
    time: '10:45',
    unreadCount: 2,
  },
  {
    id: 'c2',
    name: 'Equipo Diseño',
    avatarColor: '#DDF5E5',
    lastMessage: 'Subí los nuevos mockups al drive.',
    time: '09:20',
    unreadCount: 0,
  },
  {
    id: 'c3',
    name: 'Carlos',
    avatarColor: '#FFE8CF',
    lastMessage: '¿Nos vemos mañana?',
    time: 'Ayer',
    unreadCount: 0,
  },
];

export const chatMessagesByChatId: Record<string, Message[]> = {
  c1: [
    { id: 'm1', chatId: 'c1', sender: 'contact', text: '¡Hola! ¿Cómo va todo?', time: '10:40', status: 'read' },
    { id: 'm2', chatId: 'c1', sender: 'me', text: 'Todo bien 😊 ¿y tú?', time: '10:42', status: 'read' },
    { id: 'm3', chatId: 'c1', sender: 'contact', text: 'Perfecto, te escribo al salir.', time: '10:45', status: 'received' },
  ],
  c2: [
    { id: 'm4', chatId: 'c2', sender: 'contact', text: 'Subí los nuevos mockups al drive.', time: '09:20', status: 'received' },
  ],
  c3: [
    { id: 'm5', chatId: 'c3', sender: 'contact', text: '¿Nos vemos mañana?', time: 'Ayer', status: 'received' },
  ],
};

export const callLogs: CallLog[] = [
  { id: 'cl1', name: 'María López', time: 'Hoy, 11:05', type: 'incoming' },
  { id: 'cl2', name: 'Carlos', time: 'Hoy, 09:32', type: 'missed' },
  { id: 'cl3', name: 'Equipo Diseño', time: 'Ayer, 18:40', type: 'outgoing' },
];

export const statusItems: StatusItem[] = [
  { id: 's1', name: 'María López', time: 'Hace 5 min', viewed: false },
  { id: 's2', name: 'Ana', time: 'Hace 20 min', viewed: false },
  { id: 's3', name: 'Carlos', time: 'Hoy, 08:14', viewed: true },
];

export const profileData: Profile = {
  name: 'Tu Nombre',
  about: 'Disponible para conversar',
  phone: '+1 555 0134',
};
