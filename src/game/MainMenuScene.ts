import Phaser from 'phaser';
import { assetKeys, loadGameAssets } from './assets';
import { arduinoBridge } from './arduinoBridge';
import { getSavedLocation, progress, resetProgress, saveCheckpoint, syncHardwareState } from './progress';
import { addCoverImage, getLayout, setupResponsiveScene } from './responsive';

type PanelKey = 'connect' | 'stats' | 'info';
type ActivePanelKey = PanelKey | 'boxPrompt';

interface MenuPanel {
  title: string;
  body: string;
  accent: number;
}

const panels: Record<PanelKey, MenuPanel> = {
  connect: {
    title: 'Connect Chest',
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
  private activePanel?: ActivePanelKey;
  private bridgeUnsubscribe?: () => void;

  constructor() {
    super('MainMenuScene');
  }

  preload() {
    loadGameAssets(this, ['cryptocrafterLogo', 'mainMenuBackgroundExtended', 'miningBadge', 'verificationBadge', 'chainBadge']);
  }

  create() {
    setupResponsiveScene(this);
    void arduinoBridge.reportScene('MainMenuScene');
    syncHardwareState();
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

    this.createButton(180, 368, this.playButtonLabel(), 0x7ccf3f, '#17340f', () => this.startGame(), 244, 62, 19, 'play');
    this.createButton(180, 450, 'Connect Chest', 0xf8b84e, '#4a2607', () => this.showPanel('connect'), 224, 50, 15, 'box');
    this.createButton(106, 520, 'Stats', 0x79c7e8, '#12394a', () => this.showPanel('stats'), 118, 48, 14, 'stats');
    this.createButton(254, 520, 'Info', 0xf5dc66, '#4f3a05', () => this.showPanel('info'), 118, 48, 14, 'info');

    this.bridgeUnsubscribe = arduinoBridge.subscribe(() => {
      if (this.activePanel === 'connect') {
        this.showPanel('connect');
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bridgeUnsubscribe?.();
      this.bridgeUnsubscribe = undefined;
    });
  }

  private startGame() {
    if (arduinoBridge.getState().status !== 'connected') {
      this.showPrePlayBoxPrompt();
      return;
    }

    this.continueGame();
  }

  private continueGame() {
    const savedLocation = getSavedLocation();
    if (savedLocation && savedLocation.scene !== 'MainMenuScene') {
      this.scene.start(savedLocation.scene, savedLocation.data);
      return;
    }

    resetProgress();
    saveCheckpoint({ scene: 'StoryScene', data: { stage: 'intro' } });
    this.scene.start('StoryScene', { stage: 'intro' });
  }

  private playButtonLabel() {
    const savedLocation = getSavedLocation();
    if (savedLocation && savedLocation.scene !== 'MainMenuScene') return 'Continue';
    if (progress.chainComplete) return 'Play Again';
    return 'Play';
  }

  private showPanel(key: PanelKey) {
    if (key === 'connect') {
      this.showConnectPanel();
      return;
    }

    if (key === 'stats') {
      this.showStatsPanel();
      return;
    }

    this.activePanel = key;
    const panel = panels[key];
    this.panelGroup?.destroy(true);

    const layout = getLayout(this);
    const overlay = this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.72);
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
    const closeButton = this.add.rectangle(180, 528, 180, 52, panel.accent).setStrokeStyle(3, 0xffffff, 0.38);
    const closeText = this.add.text(180, 528, 'Back', {
      color: '#020617',
      fontSize: '16px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    closeButton.setInteractive({ useHandCursor: true });
    closeText.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.closePanel());
    closeText.on('pointerdown', () => this.closePanel());

    const children: Phaser.GameObjects.GameObject[] = [overlay, bg, title, body, closeButton, closeText];

    this.panelGroup = this.add.container(0, 0, children).setDepth(20);
  }

  private showStatsPanel() {
    this.activePanel = 'stats';
    this.panelGroup?.destroy(true);

    const panel = panels.stats;
    const layout = getLayout(this);
    const overlay = this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.72);
    const bg = this.add.rectangle(180, 332, 316, 404, 0x111827, 0.98).setStrokeStyle(3, panel.accent, 0.78);
    const title = this.add.text(42, 154, panel.title, {
      color: '#f8fafc',
      fontSize: '19px',
      fontFamily: 'monospace',
    });
    const subtitle = this.add.text(42, 184, 'Badges earned during your first block.', {
      color: '#cbd5e1',
      fontSize: '10px',
      fontFamily: 'monospace',
      wordWrap: { width: 276 },
    });
    const badges = [
      this.createStatsBadgeIcon(86, 252, assetKeys.miningBadge, 'Mining', progress.miningComplete),
      this.createStatsBadgeIcon(180, 252, assetKeys.verificationBadge, 'Verify', progress.verificationComplete),
      this.createStatsBadgeIcon(274, 252, assetKeys.chainBadge, 'Chain', progress.chainComplete),
    ];
    const body = this.add.text(42, 336, this.panelBody('stats'), {
      color: '#dbeafe',
      fontSize: '11px',
      fontFamily: 'monospace',
      lineSpacing: 7,
      wordWrap: { width: 276 },
    });
    const closeButton = this.add.rectangle(180, 528, 180, 52, panel.accent).setStrokeStyle(3, 0xffffff, 0.38);
    const closeText = this.add.text(180, 528, 'Back', {
      color: '#020617',
      fontSize: '16px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    closeButton.setInteractive({ useHandCursor: true });
    closeText.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.closePanel());
    closeText.on('pointerdown', () => this.closePanel());

    this.panelGroup = this.add.container(0, 0, [
      overlay,
      bg,
      title,
      subtitle,
      ...badges,
      body,
      closeButton,
      closeText,
    ]).setDepth(20);
  }

  private showConnectPanel() {
    this.activePanel = 'connect';
    this.panelGroup?.destroy(true);

    const state = arduinoBridge.getState();
    const panel = panels.connect;
    const { buttonLabel, buttonColor } = this.connectActionConfig();

    const layout = getLayout(this);
    const overlay = this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.72);
    const bg = this.add.rectangle(180, 330, 316, 414, 0x111827, 0.98).setStrokeStyle(3, panel.accent, 0.78);
    const title = this.add.text(42, 142, panel.title, {
      color: '#f8fafc',
      fontSize: '19px',
      fontFamily: 'monospace',
    });

    const subtitle = this.add.text(42, 171, 'Optional Bluetooth chest for the final reward.', {
      color: '#cbd5e1',
      fontSize: '10px',
      fontFamily: 'monospace',
      wordWrap: { width: 276 },
    });

    const statusPill = this.createStatusPill(180, 212, state.status);
    const detailBg = this.add.rectangle(180, 262, 284, 58, 0x0f172a, 0.92).setStrokeStyle(2, 0x334155, 0.82);
    const detail = this.add.text(48, 243, this.connectDetailText(), {
      color: state.lastError ? '#fecaca' : '#dbeafe',
      fontSize: '10px',
      fontFamily: 'monospace',
      lineSpacing: 4,
      wordWrap: { width: 264 },
    });

    const progressTitle = this.add.text(42, 312, 'Progress', {
      color: '#fde68a',
      fontSize: '11px',
      fontFamily: 'monospace',
    });
    const progressBadges = [
      this.createProgressBadge(76, 342, 'Mine', progress.miningComplete),
      this.createProgressBadge(145, 342, 'Verify', progress.verificationComplete),
      this.createProgressBadge(219, 342, 'Chain', progress.chainComplete),
      this.createProgressBadge(288, 342, 'Chest', progress.boxUnlocked),
    ];

    const noteBg = this.add.rectangle(180, 392, 284, 44, 0x1e293b, 0.72).setStrokeStyle(2, 0x475569, 0.6);
    const note = this.add.text(48, 378, 'The chest opens only on the ending summary after the chain is forged.', {
      color: '#e2e8f0',
      fontSize: '10px',
      fontFamily: 'monospace',
      lineSpacing: 4,
      wordWrap: { width: 264 },
    });

    const actionButton = this.add.rectangle(180, 450, 224, 44, buttonColor).setStrokeStyle(3, 0xffffff, 0.38);
    const actionText = this.add.text(180, 450, buttonLabel, {
      color: '#020617',
      fontSize: '14px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    actionButton.setInteractive({ useHandCursor: true });
    actionText.setInteractive({ useHandCursor: true });
    actionButton.on('pointerdown', () => void this.handleConnectAction());
    actionText.on('pointerdown', () => void this.handleConnectAction());

    const closeButton = this.add.rectangle(180, 512, 180, 48, panel.accent).setStrokeStyle(3, 0xffffff, 0.38);
    const closeText = this.add.text(180, 512, 'Back', {
      color: '#020617',
      fontSize: '16px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    closeButton.setInteractive({ useHandCursor: true });
    closeText.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.closePanel());
    closeText.on('pointerdown', () => this.closePanel());

    this.panelGroup = this.add.container(0, 0, [
      overlay,
      bg,
      title,
      subtitle,
      statusPill,
      detailBg,
      detail,
      progressTitle,
      ...progressBadges,
      noteBg,
      note,
      actionButton,
      actionText,
      closeButton,
      closeText,
    ]).setDepth(20);
  }

  private showPrePlayBoxPrompt() {
    this.activePanel = 'boxPrompt';
    this.panelGroup?.destroy(true);

    const layout = getLayout(this);
    const overlay = this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.72);
    const bg = this.add.rectangle(180, 326, 316, 388, 0x111827, 0.98).setStrokeStyle(3, 0xf59e0b, 0.78);
    const title = this.add.text(42, 148, 'Use Prize Chest?', {
      color: '#f8fafc',
      fontSize: '19px',
      fontFamily: 'monospace',
    });
    const body = this.add.text(42, 194, [
      'Have the Prize Chest?',
      'Connect it first so the ending can open it.',
      '',
      'No chest nearby?',
      'You can still play. The story will finish without opening it.',
    ].join('\n'), {
      color: '#dbeafe',
      fontSize: '11px',
      fontFamily: 'monospace',
      lineSpacing: 6,
      wordWrap: { width: 276 },
    });

    const connectButton = this.createPanelActionButton(180, 396, 'Connect Chest', 0xf8b84e, () => this.showPanel('connect'), 214);
    const skipButton = this.createPanelActionButton(180, 454, 'Play Without Chest', 0x7ccf3f, () => this.continueGame(), 246);
    const backButton = this.createPanelActionButton(180, 512, 'Back', 0x94a3b8, () => this.closePanel(), 160);

    this.panelGroup = this.add.container(0, 0, [
      overlay,
      bg,
      title,
      body,
      connectButton,
      skipButton,
      backButton,
    ]).setDepth(20);
  }

  private panelBody(key: PanelKey) {
    if (key === 'connect') {
      const state = arduinoBridge.getState();
      const statusHeading =
        state.status === 'connected'
          ? 'Prize Chest: CONNECTED'
          : state.status === 'connecting'
            ? 'Prize Chest: CONNECTING'
            : state.status === 'unsupported'
              ? 'Prize Chest: UNSUPPORTED'
              : progress.boxUnlocked
                ? 'Prize Chest: UNLOCKED'
                : 'Prize Chest: LOCKED';

      const connectionLines = [
        `Status: ${state.detail}`,
        state.lastError ? `Last error: ${state.lastError}` : `Last scene sent: ${state.lastScene}`,
        '',
        'Browser support:',
        '- APK uses native Bluetooth',
        '- Pair CryptoCrafter_Box in Android settings first',
        '- The chest opens only at the ending summary',
      ];

      const progressLines = progress.boxUnlocked
        ? [
            '',
            'Game progress already opened the Prize Chest.',
            'The app will keep that ending state saved.',
          ]
        : [
            '',
            'Finish mining, verification, and chain forging.',
            'The Prize Chest opens on the final summary screen.',
          ];

      return [statusHeading, '', ...connectionLines, ...progressLines].join('\n');
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
    this.activePanel = undefined;
    this.panelGroup?.destroy(true);
    this.panelGroup = undefined;
  }

  private connectActionConfig() {
    const state = arduinoBridge.getState();

    if (state.status === 'connected') {
      return { buttonLabel: 'Disconnect Chest', buttonColor: 0xfca5a5 };
    }

    if (state.status === 'connecting') {
      return { buttonLabel: 'Connecting...', buttonColor: 0xfcd34d };
    }

    if (state.status === 'unsupported') {
      return { buttonLabel: 'Browser Not Supported', buttonColor: 0x94a3b8 };
    }

    return { buttonLabel: 'Connect Chest', buttonColor: 0xf8b84e };
  }

  private connectDetailText() {
    const state = arduinoBridge.getState();

    if (state.lastError) {
      return state.lastError;
    }

    if (state.status === 'connected') {
      return state.detail || 'Prize Chest connected. Keep playing to open it at the ending.';
    }

    if (state.status === 'connecting') {
      return 'Looking for the paired Prize Chest...';
    }

    if (state.status === 'unsupported') {
      return 'Bluetooth is unavailable here. Use the Android APK for the Prize Chest.';
    }

    return 'Pair CryptoCrafter_Box in Android settings, then connect here.';
  }

  private createStatusPill(x: number, y: number, status: string) {
    const color = status === 'connected'
      ? 0x86efac
      : status === 'connecting'
        ? 0xfcd34d
        : status === 'unsupported' || status === 'error'
          ? 0xfca5a5
          : 0x94a3b8;
    const label = status === 'connected'
      ? 'CONNECTED'
      : status === 'connecting'
        ? 'CONNECTING'
        : status === 'unsupported'
          ? 'UNSUPPORTED'
          : status === 'error'
            ? 'ERROR'
            : 'DISCONNECTED';
    const bg = this.add.rectangle(0, 0, 206, 34, color).setStrokeStyle(2, 0xffffff, 0.38);
    const text = this.add.text(0, 0, label, {
      color: '#020617',
      fontSize: '13px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    return this.add.container(x, y, [bg, text]);
  }

  private createProgressBadge(x: number, y: number, label: string, complete: boolean) {
    const color = complete ? 0x86efac : 0x334155;
    const textColor = complete ? '#052e16' : '#cbd5e1';
    const bg = this.add.rectangle(0, 0, 58, 30, color, complete ? 0.95 : 0.88).setStrokeStyle(2, complete ? 0xbbf7d0 : 0x64748b);
    const text = this.add.text(0, 0, label, {
      color: textColor,
      fontSize: '9px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    return this.add.container(x, y, [bg, text]);
  }

  private createStatsBadgeIcon(x: number, y: number, textureKey: string, label: string, complete: boolean) {
    const bg = this.add.circle(0, -8, 38, complete ? 0x1f2937 : 0x0f172a, 0.88)
      .setStrokeStyle(2, complete ? 0x86efac : 0x475569);
    const badge = this.add.image(0, -8, textureKey)
      .setScale(0.032)
      .setAlpha(complete ? 1 : 0.32);
    const lock = complete
      ? this.add.text(0, 37, label, {
          color: '#e2e8f0',
          fontSize: '10px',
          fontFamily: 'monospace',
        }).setOrigin(0.5)
      : this.add.text(0, 37, 'Locked', {
          color: '#94a3b8',
          fontSize: '10px',
          fontFamily: 'monospace',
        }).setOrigin(0.5);

    return this.add.container(x, y, [bg, badge, lock]);
  }

  private async handleConnectAction() {
    const state = arduinoBridge.getState();
    if (state.status === 'connecting' || state.status === 'unsupported') return;

    if (state.status === 'connected') {
      await arduinoBridge.disconnect();
    } else {
      await arduinoBridge.connect();
      syncHardwareState();
    }

    if (this.activePanel === 'connect') {
      this.showPanel('connect');
    }
  }

  private createPanelActionButton(x: number, y: number, label: string, color: number, callback: () => void, width: number) {
    const group = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, 44, color).setStrokeStyle(3, 0xffffff, 0.36);
    const text = this.add.text(0, 0, label, {
      color: '#020617',
      fontSize: '14px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    group.add([bg, text]);
    group.setSize(width, 44).setInteractive({ useHandCursor: true });
    group.on('pointerdown', callback);
    return group;
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
    const layout = getLayout(this);
    addCoverImage(this, assetKeys.mainMenuBackgroundExtended);
    this.add.rectangle(180, Math.max(111, layout.top + 111), 360, 222, 0xffffff, 0.1);
    this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x1f2937, 0.08);
  }
}
