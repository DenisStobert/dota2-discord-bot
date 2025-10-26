// Dota 2 Server Regions
export const REGIONS: Record<string, number> = {
  'us-east': 1,
  'us-west': 2,
  'eu-west': 3,
  'eu-east': 4,
  'singapore': 5,
  'dubai': 6,
  'australia': 7,
  'stockholm': 8,
  'austria': 9,
  'brazil': 10,
  'southafrica': 11,
  'japan': 12,
  'chile': 13,
  'peru': 14,
  'india': 15,
};

// Dota 2 Game Modes
export const GAME_MODES: Record<string, number> = {
  'ap': 22,        // All Pick
  'allpick': 22,
  'cm': 2,         // Captain's Mode
  'captains': 2,
  'rd': 3,         // Random Draft
  'random': 3,
  'sd': 4,         // Single Draft
  'single': 4,
  'ar': 5,         // All Random
  'allrandom': 5,
  'cd': 18,        // Captain's Draft
};

export function parseRegion(input: string): number | null {
  const normalized = input.toLowerCase().trim();
  return REGIONS[normalized] || null;
}

export function parseGameMode(input: string): number | null {
  const normalized = input.toLowerCase().trim();
  return GAME_MODES[normalized] || null;
}

export function generatePassword(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getRegionName(regionId: number): string {
  const entry = Object.entries(REGIONS).find(([_, id]) => id === regionId);
  return entry ? entry[0] : 'unknown';
}

export function getGameModeName(modeId: number): string {
  const entry = Object.entries(GAME_MODES).find(([_, id]) => id === modeId);
  return entry ? entry[0] : 'unknown';
}