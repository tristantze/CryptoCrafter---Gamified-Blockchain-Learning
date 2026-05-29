import Phaser from 'phaser';
import { arduinoBridge } from './arduinoBridge';
import { assetKeys, createSharedAnimations, loadGameAssets } from './assets';
import { awardReward, progress, saveCheckpoint, syncHardwareState } from './progress';
import { addFullscreenRectangle, getLayout, setupResponsiveScene } from './responsive';
import { showRewardBadge } from './rewardBadge';

interface MineBlock {
  hash: string;
  nonce: number;
  correct: boolean;
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  prefix: Phaser.GameObjects.Text;
  progressBg: Phaser.GameObjects.Rectangle;
  progressFill: Phaser.GameObjects.Rectangle;
  container: Phaser.GameObjects.Container;
}

interface MiningRound {
  targetPrefix: string;
  energyCost: number;
  label: string;
  shuffleDelay: number;
  mineDuration: number;
}

const MINING_ROUNDS: MiningRound[] = [
  { targetPrefix: '0', energyCost: 24, label: 'Warm-up target', shuffleDelay: 1100, mineDuration: 620 },
  { targetPrefix: '00', energyCost: 30, label: 'Network target', shuffleDelay: 780, mineDuration: 820 },
  { targetPrefix: '000', energyCost: 36, label: 'Block target', shuffleDelay: 520, mineDuration: 1040 },
];

const POST_MINING_LINES = [
  {
    speaker: 'Old Man',
    text: 'There it is. Your block has proof-of-work behind it now.',
  },
  {
    speaker: 'You',
    text: 'So the village can trust it?',
  },
  {
    speaker: 'Old Man',
    text: 'Not yet. Mining proves effort, but the transaction inside still needs verification.',
  },
  {
    speaker: 'Old Man',
    text: 'Next, we check TX-01: balance, signature, and whether those coins were already spent.',
  },
];

export default class MiningScene extends Phaser.Scene {
  private holdProgress = 0;
  private energy = 0;
  private readonly maxEnergy = 100;
  private energyFill!: Phaser.GameObjects.Rectangle;
  private pick!: Phaser.GameObjects.Container;
  private minerSprite!: Phaser.GameObjects.Sprite;
  private attemptText!: Phaser.GameObjects.Text;
  private targetText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private blocks: MineBlock[] = [];
  private solved = false;
  private message?: Phaser.GameObjects.Text;
  private shuffleTimer?: Phaser.Time.TimerEvent;
  private attempts = 0;
  private roundIndex = 0;
  private finalHash = '';
  private activeBlock?: MineBlock;
  private isChargingEnergy = false;
  private movementPaused = false;
  private postMiningPanel?: Phaser.GameObjects.Container;
  private postMiningLineIndex = 0;

  constructor() {
    super('MiningScene');
  }

  init() {
    this.holdProgress = 0;
    this.energy = 0;
    this.blocks = [];
    this.solved = false;
    this.attempts = 0;
    this.roundIndex = 0;
    this.finalHash = '';
    this.activeBlock = undefined;
    this.isChargingEnergy = false;
    this.movementPaused = false;
    this.postMiningLineIndex = 0;
  }

  preload() {
    loadGameAssets(this, ['mainCharIdle', 'mainCharPickSwing', 'commonOre', 'cryptoOre', 'caveBackground', 'oldManIdle', 'miningBadge']);
  }

