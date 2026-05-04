export type GamerProfile = {
  id: string;
  gamerTag: string;
  favoriteGame: string;
  rank: string;
  role: string;
  region: string;
  platform: 'PC' | 'PS5' | 'Xbox';
};

export type Squad = {
  id: string;
  name: string;
  game: string;
  neededRole: string;
  currentMembers: number;
  maxMembers: number;
};

export type GameEvent = {
  id: string;
  title: string;
  game: string;
  startsAt: string;
  mode: string;
  slots: number;
};
