import Phaser from 'phaser';
import { getLayout } from './responsive';

export function showRewardBadge(
  scene: Phaser.Scene,
  textureKey: string,
  title: string,
  subtitle: string,
  onComplete: () => void,
) {
  const layout = getLayout(scene);
  const overlay = scene.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x020617, 0.62);
  const panel = scene.add.container(180, 314).setAlpha(0).setScale(0.72);
  const glow = scene.add.circle(0, -38, 84, 0xfacc15, 0.18);
  const badge = scene.add.image(0, -38, textureKey).setScale(0.054);
  const titleText = scene.add.text(0, 70, title, {
    color: '#f8fafc',
    fontSize: '18px',
    fontFamily: 'monospace',
    align: 'center',
  }).setOrigin(0.5);
  const subtitleText = scene.add.text(0, 100, subtitle, {
    color: '#cbd5e1',
    fontSize: '11px',
    fontFamily: 'monospace',
    align: 'center',
    wordWrap: { width: 258 },
  }).setOrigin(0.5);

  panel.add([glow, badge, titleText, subtitleText]);
  const group = scene.add.container(0, 0, [overlay, panel]).setDepth(80);

  scene.tweens.add({
    targets: panel,
    alpha: 1,
    scale: 1,
    y: 292,
    duration: 360,
    ease: 'Back.easeOut',
  });
  scene.tweens.add({
    targets: glow,
    alpha: 0.34,
    scale: 1.18,
    yoyo: true,
    repeat: 2,
    duration: 420,
    ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: badge,
    y: -52,
    yoyo: true,
    repeat: 1,
    duration: 520,
    ease: 'Sine.easeInOut',
  });

  scene.time.delayedCall(1550, () => {
    scene.tweens.add({
      targets: group,
      alpha: 0,
      y: '-=26',
      duration: 360,
      ease: 'Sine.easeIn',
      onComplete: () => {
        group.destroy(true);
        onComplete();
      },
    });
  });
}
