import Phaser from 'phaser';
import { arduinoBridge } from './arduinoBridge';
import { assetKeys, createSharedAnimations, loadGameAssets } from './assets';
import { awardReward, progress, saveCheckpoint, syncHardwareState } from './progress';
import { addCoverImage, addFullscreenRectangle, getLayout, setupResponsiveScene } from './responsive';
import { showRewardBadge } from './rewardBadge';

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
        prompt: 'Mina has 40 coins. She wants to send 25.\nQuestion: Does she have enough coins?',
        correct: 'pass',
        success: 'Correct. 40 is more than 25, so the balance check passes.',
        failure: 'Not quite. Mina has enough coins, so this check should pass.',
      },
      seal: {
        prompt: 'The approval seal matches Mina.\nQuestion: Did the real owner approve it?',
        correct: 'pass',
        success: 'Correct. The seal matches Mina, so the owner approved it.',
        failure: 'Not quite. The seal matches Mina, so this check should pass.',
      },
      echo: {
        prompt: 'No earlier payment used these coins.\nQuestion: Are the coins being spent only once?',
        correct: 'pass',
        success: 'Correct. These coins were not used before, so this check passes.',
        failure: 'Not quite. These coins were not spent before, so this check should pass.',
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
        prompt: 'Mina has 12 coins. She wants to send 25.\nQuestion: Does she have enough coins?',
        correct: 'reject',
        success: 'Correct. Mina only has 12 coins, so a 25-coin payment must fail.',
        failure: 'Not quite. Mina does not have enough coins, so this check should reject.',
      },
      seal: {
        prompt: 'The approval seal matches Mina.\nQuestion: Did the real owner approve it?',
        correct: 'pass',
        success: 'Correct. The seal is fine, even though another check may still fail.',
        failure: 'Not quite. The owner approved this payment, so this check should pass.',
      },
      echo: {
        prompt: 'No earlier payment used these coins.\nQuestion: Are the coins being spent only once?',
        correct: 'pass',
        success: 'Correct. These coins were not used before, so this check passes.',
        failure: 'Not quite. No repeat spending appears here, so this check should pass.',
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
        prompt: 'Mina has 40 coins. She wants to send 10.\nQuestion: Does she have enough coins?',
        correct: 'pass',
        success: 'Correct. Mina can afford 10 coins, so the balance check passes.',
        failure: 'Not quite. Mina can afford this payment, so this check should pass.',
      },
      seal: {
        prompt: 'The approval seal belongs to Rowan, not Mina.\nQuestion: Did Mina approve this payment?',
        correct: 'reject',
        success: 'Correct. Wrong owner, wrong seal. This check must reject.',
        failure: 'Not quite. Rowan approved it, not Mina, so this check should reject.',
      },
      echo: {
        prompt: 'These same coins already appeared in TX-00.\nQuestion: Are the coins being spent only once?',
        correct: 'reject',
        success: 'Correct. The coins were already used, so this is double spending.',
        failure: 'Not quite. These coins were already spent, so this check should reject.',
      },
    },
  },
];

const MEMBER_INTROS: Record<CouncilCheckId, string> = {
  ledger: 'I check the wallet. If the sender does not have enough coins, the payment fails.',
  seal: 'I check the approval seal. The real owner must approve the payment.',
  echo: 'I check for repeats. Spending the same coins twice is not clever. It is rejected.',
  concord: 'I check the final answer. If every check lines up, we agree. That is consensus.',
};

