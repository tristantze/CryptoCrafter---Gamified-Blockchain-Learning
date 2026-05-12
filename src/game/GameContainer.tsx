import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

import MainMenuScene from './MainMenuScene';
import DialogueScene from './DialogueScene';
import StoryScene from './StoryScene';
import MiningScene from './MiningScene';
import VerificationScene from './VerificationScene';
import ChainScene from './ChainScene';

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

function fitIntegerScale() {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)));

  return {
    width: GAME_WIDTH * scale,
    height: GAME_HEIGHT * scale,
  };
}

export function GameContainer() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    const sceneMap = {
      MainMenuScene,
      StoryScene,
      DialogueScene,
      MiningScene,
      VerificationScene,
      ChainScene,
    } as const;

    const sceneOrder = [
      MainMenuScene,
      StoryScene,
      DialogueScene,
      MiningScene,
      VerificationScene,
      ChainScene,
    ];
    const params = new URLSearchParams(window.location.search);
    const bootSceneName = params.get('scene') as keyof typeof sceneMap | null;
    const bootScene = bootSceneName && sceneMap[bootSceneName] ? sceneMap[bootSceneName] : null;
    const orderedScenes = bootScene
      ? [bootScene, ...sceneOrder.filter((scene) => scene !== bootScene)]
      : sceneOrder;

    const config = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      parent: hostRef.current,
      backgroundColor: '#172033',
      pixelArt: true,
      roundPixels: true,
      render: {
        antialias: false,
        antialiasGL: false,
        roundPixels: true,
      },
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      scene: orderedScenes,
    } satisfies Phaser.Types.Core.GameConfig & { resolution: number };

    gameRef.current = new Phaser.Game(config);
    const resizeCanvas = () => {
      const nextSize = fitIntegerScale();
      const canvas = gameRef.current?.canvas;
      if (!canvas) return;

      canvas.style.width = `${nextSize.width}px`;
      canvas.style.height = `${nextSize.height}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={hostRef} id="game-container" />;
}
