import { arduinoBridge } from './arduinoBridge';

const SAVE_KEY = 'cryptocrafter.save.v1';

export interface PlayerBlock {
  hash: string;
  transactionId: string;
  status: 'unmined' | 'mined' | 'verified' | 'chained';
}

export interface GameProgress {
  block: PlayerBlock;
  miningComplete: boolean;
  verificationComplete: boolean;
  chainComplete: boolean;
  rewards: string[];
  boxUnlocked: boolean;
}

export interface SaveLocation {
  scene: string;
  data?: Record<string, unknown>;
}

export interface SavedGame {
  version: 1;
  progress: GameProgress;
  location: SaveLocation;
  updatedAt: string;
}

const defaultProgress = (): GameProgress => ({
  block: {
    hash: '0000A1B2',
    transactionId: 'TX-01',
    status: 'unmined',
  },
  miningComplete: false,
  verificationComplete: false,
  chainComplete: false,
  rewards: [],
  boxUnlocked: false,
});

export const progress = defaultProgress();
let currentLocation: SaveLocation = { scene: 'MainMenuScene' };
let saveActive = false;

export function resetProgress() {
  const fresh = defaultProgress();
  progress.block = fresh.block;
  progress.miningComplete = fresh.miningComplete;
  progress.verificationComplete = fresh.verificationComplete;
  progress.chainComplete = fresh.chainComplete;
  progress.rewards = fresh.rewards;
  progress.boxUnlocked = fresh.boxUnlocked;
  currentLocation = { scene: 'MainMenuScene' };
  saveActive = false;
  removeSavedGame();
  syncHardwareState();
}

export function awardReward(reward: string) {
  if (!progress.rewards.includes(reward)) {
    progress.rewards.push(reward);
  }

  persistSavedGame();
  void arduinoBridge.sendReward(reward);
}

export function syncHardwareState() {
  persistSavedGame();
  void arduinoBridge.syncProgressState({
    miningComplete: progress.miningComplete,
    verificationComplete: progress.verificationComplete,
    chainComplete: progress.chainComplete,
    boxUnlocked: progress.boxUnlocked,
  });
}

export function loadSavedGame() {
  const saved = readSavedGame();
  if (!saved) return undefined;

  applyProgress(saved.progress);
  currentLocation = saved.location;
  saveActive = true;
  syncHardwareState();
  return saved;
}

export function getSavedGame() {
  return readSavedGame();
}

export function getSavedLocation() {
  return readSavedGame()?.location;
}

export function saveCheckpoint(location?: SaveLocation) {
  if (location) currentLocation = location;
  saveActive = true;
  persistSavedGame();
}

export function clearSavedGame() {
  removeSavedGame();
  saveActive = false;
  currentLocation = { scene: 'MainMenuScene' };
}

function applyProgress(savedProgress: GameProgress) {
  progress.block = {
    hash: savedProgress.block?.hash ?? '0000A1B2',
    transactionId: savedProgress.block?.transactionId ?? 'TX-01',
    status: savedProgress.block?.status ?? 'unmined',
  };
  progress.miningComplete = Boolean(savedProgress.miningComplete);
  progress.verificationComplete = Boolean(savedProgress.verificationComplete);
  progress.chainComplete = Boolean(savedProgress.chainComplete);
  progress.rewards = Array.isArray(savedProgress.rewards) ? [...savedProgress.rewards] : [];
  progress.boxUnlocked = Boolean(savedProgress.boxUnlocked);
}

function persistSavedGame() {
  if (!saveActive || !canUseStorage()) return;

  const saved: SavedGame = {
    version: 1,
    progress: {
      block: { ...progress.block },
      miningComplete: progress.miningComplete,
      verificationComplete: progress.verificationComplete,
      chainComplete: progress.chainComplete,
      rewards: [...progress.rewards],
      boxUnlocked: progress.boxUnlocked,
    },
    location: {
      scene: currentLocation.scene,
      data: currentLocation.data ? { ...currentLocation.data } : undefined,
    },
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
}

function readSavedGame() {
  if (!canUseStorage()) return undefined;

  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return undefined;

    const saved = JSON.parse(raw) as SavedGame;
    if (saved.version !== 1 || !saved.progress || !saved.location?.scene) return undefined;
    return saved;
  } catch {
    return undefined;
  }
}

function removeSavedGame() {
  if (!canUseStorage()) return;
  localStorage.removeItem(SAVE_KEY);
}

function canUseStorage() {
  return typeof localStorage !== 'undefined';
}
