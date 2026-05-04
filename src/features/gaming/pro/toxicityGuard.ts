const banned = ['idiota', 'noob', 'toxico'];
export function hasToxicText(value: string): boolean { return banned.some((w) => value.toLowerCase().includes(w)); }
