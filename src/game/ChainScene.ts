import Phaser from 'phaser';
import { assetKeys, createSharedAnimations, loadGameAssets } from './assets';
import { awardReward, progress } from './progress';

interface ChainBlock {
  id: string;
  prev: string;
  hash: string;
  title: string;
}

interface PuzzleTile {
  id: string;
  kind: 'chain' | 'iron';
  block?: ChainBlock;
  cell: number;
  container: Phaser.GameObjects.Container;
  plate: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

type ForgeSpeaker = 'Blacksmith' | 'Old Man' | 'You';

interface DialogueLine {
  speaker: ForgeSpeaker;
  text: string;
}

const chainBlocks = (): ChainBlock[] => [
  { id: 'A', prev: 'GEN', hash: '19AF', title: 'Genesis Link' },
  { id: 'B', prev: '19AF', hash: '7C02', title: 'Village Block' },
  { id: 'C', prev: '7C02', hash: progress.block.hash, title: 'Your Block' },
  { id: 'D', prev: progress.block.hash, hash: '0BEE', title: 'Reward Lock' },
];

const forgeIntroLines: DialogueLine[] = [
  {
    speaker: 'Blacksmith',
    text: 'Hm? If you are here for horseshoes, take a number. If you are here with a verified block, step closer.',
  },
  {
    speaker: 'Old Man',
    text: 'The council has stamped this block. It is ready to be linked into the village chain.',
  },
  {
    speaker: 'You',
    text: 'So this is where a verified block becomes part of history?',
  },
  {
    speaker: 'Blacksmith',
    text: 'Exactly. A block does not stand alone. Each one must point to the hash of the block before it.',
  },
  {
    speaker: 'Blacksmith',
    text: 'If the previous hash does not match, the link cracks. Repair the chain, then forge each link shut.',
  },
];

const forgeTutorialLines: DialogueLine[] = [
  {
    speaker: 'Blacksmith',
    text: 'Here is the anvil. Each block has a previous hash on top and the hash it creates below.',
  },
  {
    speaker: 'Blacksmith',
    text: 'Slide the blocks into the marked path. A good chain starts at GEN, then every hash must feed the next block.',
  },
  {
    speaker: 'You',
    text: 'So if the hashes touch in the right order, the chain holds?',
  },
  {
    speaker: 'Blacksmith',
    text: 'Exactly. When it looks right, strike the chain. Green links hold. Broken links mean keep sliding.',
  },
];

export default class ChainScene extends Phaser.Scene {
  private placed = 0;
  private heat = 0;
  private heatFill!: Phaser.GameObjects.Rectangle;
  private feedback?: Phaser.GameObjects.Text;
  private puzzleTiles: PuzzleTile[] = [];
  private emptyCell = 8;
  private linkLines: Phaser.GameObjects.Line[] = [];
  private skipIntro = false;
  private dialogueLayer?: Phaser.GameObjects.Container;
  private blacksmith?: Phaser.GameObjects.Sprite;
  private youngMiner?: Phaser.GameObjects.Sprite;
  private oldMan?: Phaser.GameObjects.Sprite;
  private forgeIntroTapHint?: Phaser.GameObjects.Text;
  private dialogueIndex = 0;
  private tutorialIndex = 0;
  private puzzleReady = false;

  constructor() {
    super('ChainScene');
  }

  init(data: { skipIntro?: boolean } = {}) {
    this.placed = 0;
    this.heat = 0;
    this.puzzleTiles = [];
    this.emptyCell = 8;
    this.linkLines = [];
    this.skipIntro = data.skipIntro ?? false;
    this.dialogueLayer = undefined;
    this.blacksmith = undefined;
    this.youngMiner = undefined;
    this.oldMan = undefined;
    this.forgeIntroTapHint = undefined;
    this.dialogueIndex = 0;
    this.tutorialIndex = 0;
    this.puzzleReady = false;
  }

