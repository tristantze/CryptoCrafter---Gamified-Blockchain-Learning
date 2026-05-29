import Phaser from 'phaser';
import { assetKeys, createSharedAnimations, loadGameAssets } from './assets';
import { addFullscreenRectangle, getLayout, setupResponsiveScene } from './responsive';

type SceneryKey = 'mine' | 'council' | 'forge';

interface SceneryBeat {
  nextScene: string;
  nextData?: Record<string, unknown>;
  lines: string[];
}

const beats: Record<SceneryKey, SceneryBeat> = {
  mine: {
    nextScene: 'MiningScene',
    lines: [
      'The cave breathes cold air, and the crystals blink like tiny machines waking up.',
      'Somewhere in there is the hash for my first block.',
      'I grip my pick and step into the dark.',
    ],
  },
  council: {
    nextScene: 'VerificationScene',
    lines: [
      'The hall is quieter than I expected. Four miners wait above the ledger table.',
      'TX-01 sits inside my mined block, waiting for approval.',
      'Time to check the facts and face the council.',
    ],
  },
  forge: {
    nextScene: 'ChainScene',
    nextData: { skipIntro: false },
    lines: [
      'The forge glows hot enough to paint every block orange.',
      'My verified block is ready. It needs to remember the block before it.',
      'If I link them correctly, the chain will hold.',
    ],
  },
};

export default class SceneryScene extends Phaser.Scene {
  private keyName: SceneryKey = 'mine';
  private lineIndex = 0;
  private beat!: SceneryBeat;
  private bodyText?: Phaser.GameObjects.Text;

  constructor() {
    super('SceneryScene');
  }

  init(data: { scenery?: SceneryKey }) {
    this.keyName = data.scenery ?? 'mine';
    this.lineIndex = 0;
    this.beat = beats[this.keyName];
  }

  preload() {
    loadGameAssets(this, ['playerWalk', 'pickaxe', 'fire', 'glint']);
  }

  create() {
    setupResponsiveScene(this);
    this.cameras.main.setBackgroundColor('#0f172a');
    createSharedAnimations(this);
    this.drawScenery();
    this.addYoungMiner();
    this.createTextBox();
    this.showLine();

    this.input.on('pointerdown', this.advance, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.advance, this);
    });
  }

  private advance() {
    this.lineIndex += 1;

    if (this.lineIndex >= this.beat.lines.length) {
      this.cameras.main.fadeOut(260, 8, 13, 24);
      this.time.delayedCall(270, () => this.scene.start(this.beat.nextScene, this.beat.nextData));
      return;
    }

    this.showLine();
  }

  private showLine() {
    this.bodyText?.setText(this.beat.lines[this.lineIndex]);
  }

  private drawScenery() {
    if (this.keyName === 'mine') {
      addFullscreenRectangle(this, 0x111827);
      this.add.circle(180, 316, 218, 0x1f2937);
      this.add.circle(180, 238, 86, 0x020617);
      this.add.rectangle(180, 460, 360, 190, 0x0f172a);
      this.add.sprite(76, 254, assetKeys.glint).setScale(7).setTint(0x38bdf8).play('glint');
      this.add.sprite(292, 304, assetKeys.glint).setScale(8).setTint(0xa78bfa).play('glint');
      this.add.sprite(136, 372, assetKeys.glint).setScale(6).setTint(0x67e8f9).play('glint');
    }

    if (this.keyName === 'council') {
      addFullscreenRectangle(this, 0x172033);
      this.add.rectangle(180, 274, 292, 190, 0x334155).setStrokeStyle(4, 0x94a3b8);
      this.add.triangle(180, 140, 34, 210, 326, 210, 180, 104, 0x475569);
      this.add.rectangle(180, 386, 246, 34, 0x0f172a);
      for (let index = 0; index < 4; index += 1) {
        this.add.circle(76 + index * 70, 250, 18, [0x38bdf8, 0xf59e0b, 0xa78bfa, 0x22c55e][index]);
        this.add.rectangle(76 + index * 70, 292, 22, 72, 0x1e293b);
      }
    }

    if (this.keyName === 'forge') {
      addFullscreenRectangle(this, 0x1f1b16);
      this.add.rectangle(180, 398, 322, 198, 0x292524).setStrokeStyle(4, 0x78716c);
      this.add.circle(180, 292, 88, 0xef4444, 0.34);
      this.add.sprite(180, 292, assetKeys.fire).setScale(14).play('forge-fire');
      for (let index = 0; index < 4; index += 1) {
        const x = 62 + index * 78;
        this.add.rectangle(x, 182, 50, 44, 0x0f172a).setStrokeStyle(2, 0xf59e0b);
        if (index > 0) this.add.line(x - 39, 182, 0, 0, 28, 0, 0xf59e0b, 0.84).setOrigin(0.5);
      }
    }
  }

  private addYoungMiner() {
    const x = 94;
    const y = 384;
    const minerSprite = this.add.sprite(0, 0, assetKeys.playerWalk, 0).setScale(1.15).play('player-walk');
    const pick = this.add.image(42, 24, assetKeys.pickaxe).setScale(2.4).setAngle(-34);
    const miner = this.add.container(x, y, [pick, minerSprite]);

    this.tweens.add({
      targets: miner,
      x: 122,
      duration: 1300,
      ease: 'Sine.easeInOut',
    });
  }

  private createTextBox() {
    const layout = getLayout(this);
    const boxY = layout.safeBottom - 82;
    this.add.rectangle(180, boxY, 322, 164, 0x020617, 0.92).setStrokeStyle(3, 0x475569);
    this.add.text(34, boxY - 62, 'You', {
      color: '#86efac',
      fontSize: '13px',
      fontFamily: 'monospace',
    });
    this.bodyText = this.add.text(34, boxY - 32, '', {
      color: '#e2e8f0',
      fontSize: '14px',
      fontFamily: 'monospace',
      lineSpacing: 8,
      wordWrap: { width: 292 },
    });
    this.add.text(180, boxY + 68, 'Tap to continue', {
      color: '#64748b',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }
}
