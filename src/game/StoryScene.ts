import Phaser from 'phaser';
import { arduinoBridge } from './arduinoBridge';
import { assetKeys, createSharedAnimations, loadGameAssets } from './assets';
import { saveCheckpoint } from './progress';
import { addCoverImage, addFullscreenRectangle, getLayout, setupResponsiveScene } from './responsive';

type StoryStage =
  | 'intro'
  | 'miningTutorial'
  | 'councilExterior'
  | 'afterMining'
  | 'councilIntro'
  | 'councilResult'
  | 'afterVerification'
  | 'afterChain';
type LocationKey = 'introInterior' | 'outsideCave' | 'councilExterior' | 'house' | 'cave' | 'council' | 'forge';
type Speaker =
  | 'You'
  | 'Door'
  | 'Old Man'
  | 'Blacksmith'
  | 'Ledger Warden'
  | 'Seal Sage'
  | 'Echo Watcher'
  | 'Concord Chair';

type StoryEvent = 'knock' | 'oldManEnter' | 'faceForward';

interface StoryLine {
  speaker: Speaker;
  text: string;
  event?: StoryEvent;
}

interface StoryBeat {
  location: LocationKey;
  title: string;
  nextScene: string;
  nextData?: Record<string, unknown>;
  oldManStartsOffscreen?: boolean;
  lines: StoryLine[];
}