  create() {
    setupResponsiveScene(this);
    void arduinoBridge.reportScene('MiningScene');
    saveCheckpoint({ scene: 'MiningScene' });
    this.cameras.main.setBackgroundColor('#111827');
    createSharedAnimations(this);
    this.drawFrame();
    this.generateBlocks();

    this.input.on('pointerdown', this.startEnergyCharge, this);
    this.input.on('pointerup', this.handlePointerRelease, this);
    this.input.on('pointerout', this.handlePointerRelease, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.startEnergyCharge, this);
      this.input.off('pointerdown', this.advancePostMiningDialogue, this);
      this.input.off('pointerup', this.handlePointerRelease, this);
      this.input.off('pointerout', this.handlePointerRelease, this);
      this.shuffleTimer?.remove(false);
    });

    this.shuffleTimer = this.time.addEvent({
      delay: this.currentRound().shuffleDelay,
      loop: true,
      callback: () => this.shuffleBlocks(),
    });
  }

  update(_: number, delta: number) {
    if (this.solved) return;

    if (this.isChargingEnergy && !this.activeBlock) {
      this.energy = Phaser.Math.Clamp(this.energy + delta * 0.052, 0, this.maxEnergy);
      this.energyFill.width = this.energy * 2.12;
      this.pick.angle = Phaser.Math.Between(-5, 5);
      return;
    }

    if (!this.activeBlock) return;

    const round = this.currentRound();
    this.holdProgress = Phaser.Math.Clamp(this.holdProgress + delta, 0, round.mineDuration);
    const ratio = this.holdProgress / round.mineDuration;
    this.energyFill.width = this.energy * 2.12;
    this.activeBlock.progressFill.width = ratio * 70;
    this.pick.angle = Phaser.Math.Between(-8, 8);

    if (this.holdProgress >= round.mineDuration) {
      this.resolveHeldBlock(this.activeBlock);
    }
  }

  private drawFrame() {
    const layout = getLayout(this);
    addFullscreenRectangle(this, 0x111827);
    this.add.tileSprite(
      layout.centerX,
      layout.centerY,
      layout.width,
      layout.height,
      assetKeys.caveBackground,
    )
      .setAlpha(0.55)
      .setTileScale(0.59, 0.59);
    this.add.image(180, 320, assetKeys.caveBackground)
      .setOrigin(0.5)
      .setScale(0.59);
    this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.62);
    this.add.rectangle(180, layout.centerY, 340, Math.max(612, layout.height - 28), 0x020617, 0.18).setStrokeStyle(2, 0x334155, 0.5);

    this.add.rectangle(180, 74, 328, 116, 0x020617, 0.78).setStrokeStyle(2, 0x475569);
    this.add.text(28, 26, 'Mining: proof of work', {
      color: '#f8fafc',
      fontSize: '18px',
      fontFamily: 'monospace',
    });

    this.add.text(28, 52, 'Charge energy, find the target ore, then hold to mine.', {
      color: '#cbd5e1',
      fontSize: '11px',
      fontFamily: 'monospace',
      wordWrap: { width: 304 },
    });

    this.add.text(28, 82, 'ENERGY', {
      color: '#86efac',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    this.add.rectangle(198, 88, 216, 22, 0x0f172a).setStrokeStyle(2, 0x334155);
    this.energyFill = this.add.rectangle(92, 88, 0, 14, 0x22c55e).setOrigin(0, 0.5);

    this.roundText = this.add.text(28, 115, '', {
      color: '#86efac',
      fontSize: '10px',
      fontFamily: 'monospace',
    });

    this.targetText = this.add.text(188, 115, '', {
      color: '#facc15',
      fontSize: '10px',
      fontFamily: 'monospace',
    });

    this.attemptText = this.add.text(292, 115, 'Try 0', {
      color: '#93c5fd',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    this.minerSprite = this.add.sprite(-8, 12, assetKeys.mainCharIdle, 0)
      .setOrigin(0.5, 1)
      .setScale(1.7)
      .play('main-char-idle');
    this.pick = this.add.container(180, 556, [this.minerSprite]).setDepth(4);

    const hintY = Math.min(622, layout.safeBottom - 8);
    this.add.rectangle(180, hintY, 318, 28, 0x020617, 0.78).setStrokeStyle(2, 0x334155);
    this.add.text(180, hintY, 'Hold empty cave space to charge energy.', {
      color: '#cbd5e1',
      fontSize: '11px',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 260 },
    }).setOrigin(0.5).setDepth(5);
  }

  private generateBlocks() {
    this.blocks.forEach((block) => block.container.destroy(true));
    this.blocks = [];
    this.activeBlock = undefined;
    this.movementPaused = false;

    const round = this.currentRound();
    const correctIndex = Phaser.Math.Between(0, 8);
    this.targetText.setText(`Target: ${round.targetPrefix}...`);
    this.roundText.setText(`Round ${this.roundIndex + 1}/${MINING_ROUNDS.length}: ${round.label}`);
    this.resetShuffleTimer();

    for (let index = 0; index < 9; index += 1) {
      const correct = index === correctIndex;
      const nonce = Phaser.Math.Between(1000, 9999);
      const hash = correct ? this.randomValidHash(round.targetPrefix) : this.randomInvalidHash(round.targetPrefix);
      const x = 80 + (index % 3) * 100;
      const y = 190 + Math.floor(index / 3) * 92;

      const box = this.add.rectangle(0, 0, 82, 78, 0x111827, 0.92).setStrokeStyle(2, 0x475569);
      const rock = this.add.image(0, -6, correct ? assetKeys.cryptoOre : assetKeys.commonOre)
        .setScale(correct ? 1.28 : 1.95)
        .setAlpha(correct ? 0.82 : 0.92);
      const label = this.add.text(0, 17, hash, {
        color: '#f8fafc',
        fontSize: '12px',
        fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5);
      const prefix = this.add.text(0, -17, `nonce ${nonce}`, {
        color: '#94a3b8',
        fontSize: '10px',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const progressBg = this.add.rectangle(0, 32, 70, 8, 0x020617).setStrokeStyle(1, 0x64748b);
      const progressFill = this.add.rectangle(-35, 32, 0, 6, 0x38bdf8).setOrigin(0, 0.5);
      const container = this.add.container(x, y, [box, rock, prefix, label, progressBg, progressFill]);
      container.setSize(82, 82).setInteractive({ useHandCursor: true });

      const block = { hash, nonce, correct, box, label, prefix, progressBg, progressFill, container };
      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.startHoldingBlock(block);
      });

      this.blocks.push(block);
    }
  }

  private shuffleBlocks() {
    if (this.solved || this.activeBlock || this.movementPaused) return;

    Phaser.Utils.Array.Shuffle(this.blocks);
    this.blocks.forEach((block, index) => {
      const x = 80 + (index % 3) * 100;
      const y = 190 + Math.floor(index / 3) * 92;

      this.tweens.add({
        targets: block.container,
        x,
        y,
        duration: 360,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private resetShuffleTimer() {
    this.shuffleTimer?.remove(false);
    this.shuffleTimer = this.time.addEvent({
      delay: this.currentRound().shuffleDelay,
      loop: true,
      callback: () => this.shuffleBlocks(),
    });
  }

  private startHoldingBlock(block: MineBlock) {
    if (this.solved) return;

    this.cancelHold();
    this.stopEnergyCharge();

    const round = this.currentRound();
    if (this.energy < round.energyCost) {
      this.showMessage(`Need ${round.energyCost} energy before mining`, '#facc15');
      this.pulsePick(0xfacc15);
      return;
    }

    this.activeBlock = block;
    this.holdProgress = 0;
    block.progressFill.width = 0;
    block.box.setStrokeStyle(3, 0x38bdf8);
    this.pauseHashMovement();
    this.startMiningHold();
  }

  private resolveHeldBlock(block: MineBlock) {
    this.activeBlock = undefined;
    this.holdProgress = 0;
    this.stopMiningHold();
    this.tryMine(block);
  }

  private tryMine(block: MineBlock) {
    if (this.solved) return;

    const round = this.currentRound();

    this.attempts += 1;
    this.attemptText.setText(`Try ${this.attempts}`);
    this.energy = Phaser.Math.Clamp(this.energy - round.energyCost, 0, this.maxEnergy);
    this.energyFill.width = this.energy * 2.12;
    this.pulsePick(block.correct ? 0x86efac : 0xfca5a5);

    if (!block.correct) {
      block.box.setFillStyle(0x3b1720);
      this.cameras.main.shake(120, 0.004);
      this.showMessage(`${block.hash} fails target ${round.targetPrefix}...`, '#fecaca');
      this.time.delayedCall(280, () => {
        block.box.setFillStyle(0x1f2937).setStrokeStyle(2, 0x475569);
        block.progressFill.width = 0;
        this.resumeHashMovement();
      });
      return;
    }

    block.box.setFillStyle(0x14532d).setStrokeStyle(3, 0x86efac);
    block.label.setColor('#bbf7d0');
    block.prefix.setColor('#bbf7d0');
    this.finalHash = block.hash;

    if (this.roundIndex < MINING_ROUNDS.length - 1) {
      this.roundIndex += 1;
      this.showMessage(`Valid nonce ${block.nonce}. Target tightens.`, '#86efac');
      this.cameras.main.flash(120, 34, 197, 94);
      this.time.delayedCall(780, () => this.generateBlocks());
      return;
    }

    this.solved = true;
    progress.block.hash = this.finalHash;
    progress.block.status = 'mined';
    progress.miningComplete = true;
    awardReward('Miner Badge');
    syncHardwareState();
    saveCheckpoint({ scene: 'StoryScene', data: { stage: 'councilExterior' } });
    this.shuffleTimer?.remove(false);
    this.targetText.setText(`Target met: ${this.finalHash}`);
    this.showMessage('Proof found: Miner Badge earned', '#86efac');
    this.cameras.main.flash(180, 34, 197, 94);
    this.rewardBurst(block.container.x, block.container.y);
    this.time.delayedCall(900, () => this.startPostMiningSequence());
  }

  private startEnergyCharge() {
    if (this.activeBlock || this.solved) return;

    this.isChargingEnergy = true;
    this.tweens.add({
      targets: this.pick,
      y: 552,
      yoyo: true,
      duration: 180,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopEnergyCharge() {
    this.isChargingEnergy = false;
    this.pick.angle = 0;
    this.tweens.killTweensOf(this.pick);
    if (!this.solved) this.minerSprite.play('main-char-idle', true);
  }

  private startMiningHold() {
    this.minerSprite
      .setTexture(assetKeys.mainCharPickSwing)
      .setFrame(0)
      .play('main-char-pick-swing', true);

    this.tweens.add({
      targets: this.pick,
      y: 552,
      yoyo: true,
      duration: 180,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopMiningHold() {
    this.pick.angle = 0;
    this.tweens.killTweensOf(this.pick);
    if (!this.solved) {
      this.minerSprite
        .setTexture(assetKeys.mainCharIdle)
        .setFrame(0)
        .play('main-char-idle', true);
    }
  }

  private handlePointerRelease() {
    this.cancelHold();
    this.stopEnergyCharge();
  }

  private cancelHold() {
    if (!this.activeBlock || this.solved) return;

    this.activeBlock.progressFill.width = 0;
    this.activeBlock.box.setStrokeStyle(2, 0x475569);
    this.activeBlock = undefined;
    this.holdProgress = 0;
    this.energyFill.width = this.energy * 2.12;
    this.stopMiningHold();
    this.resumeHashMovement();
  }

  private pauseHashMovement() {
    this.movementPaused = true;
    if (this.shuffleTimer) this.shuffleTimer.paused = true;
    this.blocks.forEach((block) => this.tweens.killTweensOf(block.container));
  }

  private resumeHashMovement() {
    if (this.solved) return;
    this.movementPaused = false;
    if (this.shuffleTimer) this.shuffleTimer.paused = false;
  }

  private pulsePick(color: number) {
    const spark = this.add.circle(this.pick.x, this.pick.y - 18, 10, color, 0.85);
    this.tweens.add({
      targets: spark,
      alpha: 0,
      scale: 2,
      duration: 260,
      onComplete: () => spark.destroy(),
    });
  }

  private rewardBurst(x: number, y: number) {
    for (let index = 0; index < 10; index += 1) {
      const spark = this.add.rectangle(x, y, 6, 6, 0x86efac);
      this.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-72, 72),
        y: y + Phaser.Math.Between(-72, 72),
        alpha: 0,
        angle: Phaser.Math.Between(90, 270),
        duration: 520,
        ease: 'Sine.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private startPostMiningSequence() {
    this.message?.destroy();
    this.message = undefined;
    this.postMiningLineIndex = 0;
    this.input.off('pointerdown', this.startEnergyCharge, this);

    this.tweens.add({
      targets: this.pick,
      x: 96,
      y: 566,
      duration: 420,
      ease: 'Sine.easeInOut',
    });

    const oldManSprite = this.add.sprite(0, 0, assetKeys.oldManIdle, 0)
      .setOrigin(0.5, 1)
      .setScale(1.7)
      .play('old-man-idle');
    const oldMan = this.add.container(420, 578, [oldManSprite]).setDepth(5);

    this.tweens.add({
      targets: oldMan,
      x: 278,
      duration: 620,
      ease: 'Sine.easeInOut',
    });

    this.showPostMiningLine();
    this.input.on('pointerdown', this.advancePostMiningDialogue, this);
  }

  private advancePostMiningDialogue() {
    this.postMiningLineIndex += 1;
    if (this.postMiningLineIndex >= POST_MINING_LINES.length) {
      this.input.off('pointerdown', this.advancePostMiningDialogue, this);
      this.postMiningPanel?.destroy(true);
      showRewardBadge(
        this,
        assetKeys.miningBadge,
        'Mining Badge Earned',
        'You proved the work behind your block.',
        () => {
          this.cameras.main.fadeOut(220, 8, 13, 24);
          this.time.delayedCall(230, () => {
            saveCheckpoint({ scene: 'StoryScene', data: { stage: 'councilExterior' } });
            this.scene.start('StoryScene', { stage: 'councilExterior' });
          });
        },
      );
      return;
    }

    this.showPostMiningLine();
  }

  private showPostMiningLine() {
    const line = POST_MINING_LINES[this.postMiningLineIndex];
    this.postMiningPanel?.destroy(true);

    const layout = getLayout(this);
    const boxY = layout.safeBottom - 86;
    const dim = this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.48);
    const portrait = this.add.sprite(line.speaker === 'You' ? 84 : 276, boxY - 56, line.speaker === 'You' ? assetKeys.mainCharIdle : assetKeys.oldManIdle, 0)
      .setOrigin(0.5, 1)
      .setScale(line.speaker === 'You' ? 4.25 : 4.35)
      .play(line.speaker === 'You' ? 'main-char-idle' : 'old-man-idle');
    const box = this.add.rectangle(180, boxY, 334, 164, 0x020617, 0.96).setStrokeStyle(3, 0x38bdf8);
    const nameText = this.add.text(30, boxY - 66, line.speaker, {
      color: line.speaker === 'You' ? '#86efac' : '#facc15',
      fontSize: '14px',
      fontFamily: 'monospace',
    });
    const body = this.add.text(30, boxY - 36, line.text, {
      color: '#e2e8f0',
      fontSize: '13px',
      fontFamily: 'monospace',
      lineSpacing: 7,
      wordWrap: { width: 300 },
    });
    const hint = this.add.text(180, boxY + 66, 'Tap to continue', {
      color: '#94a3b8',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.postMiningPanel = this.add.container(0, 0, [dim, portrait, box, nameText, body, hint]).setDepth(20);
  }

  private currentRound() {
    return MINING_ROUNDS[this.roundIndex];
  }

  private randomValidHash(prefix: string) {
    return `${prefix}${this.randomHex(8 - prefix.length)}`;
  }

  private randomInvalidHash(prefix: string) {
    let hash = this.randomHex(8);
    while (hash.startsWith(prefix)) {
      hash = this.randomHex(8);
    }
    return hash;
  }

  private randomHex(length: number) {
    const chars = '0123456789ABCDEF';
    let value = '';
    for (let index = 0; index < length; index += 1) {
      value += chars[Phaser.Math.Between(0, chars.length - 1)];
    }
    return value;
  }

  private showMessage(text: string, color: string) {
    this.message?.destroy();
    this.message = this.add.text(180, 494, text, {
      color,
      backgroundColor: '#020617',
      fontSize: '12px',
      fontFamily: 'monospace',
      padding: { x: 8, y: 5 },
      align: 'center',
      wordWrap: { width: 300 },
    }).setOrigin(0.5).setDepth(8);

    this.time.delayedCall(1000, () => {
      this.message?.destroy();
      this.message = undefined;
    });
  }
}
