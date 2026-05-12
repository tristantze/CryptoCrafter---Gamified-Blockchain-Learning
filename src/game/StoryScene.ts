import Phaser from 'phaser';
import { assetKeys, createSharedAnimations, loadGameAssets } from './assets';

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
        text: 'Everyone says mining a block is just guessing numbers, but it sounds harder than that.',
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
        text: 'Courage helps, but mining needs effort. You try hashes until one meets the target.',
      },
      {
        speaker: 'You',
        text: 'So it is not magic. It is work the whole network can check.',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. Come along, and we will turn that work into your first block.',
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
        text: 'Here we are. Before you swing, remember what mining really means.',
      },
      {
        speaker: 'Old Man',
        text: 'A block is like a sealed page of transactions. To mine it, you search for a hash the network accepts.',
      },
      {
        speaker: 'You',
        text: 'That means the correct ore is not random treasure. It is the hash that matches the target.',
      },
      {
        speaker: 'Old Man',
        text: 'Right. First, gather energy. That represents computing effort, the work miners spend trying possibilities.',
      },
      {
        speaker: 'Old Man',
        text: 'Then find the special crypto ore. Hold it steady to mine, and do not let go until the progress bar fills.',
      },
      {
        speaker: 'You',
        text: 'So I charge up, identify the target hash, then hold to prove enough work was spent.',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. Faster rounds mean pressure rises, just like real miners compete to find valid blocks first.',
      },
      {
        speaker: 'You',
        text: 'Understood. Find the valid hash, spend effort, and finish the block.',
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
        text: 'I did it... the block accepted my hash. That took real effort.',
      },
      {
        speaker: 'Old Man',
        text: 'Well done. Mining proves you spent work, but it does not prove every transaction is valid.',
      },
      {
        speaker: 'Old Man',
        text: 'Your block carries TX-01. Before the village accepts it, the transaction facts must be checked.',
      },
      {
        speaker: 'You',
        text: 'So mining finds the block, but verification checks whether the block deserves trust.',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. Next, inspect the balance, the signature, and whether the coins were already spent.',
      },
      {
        speaker: 'Old Man',
        text: 'Come. The second trial is verification.',
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
        text: 'This is the Council of Miners. Every mined block comes here before the village accepts it.',
      },
      {
        speaker: 'You',
        text: 'The banners match the checks you mentioned: balance, signature, double-spend, and agreement.',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. A valid hash proves effort, but the council verifies the transaction facts.',
      },
      {
        speaker: 'Old Man',
        text: 'Inside, each council member will inspect TX-01 from a different angle.',
      },
      {
        speaker: 'You',
        text: 'Then we only approve the block if the checks agree.',
      },
      {
        speaker: 'Old Man',
        text: 'That is the heart of verification. Let us go in.',
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
        text: 'Before TX-01 enters the chain, the council will inspect it from four sides.',
      },
      {
        speaker: 'Ledger Warden',
        text: 'I am the Ledger Warden. I check that the sender actually has enough coins to spend.',
      },
      {
        speaker: 'Seal Sage',
        text: 'I am the Seal Sage. I verify that the transaction was truly authorized by its owner.',
      },
      {
        speaker: 'Echo Watcher',
        text: 'I watch for double spends. If those same coins were already used, I reject the transaction.',
      },
      {
        speaker: 'Concord Chair',
        text: 'And I am the Concord Chair. When all our checks agree, the council reaches consensus.',
      },
      {
        speaker: 'You',
        text: 'So verification is not one guess. It is several checks that must all agree on the same transaction.',
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
        text: 'You read the ledgers well. A block with impossible spending cannot earn trust.',
      },
      {
        speaker: 'Seal Sage',
        text: 'You respected the seals. A transaction must be signed by the rightful owner.',
      },
      {
        speaker: 'Echo Watcher',
        text: 'You caught the echoes. The same coins must never be accepted twice.',
      },
      {
        speaker: 'Concord Chair',
        text: 'Consensus is reached. Your block, and the extra candidate blocks you reviewed, are ready for the chain.',
      },
      {
        speaker: 'Concord Chair',
        text: 'You have helped the council keep the village ledger honest. Well done, young miner.',
      },
      {
        speaker: 'Old Man',
        text: 'My thanks, council. Your guidance turned hard work into something the village can trust.',
        event: 'oldManEnter',
      },
      {
        speaker: 'You',
        text: 'So mining found the block, but verification proved it deserved to be accepted.',
        event: 'faceForward',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. Now we take that verified block to the forge and learn how it links to the blocks before it.',
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
        text: 'The council checked the balance, the sender, and the signature before agreeing.',
      },
      {
        speaker: 'Old Man',
        text: 'That agreement is consensus. Many miners look at the same facts and reach the same result.',
      },
      {
        speaker: 'Old Man',
        text: 'At the forge, you will link that exact block to history.',
      },
      {
        speaker: 'You',
        text: 'To the forge, then. I want to see how the blocks hold together.',
      },
    ],
  },
  afterChain: {
    location: 'forge',
    title: 'Chain Forge',
    nextScene: 'MainMenuScene',
    lines: [
      {
        speaker: 'Blacksmith',
        text: 'There. Your block is linked cleanly. The chain remembers what came before.',
      },
      {
        speaker: 'You',
        text: 'My block is part of the chain now. Every block carried the hash of the one before it.',
      },
      {
        speaker: 'Old Man',
        text: 'And if anyone tampers with an old block, the later links stop matching.',
      },
      {
        speaker: 'You',
        text: 'So the chain protects the story of what happened.',
      },
      {
        speaker: 'Blacksmith',
        text: 'Aye. Change one old link, and every later link complains.',
      },
      {
        speaker: 'Old Man',
        text: 'Exactly. The reward box is unlocked. Not bad for your first day, miner.',
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
      'introInterior',
      'minesExterior',
      'councilBuildingOutside',
      'councilInterior',
      'oldManIdle',
      'blacksmithScene',
      'blacksmithIdleFront',
      'ledgerWardenIdle',
      'sealSageIdle',
      'echoWatcherIdle',
      'concordChairIdle',
    ]);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a');
    createSharedAnimations(this);
    const isIntroInterior = this.beat.location === 'introInterior';
    const isOutsideCave = this.beat.location === 'outsideCave';
    const isCouncilExterior = this.beat.location === 'councilExterior';
    const isCouncilInterior = this.beat.location === 'council';
    const isForge = this.beat.location === 'forge';
    this.drawLocation(this.beat.location);

    const usesTopDialogue = isIntroInterior || isOutsideCave || isCouncilExterior || isCouncilInterior || isForge;

    const youngMinerPoint = isIntroInterior
      ? { x: 180, y: 604 }
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
        ? { x: 424, y: 604 }
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
        this.scene.start(this.beat.nextScene, this.beat.nextData);
      });
      return;
    }

    this.renderLine();
  }

  private createTextBox(placeAtTop = false) {
    const boxY = placeAtTop ? 112 : 516;
    const speakerY = placeAtTop ? 44 : 448;
    const bodyY = placeAtTop ? 76 : 480;
    const hintY = placeAtTop ? 186 : 590;
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
      this.add.image(180, 320, assetKeys.introInterior)
        .setOrigin(0.5)
        .setScale(0.26);
      this.add.rectangle(180, 320, 360, 640, 0x020617, 0.08);
      return;
    }

    if (location === 'outsideCave') {
      this.add.image(180, 320, assetKeys.minesExterior)
        .setOrigin(0.5)
        .setScale(0.262);
      this.add.rectangle(180, 320, 360, 640, 0x020617, 0.08);
      return;
    }

    if (location === 'councilExterior') {
      this.add.image(180, 320, assetKeys.councilBuildingOutside)
        .setOrigin(0.5)
        .setScale(0.248);
      this.add.rectangle(180, 320, 360, 640, 0x020617, 0.14);
      return;
    }

    if (location === 'house') {
      this.add.rectangle(180, 320, 360, 640, 0x12263a);
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
      this.add.text(180, 390, 'Spend effort.\nTry different nonces.\nFind a hash under target.', {
        color: '#cbd5e1',
        fontSize: '14px',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 10,
      }).setOrigin(0.5);
    }

    if (location === 'cave') {
      this.add.rectangle(180, 320, 360, 640, 0x131b2c);
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
      this.add.text(180, 390, 'Sender balance.\nSignature validity.\nNo double spend.', {
        color: '#cbd5e1',
        fontSize: '14px',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 10,
      }).setOrigin(0.5);
    }

    if (location === 'council') {
      this.add.image(180, 320, assetKeys.councilInterior)
        .setOrigin(0.5)
        .setScale(0.2345);
      this.add.rectangle(180, 320, 360, 640, 0x020617, 0.18);
      this.createCouncilSprite(72, 488, 'Ledger Warden', assetKeys.ledgerWardenIdle, 'ledger-warden-idle', 1.55);
      this.createCouncilSprite(144, 466, 'Seal Sage', assetKeys.sealSageIdle, 'seal-sage-idle', 1.42);
      this.createCouncilSprite(216, 466, 'Echo Watcher', assetKeys.echoWatcherIdle, 'echo-watcher-idle', 1.46);
      this.createCouncilSprite(288, 488, 'Concord Chair', assetKeys.concordChairIdle, 'concord-chair-idle', 1.5);
    }

    if (location === 'forge') {
      this.add.image(180, 320, assetKeys.blacksmithScene)
        .setOrigin(0.5)
        .setScale(0.248);
      this.add.rectangle(180, 320, 360, 640, 0x020617, 0.12);
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
