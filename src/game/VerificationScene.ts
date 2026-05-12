import Phaser from 'phaser';
import { assetKeys, createSharedAnimations, loadGameAssets } from './assets';
import { awardReward, progress } from './progress';

type CouncilCheckId = 'ledger' | 'seal' | 'echo' | 'concord';
type Verdict = 'pass' | 'reject';

interface DialogueLine {
  speaker: string;
  text: string;
}

interface CouncilMember {
  id: CouncilCheckId;
  name: string;
  title: string;
  texture: string;
  animation: string;
  x: number;
  y: number;
  scale: number;
  locked?: boolean;
}

interface TransactionCase {
  id: string;
  summary: string;
  sender: string;
  receiver: string;
  amount: number;
  expectedVerdict: Verdict;
  evidence: Record<Exclude<CouncilCheckId, 'concord'>, {
    prompt: string;
    correct: Verdict;
    success: string;
    failure: string;
  }>;
}

const COUNCIL_MEMBERS: CouncilMember[] = [
  {
    id: 'ledger',
    name: 'Ledger Warden',
    title: 'Balance Check',
    texture: assetKeys.ledgerWardenIdle,
    animation: 'ledger-warden-idle',
    x: 72,
    y: 488,
    scale: 1.55,
  },
  {
    id: 'seal',
    name: 'Seal Sage',
    title: 'Signature Check',
    texture: assetKeys.sealSageIdle,
    animation: 'seal-sage-idle',
    x: 144,
    y: 466,
    scale: 1.42,
  },
  {
    id: 'echo',
    name: 'Echo Watcher',
    title: 'Double-Spend Check',
    texture: assetKeys.echoWatcherIdle,
    animation: 'echo-watcher-idle',
    x: 216,
    y: 466,
    scale: 1.46,
  },
  {
    id: 'concord',
    name: 'Concord Chair',
    title: 'Final Verdict',
    texture: assetKeys.concordChairIdle,
    animation: 'concord-chair-idle',
    x: 288,
    y: 488,
    scale: 1.5,
    locked: true,
  },
];

const TRANSACTION_CASES: TransactionCase[] = [
  {
    id: 'TX-01',
    summary: 'Mina -> Shopkeeper, 25 coins',
    sender: 'Mina',
    receiver: 'Shopkeeper',
    amount: 25,
    expectedVerdict: 'pass',
    evidence: {
      ledger: {
        prompt: 'Mina balance: 40 coins. Amount: 25 coins.',
        correct: 'pass',
        success: 'Balance is enough, so this check passes.',
        failure: 'The sender has enough coins. This should pass.',
      },
      seal: {
        prompt: 'Signature seal matches Mina\'s public key.',
        correct: 'pass',
        success: 'The owner authorized this transaction.',
        failure: 'The signature matches. This should pass.',
      },
      echo: {
        prompt: 'No earlier transaction used these coins.',
        correct: 'pass',
        success: 'No double spend was found.',
        failure: 'The coins were not used before. This should pass.',
      },
    },
  },
  {
    id: 'TX-02',
    summary: 'Mina -> Blacksmith, 25 coins',
    sender: 'Mina',
    receiver: 'Blacksmith',
    amount: 25,
    expectedVerdict: 'reject',
    evidence: {
      ledger: {
        prompt: 'Mina balance: 12 coins. Amount: 25 coins.',
        correct: 'reject',
        success: 'Good catch. The sender cannot afford this transaction.',
        failure: 'Balance is too low. This must be rejected.',
      },
      seal: {
        prompt: 'Signature seal matches Mina\'s public key.',
        correct: 'pass',
        success: 'Signature is valid, but one bad check can still reject the transaction.',
        failure: 'The signature is valid. This check should pass.',
      },
      echo: {
        prompt: 'No earlier transaction used these coins.',
        correct: 'pass',
        success: 'No double spend was found.',
        failure: 'No double spend appears here. This check should pass.',
      },
    },
  },
  {
    id: 'TX-03',
    summary: 'Mina -> Miner Guild, 10 coins',
    sender: 'Mina',
    receiver: 'Miner Guild',
    amount: 10,
    expectedVerdict: 'reject',
    evidence: {
      ledger: {
        prompt: 'Mina balance: 40 coins. Amount: 10 coins.',
        correct: 'pass',
        success: 'Balance is enough.',
        failure: 'The sender can afford this. This check should pass.',
      },
      seal: {
        prompt: 'Signature seal belongs to Rowan, not Mina.',
        correct: 'reject',
        success: 'Correct. The wrong signature means no authorization.',
        failure: 'Wrong signer. This must be rejected.',
      },
      echo: {
        prompt: 'These coins already appeared in TX-00.',
        correct: 'reject',
        success: 'Correct. Reusing the same coins would be a double spend.',
        failure: 'The coins were already spent. This must be rejected.',
      },
    },
  },
];

