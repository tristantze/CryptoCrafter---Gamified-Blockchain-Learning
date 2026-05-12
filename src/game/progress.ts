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

export function resetProgress() {
  const fresh = defaultProgress();
  progress.block = fresh.block;
  progress.miningComplete = fresh.miningComplete;
  progress.verificationComplete = fresh.verificationComplete;
  progress.chainComplete = fresh.chainComplete;
  progress.rewards = fresh.rewards;
  progress.boxUnlocked = fresh.boxUnlocked;
}

export function awardReward(reward: string) {
  if (!progress.rewards.includes(reward)) {
    progress.rewards.push(reward);
  }
}
