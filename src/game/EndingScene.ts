import Phaser from 'phaser';
import { arduinoBridge } from './arduinoBridge';
import { assetKeys, createSharedAnimations, loadGameAssets } from './assets';
import { clearSavedGame, progress, resetProgress, saveCheckpoint, syncHardwareState } from './progress';
import { addCoverImage, addFullscreenRectangle, getLayout, setupResponsiveScene } from './responsive';

interface EndingLine {
  speaker: 'Old Man' | 'Blacksmith' | 'You';
  text: string;
}

const endingLines: EndingLine[] = [
  {
    speaker: 'Old Man',
    text: 'There it is. You mined a block by doing real work, not by wishing very hard.',
  },
  {
    speaker: 'You',
    text: 'Then the council checked the payment inside: enough coins, real approval, no spending twice.',
  },
  {
    speaker: 'Blacksmith',
    text: 'And at the forge, you linked your block to the chain. A tidy job. Barely any smoke.',
  },
  {
    speaker: 'Old Man',
    text: 'That is the idea: work, checking, agreement, then a chain that remembers what happened.',
  },
];

export default class EndingScene extends Phaser.Scene {
  private lineIndex = 0;
  private dialogueLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('EndingScene');
  }

  preload() {
    loadGameAssets(this, [
      'mainMenuBackgroundExtended',
      'mainCharIdle',
      'oldManIdle',
      'blacksmithIdleFront',
    ]);
  }

  create() {
    setupResponsiveScene(this);
    void arduinoBridge.reportScene('EndingScene');
    saveCheckpoint({ scene: 'EndingScene' });
    syncHardwareState();
    this.cameras.main.setBackgroundColor('#0f172a');
    createSharedAnimations(this);

    this.drawBackground();
    this.drawCast();
    this.rewardGlints();
    this.showEndingLine();

    this.input.on('pointerdown', this.advanceDialogue, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.advanceDialogue, this);
    });
  }

  private drawBackground() {
    addFullscreenRectangle(this, 0x0f172a);
    addCoverImage(this, assetKeys.mainMenuBackgroundExtended);
    const layout = getLayout(this);
    this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.48);
  }

  private drawCast() {
    const layout = getLayout(this);
    const castY = Math.min(510, layout.safeBottom - 118);
    const ground = this.add.ellipse(180, castY, 230, 28, 0x020617, 0.34);
    const oldMan = this.add.sprite(118, castY, assetKeys.oldManIdle, 0)
      .setOrigin(0.5, 1)
      .setScale(2.55)
      .play('old-man-idle');
    const miner = this.add.sprite(180, castY + 4, assetKeys.mainCharIdle, 0)
      .setOrigin(0.5, 1)
      .setScale(2.85)
      .play('main-char-idle');
    const blacksmith = this.add.sprite(244, castY, assetKeys.blacksmithIdleFront, 0)
      .setOrigin(0.5, 1)
      .setScale(2.62)
      .play('blacksmith-idle-front');

    this.tweens.add({
      targets: [oldMan, miner, blacksmith],
      y: '-=7',
      yoyo: true,
      repeat: -1,
      duration: 1050,
      ease: 'Sine.easeInOut',
    });

    this.add.container(0, 0, [ground, oldMan, miner, blacksmith]);
  }

  private showEndingLine() {
    this.dialogueLayer?.destroy(true);
    const layout = getLayout(this);
    const line = endingLines[this.lineIndex];
    const boxY = layout.safeBottom - 92;

    const box = this.add.rectangle(180, boxY, 334, 172, 0x020617, 0.96).setStrokeStyle(3, this.speakerColor(line.speaker));
    const title = this.add.text(30, boxY - 70, line.speaker, {
      color: this.speakerTextColor(line.speaker),
      fontSize: '14px',
      fontFamily: 'monospace',
    });
    const body = this.add.text(30, boxY - 38, line.text, {
      color: '#e2e8f0',
      fontSize: '13px',
      fontFamily: 'monospace',
      lineSpacing: 7,
      wordWrap: { width: 300 },
    });
    const hint = this.add.text(180, boxY + 72, 'Tap to continue', {
      color: '#94a3b8',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.dialogueLayer = this.add.container(0, 0, [box, title, body, hint]).setDepth(20);
  }

  private advanceDialogue() {
    if (this.lineIndex < endingLines.length - 1) {
      this.lineIndex += 1;
      this.showEndingLine();
      return;
    }

    this.input.off('pointerdown', this.advanceDialogue, this);
    this.dialogueLayer?.destroy(true);
    this.dialogueLayer = undefined;
    this.drawSummary();
    this.drawActions();
  }

  private drawSummary() {
    const chestUnlocked = this.unlockPrizeChestIfConnected();
    const layout = getLayout(this);
    const panelY = Math.max(layout.safeTop + 154, 172);
    const panel = this.add.rectangle(180, panelY, 320, 254, 0x020617, 0.95)
      .setStrokeStyle(3, 0x86efac, 0.72);
    const headerY = panelY - 98;

    this.add.text(180, headerY, 'First Block Complete', {
      color: '#f8fafc',
      fontSize: '20px',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(180, headerY + 28, 'Your transaction is mined, checked, and chained.', {
      color: '#bae6fd',
      fontSize: '10px',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 278 },
    }).setOrigin(0.5);

    const rows = [
      ['Mining', 'Work completed'],
      ['Verification', 'Payment approved'],
      ['Chain', 'Block linked'],
      ['Reward', progress.rewards.length > 0 ? `${progress.rewards.length} reward recorded` : 'No reward recorded'],
      ['Prize Chest', chestUnlocked ? 'Unlocked successfully' : 'Not connected'],
    ];

    rows.forEach(([label, value], index) => {
      const y = panelY - 42 + index * 31;
      this.add.rectangle(180, y, 284, 24, index % 2 === 0 ? 0x0f172a : 0x111827, 0.86);
      this.add.text(48, y, label, {
        color: '#94a3b8',
        fontSize: '10px',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.add.text(312, y, value, {
        color: label === 'Prize Chest' && chestUnlocked ? '#86efac' : '#e2e8f0',
        fontSize: '10px',
        fontFamily: 'monospace',
        align: 'right',
        wordWrap: { width: 156 },
      }).setOrigin(1, 0.5);
    });

    if (chestUnlocked) {
      this.add.text(180, panel.getBottomCenter().y + 18, 'Prize Chest opened', {
        color: '#052e16',
        fontSize: '11px',
        fontFamily: 'monospace',
        backgroundColor: '#86efac',
        padding: { x: 9, y: 5 },
      }).setOrigin(0.5);
    }

    this.add.text(180, panel.getBottomCenter().y - 16, 'Thanks for crafting the chain.', {
      color: '#cbd5e1',
      fontSize: '11px',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);
  }

  private unlockPrizeChestIfConnected() {
    const shouldUnlock = progress.chainComplete && arduinoBridge.getState().status === 'connected';
    progress.boxUnlocked = shouldUnlock;
    if (shouldUnlock) {
      syncHardwareState();
    } else {
      saveCheckpoint({ scene: 'EndingScene' });
    }

    return shouldUnlock;
  }

  private drawActions() {
    const layout = getLayout(this);
    this.createActionButton(180, layout.safeBottom - 84, 'Return Home', 0xf8b84e, '#3b2106', () => {
      clearSavedGame();
      this.scene.start('MainMenuScene');
    }, 218);

    this.createActionButton(180, layout.safeBottom - 26, 'Play Again', 0x7ccf3f, '#17340f', () => {
      resetProgress();
      saveCheckpoint({ scene: 'StoryScene', data: { stage: 'intro' } });
      this.scene.start('StoryScene', { stage: 'intro' });
    }, 192);
  }

  private createActionButton(
    x: number,
    y: number,
    label: string,
    color: number,
    textColor: string,
    callback: () => void,
    width: number,
  ) {
    const group = this.add.container(0, 0);
    const shadow = this.add.rectangle(x + 4, y + 5, width + 4, 46, 0x020617, 0.36);
    const button = this.add.rectangle(x, y, width, 44, color).setStrokeStyle(3, 0xffffff, 0.34);
    const text = this.add.text(x, y, label, {
      color: textColor,
      fontSize: '15px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    button.setInteractive({ useHandCursor: true });
    text.setInteractive({ useHandCursor: true });
    button.on('pointerdown', callback);
    text.on('pointerdown', callback);
    button.on('pointerover', () => group.setScale(1.025));
    button.on('pointerout', () => group.setScale(1));
    group.add([shadow, button, text]);
  }

  private rewardGlints() {
    const layout = getLayout(this);
    for (let index = 0; index < 18; index += 1) {
      const x = Phaser.Math.Between(40, 320);
      const y = Phaser.Math.Between(Math.max(70, layout.top + 60), 340);
      const spark = this.add.rectangle(x, y, 5, 5, 0xfacc15, 0.82).setAngle(45);
      this.tweens.add({
        targets: spark,
        alpha: 0.16,
        scale: 1.8,
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 760),
        duration: Phaser.Math.Between(620, 1200),
        ease: 'Sine.easeInOut',
      });
    }
  }

  private speakerColor(speaker: EndingLine['speaker']) {
    if (speaker === 'Blacksmith') return 0xfb923c;
    if (speaker === 'Old Man') return 0xfacc15;
    return 0x86efac;
  }

  private speakerTextColor(speaker: EndingLine['speaker']) {
    if (speaker === 'Blacksmith') return '#fb923c';
    if (speaker === 'Old Man') return '#facc15';
    return '#86efac';
  }
}