const MEMBER_INTROS: Record<CouncilCheckId, string> = {
  ledger: 'I keep the ledger. If the sender lacks enough coins, the transaction cannot stand.',
  seal: 'I read the seal. A valid signature proves the owner truly authorized the transfer.',
  echo: 'I listen for echoes. If the same coins appear twice, one transaction must be false.',
  concord: 'I wait for agreement. Consensus only comes after the facts line up.',
};

const CLOSING_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'Ledger Warden',
    text: 'The balances have been tested. No accepted transaction spent coins it did not own.',
  },
  {
    speaker: 'Seal Sage',
    text: 'The signatures have spoken. Authorization separates a true transfer from an impostor.',
  },
  {
    speaker: 'Echo Watcher',
    text: 'No echo slipped through. Coins cannot be accepted twice.',
  },
  {
    speaker: 'Concord Chair',
    text: 'The council agrees. Your block may carry verified transactions into the chain.',
  },
];

export default class VerificationScene extends Phaser.Scene {
  private selectedMember: CouncilMember = COUNCIL_MEMBERS[0];
  private completedChecks = new Set<CouncilCheckId>();
  private caseIndex = 0;
  private mistakes = 0;
  private memberSprites = new Map<CouncilCheckId, Phaser.GameObjects.Sprite>();
  private memberLabels = new Map<CouncilCheckId, Phaser.GameObjects.Text>();
  private introducedMembers = new Set<CouncilCheckId>();
  private glow?: Phaser.GameObjects.Ellipse;
  private speakerText?: Phaser.GameObjects.Text;
  private bodyText?: Phaser.GameObjects.Text;
  private transactionText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private passButton?: Phaser.GameObjects.Container;
  private rejectButton?: Phaser.GameObjects.Container;
  private worldLayer?: Phaser.GameObjects.Container;
  private uiLayer?: Phaser.GameObjects.Container;
  private dialogueOverlay?: Phaser.GameObjects.Container;
  private closingDialogueIndex = 0;
  private isClosingDialogue = false;
  private isIntroTutorialActive = false;

  constructor() {
    super('VerificationScene');
  }

  init() {
    this.selectedMember = COUNCIL_MEMBERS[0];
    this.completedChecks = new Set<CouncilCheckId>();
    this.caseIndex = 0;
    this.mistakes = 0;
    this.memberSprites = new Map<CouncilCheckId, Phaser.GameObjects.Sprite>();
    this.memberLabels = new Map<CouncilCheckId, Phaser.GameObjects.Text>();
    this.introducedMembers = new Set<CouncilCheckId>();
    this.dialogueOverlay = undefined;
    this.closingDialogueIndex = 0;
    this.isClosingDialogue = false;
    this.isIntroTutorialActive = false;
  }

