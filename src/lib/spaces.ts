const STORAGE_KEY = "simple-share-spaces";
const MAX_ANONYMOUS_SPACES = 3;

export interface StoredSpace {
  spaceId: string;
  name: string;
  createdAt: number;
  expiresAt: number;
}

export function getStoredSpaces(): StoredSpace[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const spaces: StoredSpace[] = JSON.parse(stored);
    // Filter out expired spaces
    const now = Date.now();
    return spaces.filter((s) => s.expiresAt > now);
  } catch {
    return [];
  }
}

export function saveSpace(space: StoredSpace): void {
  const spaces = getStoredSpaces();
  // Check if already exists
  const existingIndex = spaces.findIndex((s) => s.spaceId === space.spaceId);
  if (existingIndex >= 0) {
    spaces[existingIndex] = space;
  } else {
    spaces.push(space);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spaces));
}

export function removeSpace(spaceId: string): void {
  const spaces = getStoredSpaces();
  const filtered = spaces.filter((s) => s.spaceId !== spaceId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function canCreateSpace(): boolean {
  const spaces = getStoredSpaces();
  return spaces.length < MAX_ANONYMOUS_SPACES;
}

export function getSpaceCount(): number {
  return getStoredSpaces().length;
}