const storyBeats: Record<StoryStage, StoryBeat> = {
  intro: {
    location: 'introInterior',
    title: 'Morning at Home',
    nextScene: 'StoryScene',
    nextData: { stage: 'miningTutorial' },
    lines: [
      {
        speaker: 'You',
        text: 'Morning already... today is my first shift in the mines.',
      },
      {
        speaker: 'You',
        text: 'I packed my lunch, my notes, and the bravest face I could find.',
      },
      {
        speaker: 'You',
        text: 'Everyone says mining a block is just guessing numbers. That sounds suspiciously like homework with a helmet.',
      },
      {
        speaker: 'You',
        text: 'If I can mine one block today, maybe I can prove I belong here.',
      },
      {
        speaker: 'Door',
        text: 'Knock knock.',
        event: 'knock',
      },
      {
        speaker: 'You',
        text: 'Who is it? Oh, come in!',
        event: 'oldManEnter',
      },
      {
        speaker: 'Old Man',
        text: 'Morning, young miner. Your first shift starts at the caves.',
      },
      {
        speaker: 'You',
        text: 'I was just getting ready. I packed everything... mostly courage.',
      },
      {
        speaker: 'Old Man',
        text: 'Courage helps. So does patience. Mining means trying little codes until one finally fits.',
      },
      {
        speaker: 'You',
        text: 'So it is not magic. It is a lot of work that other people can check.',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. Come along. Let us turn that work into your first block.',
      },
    ],
  },
  miningTutorial: {
    location: 'outsideCave',
    title: 'Outside the Mines',
    nextScene: 'MiningScene',
    lines: [
      {
        speaker: 'Old Man',
        text: 'Here we are. Before you swing, let us keep this simple.',
      },
      {
        speaker: 'Old Man',
        text: 'A block is like a page of payments. Mining is finding the right short code for that page.',
      },
      {
        speaker: 'You',
        text: 'So the shiny ore is not just treasure. It is the code the village will accept.',
      },
      {
        speaker: 'Old Man',
        text: 'Right. First, gather energy. That stands for the effort miners spend trying again and again.',
      },
      {
        speaker: 'Old Man',
        text: 'Then find the special ore. Hold it steady until the bar fills. No heroic dropping at the last second.',
      },
      {
        speaker: 'You',
        text: 'Charge up, find the right code, and hold long enough to prove I did the work.',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. Each round gets faster, because miners are always racing to finish first.',
      },
      {
        speaker: 'You',
        text: 'Got it. Find the right code, spend the effort, finish the block.',
      },
    ],
  },
  afterMining: {
    location: 'cave',
    title: 'Lesson 2: Verification',
    nextScene: 'VerificationScene',
    oldManStartsOffscreen: true,
    lines: [
      {
        speaker: 'You',
        text: 'I did it... the block accepted my code. My arms are filing a complaint.',
      },
      {
        speaker: 'Old Man',
        text: 'Well done. You proved you worked for that block. But we still need to check the payment inside.',
      },
      {
        speaker: 'Old Man',
        text: 'Your block carries TX-01. Before the village trusts it, we ask: is this payment honest?',
      },
      {
        speaker: 'You',
        text: 'So mining finds the block. Verification checks if the payment inside is real.',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. We check three things: enough coins, the real owner approved it, and the coins were not already spent.',
      },
      {
        speaker: 'Old Man',
        text: 'Come. The council loves checking things. It is their job after all.',
      },
    ],
  },
  councilExterior: {
    location: 'councilExterior',
    title: 'Council of Miners',
    nextScene: 'VerificationScene',
    lines: [
      {
        speaker: 'Old Man',
        text: 'This is the Council of Miners. Every new block comes here before the village trusts it.',
      },
      {
        speaker: 'You',
        text: 'So they are the village fact-checkers?',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. Your code proves effort. The council checks whether the payment itself makes sense.',
      },
      {
        speaker: 'Old Man',
        text: 'Inside, each member checks one simple question about TX-01.',
      },
      {
        speaker: 'You',
        text: 'And if the answers line up, the block can move on.',
      },
      {
        speaker: 'Old Man',
        text: 'That is verification. Less mysterious, more paperwork. In we go.',
      },
    ],
  },
  councilIntro: {
    location: 'council',
    title: 'Council Verification',
    nextScene: 'VerificationScene',
    lines: [
      {
        speaker: 'Old Man',
        text: 'Before TX-01 joins the chain, the council will check it piece by piece.',
      },
      {
        speaker: 'Ledger Warden',
        text: 'I am the Ledger Warden. I ask: does the sender have enough coins?',
      },
      {
        speaker: 'Seal Sage',
        text: 'I am the Seal Sage. I ask: did the real owner approve this payment?',
      },
      {
        speaker: 'Echo Watcher',
        text: 'I am the Echo Watcher. I ask: are these same coins being spent twice? Rude, if true.',
      },
      {
        speaker: 'Concord Chair',
        text: 'And I am the Concord Chair. If our answers agree, we call that consensus.',
      },
      {
        speaker: 'You',
        text: 'So verification is not guessing. It is checking the payment from a few angles.',
      },
    ],
  },
  councilResult: {
    location: 'council',
    title: 'Consensus Reached',
    nextScene: 'StoryScene',
    nextData: { stage: 'afterVerification' },
    oldManStartsOffscreen: true,
    lines: [
      {
        speaker: 'Ledger Warden',
        text: 'You read the numbers well. If someone lacks the coins, the payment cannot pass.',
      },
      {
        speaker: 'Seal Sage',
        text: 'You checked the seal. A payment needs approval from the real owner.',
      },
      {
        speaker: 'Echo Watcher',
        text: 'You caught the repeats. The same coins cannot buy two things at once. Nice try, coins.',
      },
      {
        speaker: 'Concord Chair',
        text: 'Consensus is reached. We checked the facts and agree your block is ready for the chain.',
      },
      {
        speaker: 'Concord Chair',
        text: 'You helped keep the village record honest. Well done, young miner.',
      },
      {
        speaker: 'Old Man',
        text: 'My thanks, council. Hard work plus good checking makes a block the village can trust.',
        event: 'oldManEnter',
      },
      {
        speaker: 'You',
        text: 'So mining made the block, and verification proved the payment inside was okay.',
        event: 'faceForward',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. Now we take that checked block to the forge and attach it to the blocks before it.',
      },
    ],
  },
  afterVerification: {
    location: 'council',
    title: 'Lesson 3: Blockchain',
    nextScene: 'ChainScene',
    nextData: { skipIntro: false },
    lines: [
      {
        speaker: 'You',
        text: 'The council checked the coins, the owner, and whether anyone tried to spend twice.',
      },
      {
        speaker: 'Old Man',
        text: 'When everyone checks the same facts and agrees, that is consensus. Fancy word. Useful word.',
      },
      {
        speaker: 'Old Man',
        text: 'At the forge, you will attach your block to the story that came before it.',
      },
      {
        speaker: 'You',
        text: 'To the forge, then. I want to see how blocks hold hands. Block hands. You know what I mean.',
      },
    ],
  },
  afterChain: {
    location: 'forge',
    title: 'Chain Forge',
    nextScene: 'EndingScene',
    lines: [
      {
        speaker: 'Blacksmith',
        text: 'There. Your block is linked cleanly. The chain remembers what came before it.',
      },
      {
        speaker: 'You',
        text: 'My block is part of the chain now. Each block carries a little fingerprint of the block before it.',
      },
      {
        speaker: 'Old Man',
        text: 'And if someone changes an old block, the later fingerprints stop matching.',
      },
      {
        speaker: 'You',
        text: 'So the chain makes tampering obvious. The story tattles on anyone who edits it.',
      },
      {
        speaker: 'Blacksmith',
        text: 'Aye. Change one old link, and every later link complains loudly.',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. Your first block is mined, checked, and chained. Not bad for a first day.',
      },
    ],
  },
};