  preload() {
    loadGameAssets(this, [
      'councilInterior',
      'mainIdleUp',
      'ledgerWardenIdle',
      'sealSageIdle',
      'echoWatcherIdle',
      'concordChairIdle',
    ]);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a');
    createSharedAnimations(this);
    this.worldLayer = this.add.container(0, 0).setDepth(0);
    this.uiLayer = this.add.container(0, 0).setDepth(10).setAlpha(0);
    this.drawChamber();
    this.drawPlayer();
    this.drawCouncilMembers();
    this.drawCheckPanel();
    this.focusMember('ledger');
    this.renderPanel();
    this.setButtonsEnabled(false);
    this.isIntroTutorialActive = true;
    this.playIntroZoom();
  }

  private drawChamber() {
    const background = this.add.image(180, 320, assetKeys.councilInterior)
      .setOrigin(0.5)
      .setScale(0.2345);
    const shade = this.add.rectangle(180, 320, 360, 640, 0x020617, 0.16);
    this.worldLayer?.add([background, shade]);

  }

  private drawPlayer() {
    const shadow = this.add.ellipse(180, 545, 42, 13, 0x020617, 0.36);
    const player = this.add.sprite(180, 548, assetKeys.mainIdleUp, 0)
      .setOrigin(0.5, 1)
      .setScale(2.05)
      .play('main-idle-up');
    this.worldLayer?.add([shadow, player]);
  }