const CLOSING_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'Ledger Warden',
    text: 'The coin counts are checked. No one bought something with coins they did not have.',
  },
  {
    speaker: 'Seal Sage',
    text: 'The approval seals are checked. Real owners said yes; impostors got shown the door.',
  },
  {
    speaker: 'Echo Watcher',
    text: 'No repeat spending slipped through. The same coins cannot pay twice.',
  },
  {
    speaker: 'Concord Chair',
    text: 'The council agrees. Your block may carry these checked payments into the chain.',
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
      'councilInteriorExtended',
      'mainIdleUp',
      'ledgerWardenIdle',
      'sealSageIdle',
      'echoWatcherIdle',
      'concordChairIdle',
      'verificationBadge',
    ]);
  }

  create() {
    setupResponsiveScene(this);
    void arduinoBridge.reportScene('VerificationScene');
    saveCheckpoint({ scene: 'VerificationScene' });
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
    const base = addFullscreenRectangle(this, 0x0f172a);
    const background = addCoverImage(this, assetKeys.councilInteriorExtended);
    const layout = getLayout(this);
    const shade = this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.16);
    this.worldLayer?.add([base, background, shade]);

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
    const bg = this.add.rectangle(180, 124, 326, 184, 0x020617, 0.94).setStrokeStyle(3, 0x475569);
    this.transactionText = this.add.text(180, 42, '', {
      color: '#dbeafe',
      fontSize: '10px',
      fontFamily: 'monospace',
      align: 'center',
      lineSpacing: 5,
    }).setOrigin(0.5);
    this.speakerText = this.add.text(28, 88, '', {
      color: '#86efac',
      fontSize: '12px',
      fontFamily: 'monospace',
    });
    this.bodyText = this.add.text(28, 110, '', {
      color: '#e2e8f0',
      fontSize: '10px',
      fontFamily: 'monospace',
      lineSpacing: 4,
      wordWrap: { width: 300 },
    });
    this.statusText = this.add.text(286, 88, '', {
      color: '#facc15',
      fontSize: '10px',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.passButton = this.createVerdictButton(118, 184, 'APPROVE', 0x22c55e, 'pass');
    this.rejectButton = this.createVerdictButton(242, 184, 'REJECT', 0xef4444, 'reject');
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
    const bg = this.add.rectangle(0, 0, 108, 34, color).setStrokeStyle(2, 0xffffff, 0.45);
    const label = this.add.text(0, 0, labelText, {
      color: '#020617',
      fontSize: '11px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    const button = this.add.container(x, y, [bg, label]);
    button.setSize(108, 34).setInteractive({ useHandCursor: true });
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
      const hint = txCase.expectedVerdict === 'pass'
        ? 'all checks passed, so the payment can join the block.'
        : 'at least one check failed, so the payment must stay out.';
      this.showFeedback(`Not quite. ${txCase.id} should ${this.verdictLabel(txCase.expectedVerdict)} because ${hint}`, '#fecaca');
      return;
    }

    this.completedChecks.add('concord');
    this.markMemberComplete(this.selectedMember);
    this.showFeedback(`Correct. Consensus reached: ${txCase.id} will ${this.verdictLabel(verdict)}.`, '#86efac');
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
      `Case ${this.caseIndex + 1}/${TRANSACTION_CASES.length}: ${txCase.id}`,
      `${txCase.sender} sends ${txCase.amount} coins to ${txCase.receiver}`,
      `Mistakes: ${this.mistakes}`,
    ]);

    const isDone = this.completedChecks.has(this.selectedMember.id);
    if (this.selectedMember.id === 'concord') {
      this.speakerText?.setText(`${this.selectedMember.name} - ${this.selectedMember.title}`);
      this.bodyText?.setText([
        'Ledger, Seal, and Echo have reported.',
        `Final question: should ${txCase.id} join the block?`,
        'Approve only if every important check passed.',
      ].join('\n'));
      this.statusText?.setText(isDone ? 'DONE' : 'FINAL');
      this.statusText?.setColor(isDone ? '#86efac' : '#facc15');
      this.setButtonsEnabled(!isDone);
      return;
    }

    const evidence = txCase.evidence[this.selectedMember.id as Exclude<CouncilCheckId, 'concord'>];
    this.speakerText?.setText(`${this.selectedMember.name} - ${this.selectedMember.title}`);
    this.bodyText?.setText(`${evidence.prompt}\nChoose APPROVE if this check is okay.`);
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
    this.bodyText?.setText('The chair waits until Ledger, Seal, and Echo have each answered their question.');
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

  private verdictLabel(verdict: Verdict) {
    return verdict === 'pass' ? 'APPROVE' : 'REJECT';
  }

  private shortName(member: CouncilMember) {
    if (member.id === 'ledger') return 'Ledger';
    if (member.id === 'seal') return 'Seal';
    if (member.id === 'echo') return 'Echo';
    return 'Concord';
  }

  private playIntroZoom() {
    this.worldLayer?.setScale(1);
    this.worldLayer?.setPosition(0, 0);
    this.tweens.add({
      targets: this.uiLayer,
      alpha: 1,
      duration: 260,
      ease: 'Sine.easeInOut',
      onComplete: () => this.showOpeningTutorial(),
    });
  }

  private showOpeningTutorial() {
    const concord = COUNCIL_MEMBERS.find((member) => member.id === 'concord');
    this.showDialogueSequence(
      [
        {
          speaker: 'Council Verification',
          text: 'You will inspect 3 payments. For each one, read the case file at the top.',
        },
        {
          speaker: 'Council Verification',
          text: 'Each council member asks one question. Choose APPROVE if that check looks okay.',
        },
        {
          speaker: 'Council Verification',
          text: 'Choose REJECT if the check finds a problem. One bad check can keep a payment out of the block.',
        },
        {
          speaker: 'Concord Chair',
          text: 'Your mined block needs clean payments inside it. We will practice with a few case files first.',
          member: concord,
        },
        {
          speaker: 'Concord Chair',
          text: 'Do not guess. Read the question, check the facts, then approve or reject. The paperwork can smell fear.',
          member: concord,
        },
      ],
      () => {
        this.isIntroTutorialActive = false;
        this.selectMember('ledger');
      },
    );
  }

  private showDialogueSequence(
    lines: Array<{ speaker: string; text: string; member?: CouncilMember }>,
    onComplete: () => void,
    index = 0,
  ) {
    const line = lines[index];
    if (!line) {
      onComplete();
      return;
    }

    this.showDialogue(line.speaker, line.text, line.member, () => {
      this.showDialogueSequence(lines, onComplete, index + 1);
    });
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
    syncHardwareState();
    saveCheckpoint({ scene: 'StoryScene', data: { stage: 'councilResult' } });
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
      this.dialogueOverlay?.destroy(true);
      this.dialogueOverlay = undefined;
      showRewardBadge(
        this,
        assetKeys.verificationBadge,
        'Verification Badge Earned',
        'You checked the payments before they joined the chain.',
        () => {
          this.cameras.main.fadeOut(220, 8, 13, 24);
          this.time.delayedCall(230, () => {
            saveCheckpoint({ scene: 'StoryScene', data: { stage: 'councilResult' } });
            this.scene.start('StoryScene', { stage: 'councilResult' });
          });
        },
      );
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

    const layout = getLayout(this);
    const boxY = layout.safeBottom - 86;
    const dim = this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.56);
    const portraitSide = member && (member.id === 'echo' || member.id === 'concord') ? 'right' : 'left';
    const portraitX = portraitSide === 'left' ? 88 : 272;
    const portrait = member
      ? this.add.sprite(portraitX, boxY - 62, member.texture, 0)
        .setOrigin(0.5, 1)
        .setScale(4.2)
        .play(member.animation)
      : undefined;

    const box = this.add.rectangle(180, boxY, 334, 164, 0x020617, 0.96).setStrokeStyle(3, 0x94a3b8);
    const nameText = this.add.text(30, boxY - 66, speaker, {
      color: '#fde68a',
      fontSize: '14px',
      fontFamily: 'monospace',
    });
    const body = this.add.text(30, boxY - 36, text, {
      color: '#e2e8f0',
      fontSize: '13px',
      fontFamily: 'monospace',
      lineSpacing: 7,
      wordWrap: { width: 300 },
    });
    const hint = this.add.text(180, boxY + 66, 'Tap to continue', {
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