export default class StoryScene extends Phaser.Scene {
  private stage: StoryStage = 'intro';
  private lineIndex = 0;
  private beat!: StoryBeat;
  private speakerText?: Phaser.GameObjects.Text;
  private bodyText?: Phaser.GameObjects.Text;
  private mentor?: Phaser.GameObjects.Container;
  private speakerActors: Partial<Record<Speaker, Phaser.GameObjects.Container>> = {};
  private oldManEntered = false;

  constructor() {
    super('StoryScene');
  }

  init(data: { stage?: StoryStage }) {
    this.stage = data.stage ?? 'intro';
    this.lineIndex = 0;
    this.beat = storyBeats[this.stage];
    this.speakerActors = {};
    this.oldManEntered = false;
  }

  preload() {
    loadGameAssets(this, [
      'mainCharIdle',
      'mainIdleUp',
      'pickaxe',
      'introInteriorExtended',
      'minesExteriorExtended',
      'councilBuildingOutsideExtended',
      'councilInteriorExtended',
      'oldManIdle',
      'blacksmithSceneExtended',
      'blacksmithIdleFront',
      'ledgerWardenIdle',
      'sealSageIdle',
      'echoWatcherIdle',
      'concordChairIdle',
    ]);
  }

  create() {
    setupResponsiveScene(this);
    void arduinoBridge.reportScene(`StoryScene:${this.stage}`);
    saveCheckpoint({ scene: 'StoryScene', data: { stage: this.stage } });
    this.cameras.main.setBackgroundColor('#0f172a');
    createSharedAnimations(this);
    const isIntroInterior = this.beat.location === 'introInterior';
    const isOutsideCave = this.beat.location === 'outsideCave';
    const isCouncilExterior = this.beat.location === 'councilExterior';
    const isCouncilInterior = this.beat.location === 'council';
    const isForge = this.beat.location === 'forge';
    this.drawLocation(this.beat.location);
    const layout = getLayout(this);
    const introActorY = Math.max(604, layout.safeBottom - 58);

    const usesTopDialogue = isIntroInterior || isOutsideCave || isCouncilExterior || isCouncilInterior || isForge;

    const youngMinerPoint = isIntroInterior
      ? { x: 180, y: introActorY }
      : isOutsideCave || isCouncilExterior
        ? { x: 88, y: 626 }
        : isCouncilInterior
          ? { x: 180, y: 600 }
          : { x: 92, y: 376 };
    const youngMinerScale = isIntroInterior ? 4.4 : isOutsideCave || isCouncilExterior ? 3.4 : isCouncilInterior ? 2.2 : 1.7;
    const shouldShowOldMan = this.beat.lines.some((line) => line.speaker === 'Old Man');
    if (isForge) {
      this.addForgeEpilogueActors();
    } else {
      this.addYoungMiner(
        youngMinerPoint.x,
        youngMinerPoint.y,
        !(isIntroInterior || isOutsideCave || isCouncilInterior),
        youngMinerScale,
        isCouncilInterior,
      );
      this.speakerActors.You = this.children.getByName('youngMiner') as Phaser.GameObjects.Container;
    }

    if (shouldShowOldMan && !isForge) {
      const oldManPoint = isIntroInterior
        ? { x: layout.right + 64, y: introActorY }
        : isOutsideCave || isCouncilExterior
          ? { x: 272, y: 626 }
          : isCouncilInterior
            ? { x: this.beat.oldManStartsOffscreen ? 426 : 286, y: 602 }
            : { x: this.beat.oldManStartsOffscreen ? 405 : 268, y: 372 };
      const oldManScale = isIntroInterior || isOutsideCave || isCouncilExterior ? youngMinerScale : isCouncilInterior ? 2.2 : 1.7;
      this.mentor = this.addOldMan(oldManPoint.x, oldManPoint.y, oldManScale);
      this.speakerActors['Old Man'] = this.mentor;
    }

    if (this.beat.oldManStartsOffscreen && this.mentor && this.stage !== 'councilResult') {
      this.time.delayedCall(650, () => {
        this.tweens.add({
          targets: this.mentor,
          x: 268,
          duration: 700,
          ease: 'Sine.easeInOut',
        });
      });
    }

    this.createTextBox(usesTopDialogue);
    this.renderLine();

    this.input.on('pointerdown', this.advance, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.advance, this);
    });
  }

  private advance() {
    this.lineIndex += 1;

    if (this.lineIndex >= this.beat.lines.length) {
      this.cameras.main.fadeOut(220, 8, 13, 24);
      this.time.delayedCall(230, () => {
        saveCheckpoint({ scene: this.beat.nextScene, data: this.beat.nextData });
        this.scene.start(this.beat.nextScene, this.beat.nextData);
      });
      return;
    }

    this.renderLine();
  }

  private createTextBox(placeAtTop = false) {
    const layout = getLayout(this);
    const boxY = placeAtTop ? layout.safeTop + 86 : layout.safeBottom - 86;
    const speakerY = boxY - 68;
    const bodyY = boxY - 36;
    const hintY = boxY + 74;
    const bg = this.add.rectangle(180, boxY, 322, 172, 0x020617, 0.92).setStrokeStyle(3, 0x475569);
    this.speakerText = this.add.text(34, speakerY, '', {
      color: '#86efac',
      fontSize: '13px',
      fontFamily: 'monospace',
    });
    this.bodyText = this.add.text(34, bodyY, '', {
      color: '#e2e8f0',
      fontSize: '14px',
      fontFamily: 'monospace',
      lineSpacing: 8,
      wordWrap: { width: 292 },
    });
    const hint = this.add.text(180, hintY, 'Tap to continue', {
      color: '#64748b',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.container(0, 0, [bg, this.speakerText, this.bodyText, hint]);
  }

  private renderLine() {
    const line = this.beat.lines[this.lineIndex];
    this.speakerText?.setText(line.speaker);
    this.speakerText?.setColor(this.speakerColor(line.speaker));
    this.bodyText?.setText(line.text);

    if (line.event === 'knock') this.showKnockEffect();
    if (line.event === 'oldManEnter') this.stageIntroConversation();
    if (line.event === 'faceForward') this.faceYoungMinerForward();

    const actor = this.speakerActors[line.speaker];
    if (actor) {
      this.tweens.add({
        targets: actor,
        y: actor.y - 10,
        yoyo: true,
        duration: 140,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private drawLocation(location: LocationKey) {
    if (location === 'introInterior') {
      addFullscreenRectangle(this, 0x1f2937);
      addCoverImage(this, assetKeys.introInteriorExtended);
      const layout = getLayout(this);
      this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.08);
      return;
    }

    if (location === 'outsideCave') {
      addFullscreenRectangle(this, 0x243b2d);
      addCoverImage(this, assetKeys.minesExteriorExtended);
      const layout = getLayout(this);
      this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.08);
      return;
    }

    if (location === 'councilExterior') {
      addFullscreenRectangle(this, 0x172033);
      addCoverImage(this, assetKeys.councilBuildingOutsideExtended);
      const layout = getLayout(this);
      this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.14);
      return;
    }

    if (location === 'house') {
      addFullscreenRectangle(this, 0x12263a);
      this.add.rectangle(180, 226, 288, 120, 0x1e3a5f).setStrokeStyle(3, 0x60a5fa);
      this.add.text(180, 226, 'MINING LESSON', {
        color: '#dbeafe',
        fontSize: '22px',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.add.rectangle(180, 366, 290, 160, 0x0f172a).setStrokeStyle(3, 0x334155);
      this.add.text(180, 344, 'Goal', {
        color: '#86efac',
        fontSize: '14px',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.add.text(180, 390, 'Spend effort.\nTry different numbers.\nFind the right block code.', {
        color: '#cbd5e1',
        fontSize: '14px',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 10,
      }).setOrigin(0.5);
    }

    if (location === 'cave') {
      addFullscreenRectangle(this, 0x131b2c);
      this.add.rectangle(180, 226, 288, 120, 0x2b2344).setStrokeStyle(3, 0xc084fc);
      this.add.text(180, 226, 'VERIFICATION LESSON', {
        color: '#ede9fe',
        fontSize: '20px',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.add.rectangle(180, 366, 290, 160, 0x0f172a).setStrokeStyle(3, 0x475569);
      this.add.text(180, 344, 'Check', {
        color: '#facc15',
        fontSize: '14px',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.add.text(180, 390, 'Enough coins.\nOwner approved it.\nCoins not spent twice.', {
        color: '#cbd5e1',
        fontSize: '14px',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 10,
      }).setOrigin(0.5);
    }

    if (location === 'council') {
      addFullscreenRectangle(this, 0x111827);
      addCoverImage(this, assetKeys.councilInteriorExtended);
      const layout = getLayout(this);
      this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.18);
      this.createCouncilSprite(72, 488, 'Ledger Warden', assetKeys.ledgerWardenIdle, 'ledger-warden-idle', 1.55);
      this.createCouncilSprite(144, 466, 'Seal Sage', assetKeys.sealSageIdle, 'seal-sage-idle', 1.42);
      this.createCouncilSprite(216, 466, 'Echo Watcher', assetKeys.echoWatcherIdle, 'echo-watcher-idle', 1.46);
      this.createCouncilSprite(288, 488, 'Concord Chair', assetKeys.concordChairIdle, 'concord-chair-idle', 1.5);
    }

    if (location === 'forge') {
      addFullscreenRectangle(this, 0x180f0a);
      addCoverImage(this, assetKeys.blacksmithSceneExtended);
      const layout = getLayout(this);
      this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.12);
    }
  }

  private addForgeEpilogueActors() {
    const blacksmith = this.add.container(180, 435, [
      this.add.sprite(0, 0, assetKeys.blacksmithIdleFront, 0)
        .setOrigin(0.5, 1)
        .setScale(2.55)
        .play('blacksmith-idle-front'),
    ]);
    blacksmith.setName('blacksmith');
    this.speakerActors.Blacksmith = blacksmith;

    this.addYoungMiner(120, 612, false, 2.55);
    this.speakerActors.You = this.children.getByName('youngMiner') as Phaser.GameObjects.Container;

    const oldMan = this.addOldMan(240, 612, 2.55);
    this.speakerActors['Old Man'] = oldMan;
  }

  private addYoungMiner(x: number, y: number, includePick = true, scale = 1.7, faceAway = false) {
    const minerSprite = this.add.sprite(0, 0, faceAway ? assetKeys.mainIdleUp : assetKeys.mainCharIdle, 0)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .play(faceAway ? 'main-idle-up' : 'main-char-idle');
    const minerParts: Phaser.GameObjects.GameObject[] = [minerSprite];
    if (includePick) {
      minerParts.unshift(this.add.image(16, -4, assetKeys.pickaxe).setScale(1.2).setAngle(-28));
    }
    const miner = this.add.container(x, y, minerParts);
    miner.setSize(56, 80);
    miner.setName('youngMiner');
    return miner;
  }

  private addOldMan(x: number, y: number, scale = 1.7) {
    const sprite = this.add.sprite(0, 0, assetKeys.oldManIdle, 0)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .play('old-man-idle');
    const oldMan = this.add.container(x, y, [sprite]);
    oldMan.setSize(56, 80);
    oldMan.setName('oldMan');
    return oldMan;
  }

  private showKnockEffect() {
    const knock = this.add.text(282, 330, 'KNOCK\nKNOCK', {
      color: '#facc15',
      fontSize: '18px',
      fontFamily: 'monospace',
      align: 'center',
      stroke: '#020617',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(6);

    this.tweens.add({
      targets: knock,
      x: '+=5',
      yoyo: true,
      repeat: 5,
      duration: 45,
      ease: 'Stepped',
      onComplete: () => {
        this.tweens.add({
          targets: knock,
          alpha: 0,
          duration: 300,
          onComplete: () => knock.destroy(),
        });
      },
    });
  }

  private stageIntroConversation() {
    if (this.oldManEntered || !this.mentor) return;
    this.oldManEntered = true;

    const youngMiner = this.speakerActors.You;
    if (youngMiner && this.stage !== 'councilResult') {
      this.tweens.add({
        targets: youngMiner,
        x: 100,
        duration: 420,
        ease: 'Sine.easeInOut',
      });
    }

    this.tweens.add({
      targets: this.mentor,
      x: this.stage === 'councilResult' ? 286 : 260,
      duration: 620,
      ease: 'Sine.easeInOut',
    });
  }

  private faceYoungMinerForward() {
    const youngMiner = this.speakerActors.You;
    const sprite = youngMiner?.list.find((child): child is Phaser.GameObjects.Sprite => child instanceof Phaser.GameObjects.Sprite);
    if (!sprite) return;

    sprite.setTexture(assetKeys.mainCharIdle, 0);
    sprite.play('main-char-idle');
  }

  private createCouncilSprite(
    x: number,
    y: number,
    name: Speaker,
    texture: string,
    animation: string,
    scale: number,
  ) {
    const glow = this.add.ellipse(0, 2, 48, 14, 0xfacc15, 0.12);
    const sprite = this.add.sprite(0, 0, texture, 0)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .play(animation);
    const label = this.add.text(0, -64, this.shortCouncilName(name), {
      color: '#f8fafc',
      fontSize: '7px',
      fontFamily: 'monospace',
      stroke: '#020617',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const member = this.add.container(x, y, [glow, sprite, label]);
    this.speakerActors[name] = member;
    return member;
  }

  private shortCouncilName(name: Speaker) {
    if (name === 'Ledger Warden') return 'Ledger';
    if (name === 'Seal Sage') return 'Seal';
    if (name === 'Echo Watcher') return 'Echo';
    if (name === 'Concord Chair') return 'Concord';
    return name;
  }

  private speakerColor(speaker: Speaker) {
    if (speaker === 'You') return '#86efac';
    if (speaker === 'Door') return '#facc15';
    if (speaker === 'Old Man') return '#facc15';
    if (speaker === 'Blacksmith') return '#fb923c';
    if (speaker === 'Ledger Warden') return '#86efac';
    if (speaker === 'Seal Sage') return '#60a5fa';
    if (speaker === 'Echo Watcher') return '#fb923c';
    return '#c4b5fd';
  }

}
