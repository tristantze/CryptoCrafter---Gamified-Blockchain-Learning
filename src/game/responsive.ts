import Phaser from 'phaser';

export const BASE_GAME_WIDTH = 360;
export const BASE_GAME_HEIGHT = 640;
export const BASE_GAME_CENTER_X = BASE_GAME_WIDTH / 2;
export const BASE_GAME_CENTER_Y = BASE_GAME_HEIGHT / 2;

export interface ResponsiveLayout {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  safeLeft: number;
  safeRight: number;
  safeTop: number;
  safeBottom: number;
  designLeft: number;
  designRight: number;
  designTop: number;
  designBottom: number;
}

export function setupResponsiveScene(scene: Phaser.Scene) {
  const fitCameraToScreen = () => {
    const camera = scene.cameras.main;
    camera.setViewport(0, 0, scene.scale.width, scene.scale.height);
    camera.setZoom(Math.min(
      scene.scale.width / BASE_GAME_WIDTH,
      scene.scale.height / BASE_GAME_HEIGHT,
    ));
    camera.centerOn(BASE_GAME_CENTER_X, BASE_GAME_CENTER_Y);
  };

  fitCameraToScreen();
  scene.scale.on(Phaser.Scale.Events.RESIZE, fitCameraToScreen);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, fitCameraToScreen);
  });
}

export function getLayout(scene: Phaser.Scene): ResponsiveLayout {
  const camera = scene.cameras.main;
  const zoom = camera.zoom || 1;
  const width = scene.scale.width / zoom;
  const height = scene.scale.height / zoom;
  const centerX = BASE_GAME_CENTER_X;
  const centerY = BASE_GAME_CENTER_Y;
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;
  const margin = 18;

  return {
    width,
    height,
    centerX,
    centerY,
    left,
    right,
    top,
    bottom,
    safeLeft: left + margin,
    safeRight: right - margin,
    safeTop: top + margin,
    safeBottom: bottom - margin,
    designLeft: 0,
    designRight: BASE_GAME_WIDTH,
    designTop: 0,
    designBottom: BASE_GAME_HEIGHT,
  };
}

export function addFullscreenRectangle(
  scene: Phaser.Scene,
  color: number,
  alpha = 1,
) {
  const layout = getLayout(scene);
  return scene.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, color, alpha);
}

export function addCoverImage(scene: Phaser.Scene, textureKey: string, offsetX = 0, offsetY = 0) {
  const layout = getLayout(scene);
  const texture = scene.textures.get(textureKey);
  const source = texture.getSourceImage() as { width: number; height: number };
  const scale = Math.max(layout.width / source.width, layout.height / source.height);

  return scene.add.image(layout.centerX + offsetX, layout.centerY + offsetY, textureKey)
    .setOrigin(0.5)
    .setScale(scale);
}
