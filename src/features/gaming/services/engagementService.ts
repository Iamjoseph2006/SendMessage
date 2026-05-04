export type DailyMission = {
  id: string;
  title: string;
  reward: string;
};

const MISSIONS: DailyMission[] = [
  { id: 'm1', title: 'Juega 2 partidas con squad', reward: '+20 XP social' },
  { id: 'm2', title: 'Envía 3 invitaciones de team-up', reward: '+15 reputación' },
  { id: 'm3', title: 'Completa 1 evento sin abandono', reward: 'Badge Consistente' },
  { id: 'm4', title: 'Da feedback a 2 compañeros', reward: '+10 karma' },
];

export function getDailyMissions(seed: number, count = 2): DailyMission[] {
  const picked: DailyMission[] = [];
  let cursor = seed % MISSIONS.length;

  while (picked.length < Math.min(count, MISSIONS.length)) {
    const candidate = MISSIONS[cursor];
    if (!picked.find((m) => m.id === candidate.id)) picked.push(candidate);
    cursor = (cursor + 1) % MISSIONS.length;
  }

  return picked;
}
