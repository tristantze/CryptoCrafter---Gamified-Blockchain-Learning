import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

import MainMenuScene from './MainMenuScene';
import DialogueScene from './DialogueScene';
import StoryScene from './StoryScene';
import MiningScene from './MiningScene';
import VerificationScene from './VerificationScene';
import ChainScene from './ChainScene';
import EndingScene from './EndingScene';
import { loadSavedGame } from './progress';
import { BASE_GAME_HEIGHT, BASE_GAME_WIDTH } from './responsive';

function viewportSize(host: HTMLElement) {
  return {
    width: Math.max(BASE_GAME_WIDTH, Math.round(host.clientWidth || window.innerWidth || BASE_GAME_WIDTH)),
    height: Math.max(BASE_GAME_HEIGHT, Math.round(host.clientHeight || window.innerHeight || BASE_GAME_HEIGHT)),
  };
}

export function GameContainer() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    loadSavedGame();

    const sceneMap = {
      MainMenuScene,
      StoryScene,
      DialogueScene,
      MiningScene,
      VerificationScene,
      ChainScene,
      EndingScene,
    } as const;

    const sceneOrder = [
      MainMenuScene,
      StoryScene,
      DialogueScene,
      MiningScene,
      VerificationScene,
      ChainScene,
      EndingScene,
    ];
    const params = new URLSearchParams(window.location.search);
    const bootSceneName = params.get('scene') as keyof typeof sceneMap | null;
    const bootScene = bootSceneName && sceneMap[bootSceneName] ? sceneMap[bootSceneName] : null;
    const orderedScenes = bootScene
      ? [bootScene, ...sceneOrder.filter((scene) => scene !== bootScene)]
      : sceneOrder;

    const initialSize = viewportSize(hostRef.current);
    const config = {
      type: Phaser.AUTO,
      width: initialSize.width,
      height: initialSize.height,
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
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER,
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
    const refreshScale = () => {
      window.setTimeout(() => {
        if (!hostRef.current || !gameRef.current) return;
        const nextSize = viewportSize(hostRef.current);
        gameRef.current.scale.resize(nextSize.width, nextSize.height);
        gameRef.current.scale.refresh();
      }, 60);
    };

    window.addEventListener('resize', refreshScale);
    window.addEventListener('orientationchange', refreshScale);

    return () => {
      window.removeEventListener('resize', refreshScale);
      window.removeEventListener('orientationchange', refreshScale);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={hostRef} id="game-container" />;
}
