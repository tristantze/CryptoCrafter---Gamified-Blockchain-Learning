import Phaser from 'phaser';
import { addFullscreenRectangle, getLayout, setupResponsiveScene } from './responsive';

interface DialogueData {
  lines?: string[];
  nextScene?: string;
  nextData?: Record<string, unknown>;
}

export default class DialogueScene extends Phaser.Scene {
  private lines: string[] = [];
  private lineIndex = 0;
  private bodyText?: Phaser.GameObjects.Text;
  private nextScene = 'MainMenuScene';
  private nextData: Record<string, unknown> = {};

  constructor() {
    super('DialogueScene');
  }

  init(data: DialogueData) {
    this.lines = data.lines ?? ['Back to the hub.'];
    this.lineIndex = 0;
    this.nextScene = data.nextScene ?? 'MainMenuScene';
    this.nextData = data.nextData ?? {};
  }

  create() {
    setupResponsiveScene(this);
    this.cameras.main.setBackgroundColor('#0f172a');
    this.ensureTextures();
    this.drawScene();
    this.showLine();

    this.input.on('pointerdown', this.advance, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.advance, this);
    });
  }

  private drawScene() {
    const layout = getLayout(this);
    addFullscreenRectangle(this, 0x0f172a);
    this.add.rectangle(180, layout.centerY, 330, Math.max(540, layout.height - 80), 0x172033).setStrokeStyle(4, 0x334155);
    this.add.rectangle(180, 132, 260, 90, 0x111827).setStrokeStyle(2, 0x38bdf8, 0.4);
    this.add.sprite(180, 132, 'hero-chip').setScale(2.6);

    this.add.rectangle(180, 456, 312, 174, 0x020617).setStrokeStyle(3, 0x475569);
    this.add.text(34, 388, 'You', {
      color: '#86efac',
      fontSize: '13px',
      fontFamily: 'monospace',
    });
    this.add.text(180, 548, 'Tap to continue', {
      color: '#64748b',
      fontSize: '11px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private showLine() {
    this.bodyText?.destroy();
    this.bodyText = this.add.text(34, 418, this.lines[this.lineIndex], {
      color: '#e2e8f0',
      fontSize: '15px',
      fontFamily: 'monospace',
      lineSpacing: 8,
      wordWrap: { width: 292 },
    });
  }

  private advance() {
    this.lineIndex += 1;

    if (this.lineIndex >= this.lines.length) {
      this.cameras.main.fadeOut(180, 8, 13, 24);
      this.time.delayedCall(190, () => this.scene.start(this.nextScene, this.nextData));
      return;
    }

    this.showLine();
  }

  private ensureTextures() {
    if (this.textures.exists('hero-chip')) return;

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x38d9a9);
    graphics.fillRoundedRect(4, 4, 24, 24, 5);
    graphics.lineStyle(3, 0xd1fae5);
    graphics.strokeRoundedRect(4, 4, 24, 24, 5);
    graphics.fillStyle(0x0f172a);
    graphics.fillRect(11, 11, 10, 10);
    graphics.fillStyle(0xffffff);
    graphics.fillRect(9, 8, 3, 3);
    graphics.fillRect(20, 8, 3, 3);
    graphics.generateTexture('hero-chip', 32, 32);
    graphics.destroy();
  }
}
