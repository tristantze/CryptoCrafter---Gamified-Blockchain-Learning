import Phaser from 'phaser';
import { assetKeys, loadGameAssets } from './assets';
import { progress, resetProgress } from './progress';

type PanelKey = 'connect' | 'stats' | 'info';

interface MenuPanel {
  title: string;
  body: string;
  accent: number;
}

const panels: Record<PanelKey, MenuPanel> = {
  connect: {
    title: 'Connect Box',
    accent: 0xf59e0b,
    body: '',
  },
  stats: {
    title: 'Stats',
    accent: 0x22c55e,
    body: '',
  },
  info: {
    title: 'Blockchain Info',
    accent: 0x38bdf8,
    body:
      'A blockchain is a shared record of transactions.\n\nMiners do work to propose blocks. Other miners verify that transactions are valid. Each block stores the previous block hash, so changing old data breaks the later links.\n\nThat is why blockchains are useful for trust: many computers can agree on the same history without one central owner.',
  },
};

export default class MainMenuScene extends Phaser.Scene {
  private panelGroup?: Phaser.GameObjects.Container;

  constructor() {
    super('MainMenuScene');
  }

  preload() {
    loadGameAssets(this, ['cryptocrafterLogo', 'mainMenuBackground']);
  }

  create() {
    this.cameras.main.setBackgroundColor('#9bdcf4');
    this.drawBackground();

    const glow = this.add.circle(180, 94, 112, 0xffffff, 0.18);
    this.tweens.add({
      targets: glow,
      alpha: 0.28,
      scale: 1.05,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.image(180, 91, assetKeys.cryptocrafterLogo)
      .setOrigin(0.5)
      .setScale(0.145);

    this.add.rectangle(180, 424, 290, 304, 0xfef3c7, 0.82).setStrokeStyle(4, 0x8b5a2b, 0.92);
    this.add.rectangle(180, 286, 214, 3, 0xf59e0b, 0.88);

    this.createButton(180, 368, 'Play', 0x7ccf3f, '#17340f', () => this.startGame(), 244, 62, 19, 'play');
    this.createButton(180, 450, 'Connect Box', 0xf8b84e, '#4a2607', () => this.showPanel('connect'), 224, 50, 15, 'box');
    this.createButton(106, 520, 'Stats', 0x79c7e8, '#12394a', () => this.showPanel('stats'), 118, 48, 14, 'stats');
    this.createButton(254, 520, 'Info', 0xf5dc66, '#4f3a05', () => this.showPanel('info'), 118, 48, 14, 'info');

    this.add.text(180, 612, 'Reward box support planned for the hardware build.', {
      color: '#37515e',
      fontSize: '10px',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);
  }

  private startGame() {
    resetProgress();
    this.scene.start('StoryScene', { stage: 'intro' });
  }

  private showPanel(key: PanelKey) {
    const panel = panels[key];
    this.panelGroup?.destroy(true);

    const overlay = this.add.rectangle(180, 320, 360, 640, 0x020617, 0.72);
    const bg = this.add.rectangle(180, 332, 316, 404, 0x111827, 0.98).setStrokeStyle(3, panel.accent, 0.78);
    const title = this.add.text(42, 158, panel.title, {
      color: '#f8fafc',
      fontSize: '19px',
      fontFamily: 'monospace',
    });
    const body = this.add.text(42, 205, this.panelBody(key), {
      color: '#dbeafe',
      fontSize: '12px',
      fontFamily: 'monospace',
      lineSpacing: 8,
      wordWrap: { width: 276 },
    });
    const closeButton = this.add.rectangle(180, 504, 180, 52, panel.accent).setStrokeStyle(3, 0xffffff, 0.38);
    const closeText = this.add.text(180, 504, 'Back', {
      color: '#020617',
      fontSize: '16px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    closeButton.setInteractive({ useHandCursor: true });
    closeText.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.closePanel());
    closeText.on('pointerdown', () => this.closePanel());

    this.panelGroup = this.add.container(0, 0, [overlay, bg, title, body, closeButton, closeText]).setDepth(20);
  }

  private panelBody(key: PanelKey) {
    if (key === 'connect') {
      if (progress.boxUnlocked) {
        return 'Reward Box: UNLOCKED\n\nIn the Arduino build, finishing all minigames will send an unlock signal to the physical box.\n\nThe lid can open to reveal a small prize like candy, a badge, or a collectible token.\n\nDigital test: box unlock achieved.';
      }

      return 'Reward Box: LOCKED\n\nFinish mining, verification, and chain forging to unlock the box.\n\nFuture Arduino behavior:\n- LEDs show stage progress\n- box stays locked during lessons\n- final chain success opens the lid';
    }

    if (key === 'stats') {
      return [
        'First-Day Miner Log:',
        '',
        `Mining: ${progress.miningComplete ? 'complete' : 'not complete'}`,
        `Verification: ${progress.verificationComplete ? 'complete' : 'not complete'}`,
        `Blockchain: ${progress.chainComplete ? 'complete' : 'not complete'}`,
        `Block: ${progress.block.status}`,
        `Rewards: ${progress.rewards.length ? progress.rewards.join(', ') : 'none yet'}`,
      ].join('\n');
    }

    return panels[key].body;
  }

  private closePanel() {
    this.panelGroup?.destroy(true);
    this.panelGroup = undefined;
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    color: number,
    textColor: string,
    callback: () => void,
    width = 220,
    height = 54,
    fontSize = 17,
    icon: 'play' | 'box' | 'stats' | 'info' = 'play',
  ) {
    const group = this.add.container(0, 0);
    const shadow = this.add.rectangle(x + 4, y + 5, width + 4, height + 2, 0x3f2a16, 0.36);
    const button = this.add.rectangle(x, y, width, height, color).setStrokeStyle(3, 0x6b3f16, 0.7);
    const shine = this.add.rectangle(x, y - height / 2 + 8, width - 14, 4, 0xffffff, 0.24);
    const badge = this.add.rectangle(x - width / 2 + 28, y, 32, 32, 0xfffbeb, 0.62).setStrokeStyle(2, 0x6b3f16, 0.48);
    const iconShape = this.createButtonIcon(x - width / 2 + 28, y, icon);
    const text = this.add.text(x + 13, y, label, {
      color: textColor,
      fontSize: `${fontSize}px`,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    button.setInteractive({ useHandCursor: true });
    text.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => group.setScale(1.025));
    button.on('pointerout', () => group.setScale(1));
    button.on('pointerdown', callback);
    text.on('pointerdown', callback);

    group.add([shadow, button, shine, badge, ...iconShape, text]);
    return group;
  }

  private createButtonIcon(x: number, y: number, icon: 'play' | 'box' | 'stats' | 'info') {
    if (icon === 'play') {
      return [
        this.add.triangle(x + 2, y, x - 5, y - 9, x - 5, y + 9, x + 9, y, 0x166534),
      ];
    }

    if (icon === 'box') {
      return [
        this.add.rectangle(x, y + 3, 18, 14, 0x92400e).setStrokeStyle(2, 0x451a03),
        this.add.rectangle(x, y - 6, 20, 6, 0xf59e0b).setStrokeStyle(2, 0x451a03),
      ];
    }

    if (icon === 'stats') {
      return [
        this.add.rectangle(x - 7, y + 6, 4, 13, 0x0e7490),
        this.add.rectangle(x, y + 2, 4, 21, 0x0e7490),
        this.add.rectangle(x + 7, y - 2, 4, 29, 0x0e7490),
      ];
    }

    return [
      this.add.circle(x, y - 6, 3, 0x854d0e),
      this.add.rectangle(x, y + 5, 5, 16, 0x854d0e),
    ];
  }

  private drawBackground() {
    this.add.image(180, 320, assetKeys.mainMenuBackground)
      .setOrigin(0.5)
      .setScale(0.248);
    this.add.rectangle(180, 111, 360, 222, 0xffffff, 0.1);
    this.add.rectangle(180, 320, 360, 640, 0x1f2937, 0.08);
  }
}