  private drawCouncilMembers() {
    COUNCIL_MEMBERS.forEach((member) => {
      const shadow = this.add.ellipse(member.x, member.y + 5, 36, 10, 0x020617, 0.34);
      const sprite = this.add.sprite(member.x, member.y, member.texture, 0)
        .setOrigin(0.5, 1)
        .setScale(member.scale)
        .play(member.animation);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.selectMember(member.id));
      this.memberSprites.set(member.id, sprite);

      const label = this.add.text(member.x, member.y - 72, this.shortName(member), {
        color: '#f8fafc',
        fontSize: '7px',
        fontFamily: 'monospace',
        align: 'center',
        backgroundColor: '#020617aa',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
      label.setInteractive({ useHandCursor: true });
      label.on('pointerdown', () => this.selectMember(member.id));
      this.memberLabels.set(member.id, label);
      shadow.setInteractive({ useHandCursor: true });
      shadow.on('pointerdown', () => this.selectMember(member.id));
      this.worldLayer?.add([shadow, sprite, label]);
    });
  }

  private drawCheckPanel() {
    const bg = this.add.rectangle(180, 112, 326, 160, 0x020617, 0.94).setStrokeStyle(3, 0x475569);
    this.transactionText = this.add.text(180, 52, '', {
      color: '#dbeafe',
      fontSize: '10px',
      fontFamily: 'monospace',
      align: 'center',
      lineSpacing: 5,
    }).setOrigin(0.5);
    this.speakerText = this.add.text(28, 84, '', {
      color: '#86efac',
      fontSize: '12px',
      fontFamily: 'monospace',
    });
    this.bodyText = this.add.text(28, 106, '', {
      color: '#e2e8f0',
      fontSize: '10px',
      fontFamily: 'monospace',
      lineSpacing: 4,
      wordWrap: { width: 300 },
    });
    this.statusText = this.add.text(286, 84, '', {
      color: '#facc15',
      fontSize: '10px',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.passButton = this.createVerdictButton(132, 154, 'PASS', 0x22c55e, 'pass');
    this.rejectButton = this.createVerdictButton(228, 154, 'REJECT', 0xef4444, 'reject');
    this.uiLayer?.add([
      bg,
      this.transactionText,
      this.speakerText,
      this.bodyText,
      this.statusText,
      this.passButton,
      this.rejectButton,
    ]);
  }

  private createVerdictButton(x: number, y: number, labelText: string, color: number, verdict: Verdict) {
    const bg = this.add.rectangle(0, 0, 86, 34, color).setStrokeStyle(2, 0xffffff, 0.45);
    const label = this.add.text(0, 0, labelText, {
      color: '#020617',
      fontSize: '11px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    const button = this.add.container(x, y, [bg, label]);
    button.setSize(86, 34).setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => {
      if (!this.isClosingDialogue && !this.dialogueOverlay && !this.isIntroTutorialActive) this.answerSelected(verdict);
    });
    return button;
  }

  private selectMember(id: CouncilCheckId) {
    if (this.isIntroTutorialActive) return;
    if (this.isClosingDialogue || this.dialogueOverlay) return;

    const member = COUNCIL_MEMBERS.find((candidate) => candidate.id === id);
    if (!member) return;

    if (member.locked && !this.coreChecksComplete()) {
      this.showLockedConsensus();
      return;
    }

    this.selectedMember = member;
    this.focusMember(member.id);
    this.glow?.destroy();
    this.glow = this.add.ellipse(member.x, member.y + 2, 52, 16, 0xfacc15, 0.28)
      .setStrokeStyle(2, 0xfacc15, 0.75);
    this.worldLayer?.add(this.glow);
    this.renderPanel();
    this.showMemberIntro(member);
  }

  private answerSelected(verdict: Verdict) {
    if (this.isIntroTutorialActive) return;
    if (this.dialogueOverlay) return;
    if (this.completedChecks.has(this.selectedMember.id)) return;

    if (this.selectedMember.id === 'concord') {
      this.answerFinalVerdict(verdict);
      return;
    }

    const evidence = this.currentCase().evidence[this.selectedMember.id as Exclude<CouncilCheckId, 'concord'>];
    if (verdict === evidence.correct) {
      this.completedChecks.add(this.selectedMember.id);
      this.markMemberComplete(this.selectedMember);
      this.showFeedback(evidence.success, '#86efac');
      if (this.coreChecksComplete()) {
        this.time.delayedCall(520, () => this.selectMember('concord'));
      } else {
        this.renderPanel();
      }
      return;
    }

    this.mistakes += 1;
    this.cameras.main.shake(110, 0.004);
    this.showFeedback(evidence.failure, '#fecaca');
  }

  private answerFinalVerdict(verdict: Verdict) {
    const txCase = this.currentCase();
    if (verdict !== txCase.expectedVerdict) {
      this.mistakes += 1;
      this.cameras.main.shake(140, 0.005);
      this.showFeedback(`The final verdict should ${txCase.expectedVerdict.toUpperCase()}. Review the failed check.`, '#fecaca');
      return;
    }

    this.completedChecks.add('concord');
    this.markMemberComplete(this.selectedMember);
    this.showFeedback(`Consensus reached: ${txCase.id} will ${verdict.toUpperCase()}.`, '#86efac');
    this.time.delayedCall(820, () => this.advanceCase());
  }

  private advanceCase() {
    if (this.caseIndex >= TRANSACTION_CASES.length - 1) {
      this.approve();
      return;
    }

    this.caseIndex += 1;
    this.completedChecks.clear();
    this.clearBadges();
    this.selectMember('ledger');
  }

  private renderPanel() {
    const txCase = this.currentCase();
    this.transactionText?.setText([
      `Case ${this.caseIndex + 1}/${TRANSACTION_CASES.length} - ${txCase.id}`,
      `${txCase.summary} | Mistakes: ${this.mistakes}`,
    ]);

    const isDone = this.completedChecks.has(this.selectedMember.id);
    if (this.selectedMember.id === 'concord') {
      this.speakerText?.setText(`${this.selectedMember.name} - ${this.selectedMember.title}`);
      this.bodyText?.setText(`Specialist checks complete.\nShould ${txCase.id} be accepted by consensus?`);
      this.statusText?.setText(isDone ? 'DONE' : 'FINAL');
      this.statusText?.setColor(isDone ? '#86efac' : '#facc15');
      this.setButtonsEnabled(!isDone);
      return;
    }

    const evidence = txCase.evidence[this.selectedMember.id as Exclude<CouncilCheckId, 'concord'>];
    this.speakerText?.setText(`${this.selectedMember.name} - ${this.selectedMember.title}`);
    this.bodyText?.setText(`${evidence.prompt}\nShould this check pass or reject?`);
    this.statusText?.setText(isDone ? 'DONE' : 'CHECK');
    this.statusText?.setColor(isDone ? '#86efac' : '#facc15');
    this.setButtonsEnabled(!isDone);
  }

  private showFeedback(text: string, color: string) {
    this.bodyText?.setText(text);
    this.bodyText?.setColor(color);
    this.time.delayedCall(620, () => {
      this.bodyText?.setColor('#e2e8f0');
      this.renderPanel();
    });
  }

  private setButtonsEnabled(enabled: boolean) {
    [this.passButton, this.rejectButton].forEach((button) => {
      button?.setAlpha(enabled ? 1 : 0.42);
    });
  }

  private markMemberComplete(member: CouncilMember) {
    const badge = this.add.circle(member.x + 18, member.y - 70, 8, 0x22c55e);
    badge.setData('badge', true);
    const tick = this.add.text(member.x + 18, member.y - 70, 'OK', {
      color: '#052e16',
      fontSize: '7px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    tick.setData('badge', true);
    this.worldLayer?.add([badge, tick]);
    this.tweens.add({
      targets: [badge, tick],
      scale: 1.2,
      yoyo: true,
      duration: 140,
      ease: 'Sine.easeInOut',
    });
    this.focusMember(this.selectedMember.id);
  }

  private clearBadges() {
    this.worldLayer?.getAll().forEach((child) => {
      const gameObject = child as Phaser.GameObjects.GameObject;
      if (gameObject.getData('badge')) gameObject.destroy();
    });
  }

  private showLockedConsensus() {
    this.focusMember('concord');
    this.speakerText?.setText('Concord Chair - Final Verdict');
    this.bodyText?.setText('The chair waits until Ledger, Seal, and Echo have all checked the evidence.');
    this.statusText?.setText('LOCKED');
    this.statusText?.setColor('#facc15');
    this.setButtonsEnabled(false);
  }

  private coreChecksComplete() {
    return this.completedChecks.has('ledger') && this.completedChecks.has('seal') && this.completedChecks.has('echo');
  }

  private currentCase() {
    return TRANSACTION_CASES[this.caseIndex];
  }

  private shortName(member: CouncilMember) {
    if (member.id === 'ledger') return 'Ledger';
    if (member.id === 'seal') return 'Seal';
    if (member.id === 'echo') return 'Echo';
    return 'Concord';
  }

  private playIntroZoom() {
    if (!this.worldLayer) return;

    this.worldLayer.setScale(1.22);
    this.worldLayer.setPosition(-40, -104);
    this.tweens.add({
      targets: this.worldLayer,
      scaleX: 1,
      scaleY: 1,
      x: 0,
      y: 0,
      duration: 1050,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.uiLayer,
          alpha: 1,
          duration: 260,
          ease: 'Sine.easeOut',
          onComplete: () => this.showOpeningTutorial(),
        });
      },
    });
  }

  private showOpeningTutorial() {
    this.showDialogue(
      'Council Verification',
      [
        'There are 3 transaction rounds.',
        'For each round, ask Ledger, Seal, and Echo to inspect the evidence.',
        'Choose PASS or REJECT for each specialist check, then let Concord decide the final result.',
        'Think like a validator: one bad check can reject the whole transaction.',
      ].join('\n'),
      undefined,
      () => {
        const concord = COUNCIL_MEMBERS.find((member) => member.id === 'concord');
        this.showDialogue(
          'Concord Chair',
          'Your mined block is not alone, apprentice. The council has received several candidate blocks from nearby miners.',
          concord,
          () => {
            this.showDialogue(
              'Concord Chair',
              'Since you are here, why do we not review those blocks together? Verify each one carefully, so only valid transactions are allowed into the chain.',
              concord,
              () => {
                this.isIntroTutorialActive = false;
                this.selectMember('ledger');
              },
            );
          },
        );
      },
    );
  }

  private focusMember(selectedId: CouncilCheckId) {
    COUNCIL_MEMBERS.forEach((member) => {
      const isSelected = member.id === selectedId;
      const isComplete = this.completedChecks.has(member.id);
      const sprite = this.memberSprites.get(member.id);
      const label = this.memberLabels.get(member.id);
      sprite?.setAlpha(isSelected || isComplete ? 1 : 0.45);
      sprite?.setTint(isSelected || isComplete ? 0xffffff : 0x6b7280);
      label?.setAlpha(isSelected || isComplete ? 1 : 0.55);
    });
  }

  private approve() {
    progress.block.status = 'verified';
    progress.verificationComplete = true;
    awardReward('Council Stamp');
    this.cameras.main.flash(160, 34, 197, 94);
    this.time.delayedCall(360, () => this.startClosingDialogue());
  }

  private showMemberIntro(member: CouncilMember) {
    if (this.introducedMembers.has(member.id)) return;

    this.introducedMembers.add(member.id);
    this.showDialogue(member.name, MEMBER_INTROS[member.id], member, () => {
      if (!this.isClosingDialogue && this.selectedMember.id === member.id) this.renderPanel();
    });
  }

  private startClosingDialogue() {
    this.isClosingDialogue = true;
    this.closingDialogueIndex = 0;
    this.setButtonsEnabled(false);
    this.passButton?.disableInteractive();
    this.rejectButton?.disableInteractive();
    this.showClosingDialogueLine();
  }

  private advanceClosingDialogue() {
    if (!this.isClosingDialogue) return;

    this.closingDialogueIndex += 1;
    if (this.closingDialogueIndex >= CLOSING_DIALOGUE.length) {
      this.input.off('pointerdown', this.advanceClosingDialogue, this);
      this.cameras.main.fadeOut(220, 8, 13, 24);
      this.time.delayedCall(230, () => this.scene.start('StoryScene', { stage: 'councilResult' }));
      return;
    }

    this.showClosingDialogueLine();
  }

  private showClosingDialogueLine() {
    const line = CLOSING_DIALOGUE[this.closingDialogueIndex];
    const member = COUNCIL_MEMBERS.find((candidate) => candidate.name === line.speaker);
    if (member) this.focusMember(member.id);
    this.showDialogue(line.speaker, line.text, member, () => this.advanceClosingDialogue());
  }

  private showDialogue(speaker: string, text: string, member: CouncilMember | undefined, onClose: () => void) {
    this.dialogueOverlay?.destroy(true);
    this.setButtonsEnabled(false);

    const dim = this.add.rectangle(180, 320, 360, 640, 0x020617, 0.56);
    const portraitSide = member && (member.id === 'echo' || member.id === 'concord') ? 'right' : 'left';
    const portraitX = portraitSide === 'left' ? 88 : 272;
    const portrait = member
      ? this.add.sprite(portraitX, 486, member.texture, 0)
        .setOrigin(0.5, 1)
        .setScale(4.2)
        .play(member.animation)
      : undefined;

    const box = this.add.rectangle(180, 548, 334, 164, 0x020617, 0.96).setStrokeStyle(3, 0x94a3b8);
    const nameText = this.add.text(30, 482, speaker, {
      color: '#fde68a',
      fontSize: '14px',
      fontFamily: 'monospace',
    });
    const body = this.add.text(30, 512, text, {
      color: '#e2e8f0',
      fontSize: '13px',
      fontFamily: 'monospace',
      lineSpacing: 7,
      wordWrap: { width: 300 },
    });
    const hint = this.add.text(180, 614, 'Tap to continue', {
      color: '#64748b',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = portrait
      ? [dim, portrait, box, nameText, body, hint]
      : [dim, box, nameText, body, hint];
    this.dialogueOverlay = this.add.container(0, 0, children).setDepth(30);

    this.time.delayedCall(80, () => {
      this.input.once('pointerdown', () => {
        this.dialogueOverlay?.destroy(true);
        this.dialogueOverlay = undefined;
        this.setButtonsEnabled(
          !this.completedChecks.has(this.selectedMember.id) && !this.isClosingDialogue && !this.isIntroTutorialActive,
        );
        onClose();
      });
    });
  }
}