  preload() {
    loadGameAssets(this, [
      'mainCharIdle',
      'mainIdleUp',
      'oldManIdle',
      'oldManIdleBack',
      'blacksmithScene',
      'anvilSurface',
      'blacksmithSmashBack',
      'blacksmithIdleFront',
    ]);
  }

  create() {
    if (this.skipIntro) {
      this.createGameplay();
      this.showTutorialLine();
      return;
    }

    this.createForgeIntro();
  }

  private createGameplay() {
    this.cameras.main.setBackgroundColor('#090b12');
    createSharedAnimations(this);

    this.add.image(180, 320, assetKeys.anvilSurface)
      .setOrigin(0.5)
      .setScale(0.248);
    this.add.rectangle(180, 320, 360, 640, 0x020617, 0.32);
    this.add.rectangle(180, 78, 336, 98, 0x090b12, 0.78).setStrokeStyle(2, 0xf97316, 0.75);

    this.add.text(24, 24, 'Forge the chain', {
      color: '#f8fafc',
      fontSize: '19px',
      fontFamily: 'monospace',
    });

    this.add.text(24, 54, 'Slide blocks so each prev hash touches the hash before it.', {
      color: '#cbd5e1',
      fontSize: '11px',
      fontFamily: 'monospace',
      wordWrap: { width: 312 },
    });

    this.add.text(24, 92, 'Path: GEN -> 19AF -> 7C02 -> BLOCK -> 0BEE', {
      color: '#93c5fd',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setName('tipText');

    this.add.rectangle(180, 132, 238, 16, 0x0f172a, 0.92).setStrokeStyle(2, 0x475569);
    this.heatFill = this.add.rectangle(61, 132, 0, 10, 0xf97316).setOrigin(0, 0.5);
    this.add.text(61, 151, 'Forge heat', {
      color: '#fb923c',
      fontSize: '10px',
      fontFamily: 'monospace',
    });

    this.createSlidingPuzzle();
  }

  private createForgeIntro() {
    this.cameras.main.setBackgroundColor('#090b12');
    createSharedAnimations(this);

    const background = this.add.image(180, 320, assetKeys.blacksmithScene)
      .setOrigin(0.5)
      .setScale(0.248);
    const shade = this.add.rectangle(180, 320, 360, 640, 0x020617, 0.08);

    this.blacksmith = this.add.sprite(178, 434, assetKeys.blacksmithSmashBack, 0)
      .setOrigin(0.13, 1)
      .setScale(2.15)
      .play('blacksmith-smash-back');
    this.blacksmith.anims.timeScale = 0.55;
    this.youngMiner = this.add.sprite(134, 708, assetKeys.mainIdleUp, 0)
      .setOrigin(0.5, 1)
      .setScale(2.55)
      .play('main-idle-up');
    this.oldMan = this.add.sprite(226, 708, assetKeys.oldManIdleBack, 0)
      .setOrigin(0.5, 1)
      .setScale(2.55)
      .play('old-man-idle-back');

    this.add.container(0, 0, [background, shade, this.blacksmith, this.youngMiner, this.oldMan]);
    this.cameras.main.setZoom(1.45);
    this.cameras.main.centerOn(180, 214);

    this.time.addEvent({
      delay: 760,
      repeat: 4,
      callback: () => this.showHammerHit(),
    });

    this.cameras.main.pan(180, 390, 2600, 'Sine.easeInOut', true, (_camera, progress) => {
      if (progress === 1) this.revealForgeWitnesses();
    });
  }

  private revealForgeWitnesses() {
    this.cameras.main.zoomTo(1, 1300, 'Sine.easeInOut', true);
    this.cameras.main.pan(180, 320, 1300, 'Sine.easeInOut', true);
    this.tweens.add({
      targets: [this.youngMiner, this.oldMan],
      y: 612,
      duration: 1500,
      ease: 'Sine.easeInOut',
      onComplete: () => this.waitForForgeDialogueTap(),
    });
  }

  private waitForForgeDialogueTap() {
    this.blacksmith?.stop();
    this.blacksmith?.setTexture(assetKeys.blacksmithIdleFront, 0);
    this.blacksmith?.setOrigin(0.5, 1);
    this.blacksmith?.setScale(2.55);
    this.blacksmith?.play('blacksmith-idle-front');
    this.showBlacksmithSurprise();

    this.forgeIntroTapHint = this.add.text(180, 604, 'Tap to continue', {
      color: '#fed7aa',
      fontSize: '11px',
      fontFamily: 'monospace',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: this.forgeIntroTapHint,
      alpha: 0.35,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.time.delayedCall(120, () => {
      this.input.once('pointerdown', () => {
        this.forgeIntroTapHint?.destroy();
        this.forgeIntroTapHint = undefined;
        this.showDialogueLine();
      });
    });
  }

  private showBlacksmithSurprise() {
    if (!this.blacksmith) return;

    const question = this.add.text(this.blacksmith.x + 26, this.blacksmith.y - 96, '?', {
      color: '#fde68a',
      fontSize: '30px',
      fontFamily: 'monospace',
      stroke: '#020617',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({
      targets: this.blacksmith,
      y: this.blacksmith.y - 18,
      duration: 130,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: question,
      y: question.y - 18,
      alpha: 1,
      duration: 170,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: question,
          y: question.y - 10,
          alpha: 0,
          delay: 500,
          duration: 300,
          ease: 'Sine.easeIn',
          onComplete: () => question.destroy(),
        });
      },
    });
  }

  private showHammerHit() {
    const spark = this.add.circle(184, 396, 10, 0xfacc15, 0.9).setDepth(4);
    const shock = this.add.circle(184, 396, 4, 0xffffff, 0.75)
      .setStrokeStyle(2, 0xf97316, 0.95)
      .setDepth(4);
    const clang = this.add.text(210, 382, 'CLANG', {
      color: '#fed7aa',
      fontSize: '15px',
      fontFamily: 'monospace',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(4);

    this.cameras.main.shake(150, 0.0065);
    this.tweens.add({
      targets: spark,
      scale: 1.6,
      alpha: 0,
      duration: 520,
      ease: 'Expo.easeOut',
      onComplete: () => spark.destroy(),
    });
    this.tweens.add({
      targets: shock,
      scale: 5,
      alpha: 0,
      duration: 420,
      ease: 'Expo.easeOut',
      onComplete: () => shock.destroy(),
    });
    this.tweens.add({
      targets: clang,
      y: '-=26',
      alpha: 0,
      scale: 1.12,
      duration: 560,
      ease: 'Sine.easeOut',
      onComplete: () => clang.destroy(),
    });
  }

  private showDialogueLine() {
    const line = forgeIntroLines[this.dialogueIndex];
    this.showVisualNovelDialogue(line, () => {
      this.dialogueIndex += 1;
      if (this.dialogueIndex >= forgeIntroLines.length) {
        this.transitionToGameplay();
        return;
      }

      this.showDialogueLine();
    });
  }

  private showTutorialLine() {
    const line = forgeTutorialLines[this.tutorialIndex];
    this.showVisualNovelDialogue(line, () => {
      this.tutorialIndex += 1;
      if (this.tutorialIndex >= forgeTutorialLines.length) {
        this.dialogueLayer?.destroy(true);
        this.dialogueLayer = undefined;
        this.puzzleReady = true;
        this.showFeedback('Slide tiles, then strike the chain.', '#86efac');
        return;
      }

      this.showTutorialLine();
    });
  }

  private showVisualNovelDialogue(line: DialogueLine, onContinue: () => void) {
    this.dialogueLayer?.destroy(true);

    const dim = this.add.rectangle(180, 320, 360, 640, 0x020617, 0.48);
    const portrait = this.createPortrait(line.speaker);
    const box = this.add.rectangle(180, 548, 334, 164, 0x020617, 0.96).setStrokeStyle(3, 0xf97316);
    const nameText = this.add.text(30, 482, line.speaker, {
      color: this.speakerColor(line.speaker),
      fontSize: '14px',
      fontFamily: 'monospace',
    });
    const body = this.add.text(30, 512, line.text, {
      color: '#e2e8f0',
      fontSize: '13px',
      fontFamily: 'monospace',
      lineSpacing: 7,
      wordWrap: { width: 300 },
    });
    const hint = this.add.text(180, 614, 'Tap to continue', {
      color: '#94a3b8',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.dialogueLayer = this.add.container(0, 0, [dim, portrait, box, nameText, body, hint]).setDepth(20);
    this.time.delayedCall(80, () => this.input.once('pointerdown', onContinue));
  }

  private createPortrait(speaker: ForgeSpeaker) {
    if (speaker === 'Old Man') {
      return this.add.sprite(84, 492, assetKeys.oldManIdle, 0)
        .setOrigin(0.5, 1)
        .setScale(4.35)
        .play('old-man-idle');
    }

    if (speaker === 'You') {
      return this.add.sprite(84, 492, assetKeys.mainCharIdle, 0)
        .setOrigin(0.5, 1)
        .setScale(4.25)
        .play('main-char-idle');
    }

    return this.add.sprite(276, 492, assetKeys.blacksmithIdleFront, 0)
      .setOrigin(0.5, 1)
      .setScale(4.15)
      .play('blacksmith-idle-front');
  }

  private speakerColor(speaker: ForgeSpeaker) {
    if (speaker === 'Blacksmith') return '#fb923c';
    if (speaker === 'Old Man') return '#facc15';
    return '#86efac';
  }

  private transitionToGameplay() {
    this.dialogueLayer?.destroy(true);
    this.cameras.main.fadeOut(260, 8, 13, 24);
    this.time.delayedCall(280, () => this.scene.restart({ skipIntro: true }));
  }

  private createSlidingPuzzle() {
    this.add.rectangle(180, 322, 294, 294, 0x111827, 0.44).setStrokeStyle(3, 0x78350f, 0.9);

    for (let cell = 0; cell < 9; cell += 1) {
      const { x, y } = this.cellCenter(cell);
      const isPath = [0, 1, 2, 5].includes(cell);
      this.add.rectangle(x, y, 82, 82, isPath ? 0x1f2937 : 0x0f172a, isPath ? 0.42 : 0.24)
        .setStrokeStyle(1, isPath ? 0xf97316 : 0x334155, isPath ? 0.75 : 0.45);
    }

    this.add.text(57, 174, 'START', {
      color: '#fed7aa',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add.text(284, 374, 'SEAL', {
      color: '#fed7aa',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.emptyCell = 5;
    this.puzzleTiles = [
      this.createPuzzleTile(chainBlocks()[0], 3),
      this.createPuzzleTile(chainBlocks()[1], 1),
      this.createPuzzleTile(chainBlocks()[2], 7),
      this.createPuzzleTile(chainBlocks()[3], 2),
      this.createIronTile('I', 'IRON', 4),
      this.createIronTile('II', 'COAL', 0),
      this.createIronTile('III', 'RUNE', 6),
      this.createIronTile('IV', 'ORE', 8),
    ];

    this.refreshChainLinks();
    this.createHammerButton();
  }

  private createPuzzleTile(block: ChainBlock, cell: number) {
    const { x, y } = this.cellCenter(cell);
    const plate = this.add.rectangle(0, 0, 76, 76, 0x1e293b, 0.96).setStrokeStyle(3, 0xf59e0b);
    const label = this.add.text(0, -23, block.id, {
      color: '#fef3c7',
      fontSize: '19px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    const hashes = this.add.text(0, 9, `${block.prev}\n${block.hash}`, {
      color: '#dbeafe',
      fontSize: '11px',
      fontFamily: 'monospace',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    const container = this.add.container(x, y, [plate, label, hashes]);
    container.setDepth(3);
    const tile: PuzzleTile = { id: block.id, kind: 'chain', block, cell, container, plate, label };

    container.setSize(76, 76).setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => this.trySlideTile(tile));
    return tile;
  }

  private createIronTile(id: string, text: string, cell: number) {
    const { x, y } = this.cellCenter(cell);
    const plate = this.add.rectangle(0, 0, 76, 76, 0x27272a, 0.92).setStrokeStyle(2, 0x71717a);
    const label = this.add.text(0, 0, text, {
      color: '#a1a1aa',
      fontSize: '12px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    const container = this.add.container(x, y, [plate, label]);
    container.setDepth(3);
    const tile: PuzzleTile = { id, kind: 'iron', cell, container, plate, label };

    container.setSize(76, 76).setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => this.trySlideTile(tile));
    return tile;
  }

  private createHammerButton() {
    const button = this.add.container(180, 530);
    const plate = this.add.rectangle(0, 0, 214, 48, 0x7c2d12, 0.95).setStrokeStyle(3, 0xf97316);
    const head = this.add.rectangle(-72, -2, 22, 18, 0xd4d4d8).setStrokeStyle(2, 0x52525b);
    const handle = this.add.rectangle(-50, 8, 36, 8, 0x92400e).setAngle(-18);
    const text = this.add.text(18, 0, 'Strike chain', {
      color: '#fff7ed',
      fontSize: '15px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    button.add([plate, handle, head, text]);
    button.setSize(214, 48).setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => this.strikeChain(button));
  }

  private trySlideTile(tile: PuzzleTile) {
    if (!this.puzzleReady) return;

    if (!this.areAdjacent(tile.cell, this.emptyCell)) {
      this.showFeedback('Slide into the open space.', '#cbd5e1');
      return;
    }

    const oldCell = tile.cell;
    tile.cell = this.emptyCell;
    this.emptyCell = oldCell;
    const { x, y } = this.cellCenter(tile.cell);

    this.tweens.add({
      targets: tile.container,
      x,
      y,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => this.refreshChainLinks(),
    });
  }

  private strikeChain(button: Phaser.GameObjects.Container) {
    if (!this.puzzleReady) return;

    this.tweens.add({
      targets: button,
      y: button.y + 7,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    const linked = this.refreshChainLinks();
    this.showChainStrikeImpact();
    if (linked >= 4) {
      this.showFeedback('Chain sealed', '#86efac');
      this.coolForge();
      this.finish();
      return;
    }

    this.addHeat();
    this.showFeedback(`${linked}/4 links aligned`, linked > 0 ? '#facc15' : '#fecaca');
  }

  private showChainStrikeImpact() {
    const flash = this.add.rectangle(180, 322, 304, 304, 0xffffff, 0.26)
      .setStrokeStyle(5, 0xf97316, 0.9)
      .setDepth(11);

    this.cameras.main.shake(360, 0.018);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.08,
      duration: 260,
      ease: 'Expo.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  private refreshChainLinks() {
    this.linkLines.forEach((line) => line.destroy());
    this.linkLines = [];

    const pathCells = [0, 1, 2, 5];
    const expected = chainBlocks();
    let linked = 0;

    this.puzzleTiles.forEach((tile) => {
      const expectedIndex = expected.findIndex((block) => block.id === tile.id);
      const isCorrect = tile.kind === 'chain' && expectedIndex >= 0 && tile.cell === pathCells[expectedIndex];
      tile.plate.setStrokeStyle(isCorrect ? 3 : tile.kind === 'chain' ? 3 : 2, isCorrect ? 0x86efac : tile.kind === 'chain' ? 0xf59e0b : 0x71717a);
      tile.plate.setFillStyle(isCorrect ? 0x14532d : tile.kind === 'chain' ? 0x1e293b : 0x27272a, isCorrect ? 0.96 : 0.92);
    });

    for (let index = 0; index < expected.length; index += 1) {
      const tile = this.puzzleTiles.find((candidate) => candidate.id === expected[index].id);
      if (!tile || tile.cell !== pathCells[index]) break;
      if (index > 0 && tile.block?.prev !== expected[index - 1].hash) break;

      linked += 1;
      if (index > 0) this.drawLink(pathCells[index - 1], pathCells[index], 0x86efac);
    }

    for (let index = Math.max(1, linked); index < pathCells.length; index += 1) {
      this.drawLink(pathCells[index - 1], pathCells[index], 0x7f1d1d);
    }

    return linked;
  }

  private drawLink(fromCell: number, toCell: number, color: number) {
    const from = this.cellCenter(fromCell);
    const to = this.cellCenter(toCell);
    const line = this.add.line(0, 0, from.x, from.y, to.x, to.y, color, 0.72)
      .setOrigin(0)
      .setLineWidth(5)
      .setDepth(2);

    this.linkLines.push(line);
  }

  private cellCenter(cell: number) {
    const col = cell % 3;
    const row = Math.floor(cell / 3);
    return {
      x: 94 + col * 86,
      y: 220 + row * 86,
    };
  }

  private areAdjacent(a: number, b: number) {
    const aCol = a % 3;
    const aRow = Math.floor(a / 3);
    const bCol = b % 3;
    const bRow = Math.floor(b / 3);
    return Math.abs(aCol - bCol) + Math.abs(aRow - bRow) === 1;
  }

  private showFeedback(text: string, color: string) {
    this.feedback?.destroy();
    this.feedback = this.add.text(180, 568, text, {
      color,
      backgroundColor: '#020617',
      fontSize: '12px',
      fontFamily: 'monospace',
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.time.delayedCall(850, () => {
      this.feedback?.destroy();
      this.feedback = undefined;
    });
  }

  private addHeat() {
    this.heat = Phaser.Math.Clamp(this.heat + 24, 0, 100);
    this.heatFill.width = this.heat * 2.38;
    if (this.heat >= 72) {
      this.showFeedback('Forge unstable. Check prev hashes.', '#facc15');
    }
  }

  private coolForge() {
    this.heat = Phaser.Math.Clamp(this.heat - 14, 0, 100);
    this.heatFill.width = this.heat * 2.38;
  }

  private finish() {
    if (this.placed >= chainBlocks().length) return;
    this.placed = chainBlocks().length;
    this.puzzleReady = false;

    this.time.delayedCall(850, () => {
      const dim = this.add.rectangle(180, 320, 360, 640, 0x020617, 0.68);
      const box = this.add.rectangle(180, 320, 314, 182, 0x052e16, 0.98).setStrokeStyle(4, 0x86efac);
      const title = this.add.text(180, 252, 'KEY', {
        color: '#facc15',
        fontSize: '24px',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      const heading = this.add.text(180, 294, 'Blockchain complete', {
        color: '#ffffff',
        fontSize: '18px',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      const body = this.add.text(180, 340, 'Chain Key earned. The reward box is unlocked.', {
        color: '#cbd5e1',
        fontSize: '12px',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: 260 },
      }).setOrigin(0.5);
      this.add.container(0, 0, [dim, box, title, heading, body]).setDepth(30);

      progress.block.status = 'chained';
      progress.chainComplete = true;
      progress.boxUnlocked = true;
      awardReward('Chain Key');
      this.rewardBurst();
      this.time.delayedCall(1300, () => this.scene.start('StoryScene', { stage: 'afterChain' }));
    });
  }

  private rewardBurst() {
    for (let index = 0; index < 14; index += 1) {
      const spark = this.add.rectangle(180, 320, 7, 7, 0xfacc15).setDepth(31);
      const glint = this.add.circle(180, 320, 8, 0xfef08a, 0.85).setDepth(31);
      this.tweens.add({
        targets: [spark, glint],
        x: 180 + Phaser.Math.Between(-122, 122),
        y: 320 + Phaser.Math.Between(-94, 94),
        alpha: 0,
        angle: Phaser.Math.Between(90, 360),
        duration: 640,
        ease: 'Sine.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }
}
