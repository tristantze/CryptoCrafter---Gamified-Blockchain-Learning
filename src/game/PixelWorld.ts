import Phaser from 'phaser';
import { assetKeys, createSharedAnimations, loadGameAssets } from './assets';
import { progress } from './progress';
import { starterTiles16, tileId, TILESET_16PX } from './tileset16Reference';

type DestinationScene = 'MiningScene' | 'VerificationScene' | 'ChainScene';
type SceneryKey = 'mine' | 'council' | 'forge';

const WORLD_WIDTH = 720;
const WORLD_HEIGHT = 960;
const VIEW_WIDTH = 360;
const CHARACTER_SCALE = 1.35;
const NPC_SCALE = 0.95;
const TREE_SCALE = 2;
const CRATE_SCALE = 2;
const ROCK_SCALE = 1.8;
const FIRE_SCALE = 6;
const TILE_SIZE = TILESET_16PX.tileWidth;
const MAP_COLUMNS = WORLD_WIDTH / TILE_SIZE;
const MAP_ROWS = WORLD_HEIGHT / TILE_SIZE;
const PLAYER_FRAME_COLUMNS = 13;
const PLAYER_IDLE_DOWN = frameId(0, 40);
const PLAYER_IDLE_SIDE = frameId(0, 7);
const PLAYER_IDLE_UP = frameId(0, 38);
const PLAYER_WALK_DOWN = [frameId(0, 41), frameId(1, 41), frameId(2, 41), frameId(1, 41)];
const PLAYER_WALK_SIDE = [frameId(0, 49), frameId(1, 49), frameId(2, 49), frameId(1, 49)];
const PLAYER_WALK_UP = [frameId(0, 46), frameId(1, 46), frameId(2, 46), frameId(1, 46)];

function frameId(col: number, row: number) {
  return row * PLAYER_FRAME_COLUMNS + col;
}

interface Destination {
  scene: DestinationScene;
  scenery: SceneryKey;
  phase: number;
  label: string;
  prompt: string;
  lockedText: string;
  zone: Phaser.GameObjects.Rectangle;
}

interface TalkSpot {
  zone: Phaser.GameObjects.Rectangle;
  message: string;
}

interface BuildingFootprint {
  centerX: number;
  maxY: number;
}

export default class PixelWorld extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerTool!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private target?: Phaser.Math.Vector2;
  private phase = 1;
  private entering = false;
  private canUseEntrances = false;
  private statusText?: Phaser.GameObjects.Text;
  private destinations: Destination[] = [];
  private talkSpots: TalkSpot[] = [];
  private playerFacing: 'down' | 'up' | 'side' = 'down';

  constructor() {
    super('PixelWorld');
  }

  init(data: { phase?: number }) {
    const params = new URLSearchParams(window.location.search);
    const bootPhase = Number.parseInt(params.get('phase') ?? '', 10);
    this.phase = data.phase ?? (Number.isFinite(bootPhase) ? bootPhase : this.phase);
    this.entering = false;
    this.canUseEntrances = false;
    this.target = undefined;
    this.destinations = [];
    this.talkSpots = [];
  }

  preload() {
    loadGameAssets(this, [
      'playerTopDown',
      'pickaxe',
      'villagerIdle',
      'treeOne',
      'treeTwo',
      'fire',
      'crateBase',
      'crateTop',
      'rock',
      'councilBuilding',
      'marketBuilding',
      'forgeBuilding',
      'homeBuilding',
      'shrineBuilding',
      'tileset16',
    ]);
  }

  create() {
    this.cameras.main.setBackgroundColor('#7ab56c');
    createSharedAnimations(this);
    this.createPlayerAnimations();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.drawMap();

    this.cursors = this.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys);
    const start = this.startPoint();
    this.player = this.physics.add.sprite(start.x, start.y, assetKeys.playerTopDown, PLAYER_IDLE_DOWN);
    this.player.setOrigin(0.5, 1);
    this.player.setScale(CHARACTER_SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(14, 10);
    this.player.body?.setOffset(25, 52);
    this.playerTool = this.add.image(start.x, start.y, assetKeys.pickaxe)
      .setOrigin(0.35, 0.85)
      .setScale(0.6);
    this.syncPlayerPresentation(false);

    this.drawVillageLife();
    this.drawGuide();
    this.bindDestinationOverlaps();

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(68, 92);

    this.add.text(16, 14, this.objectiveText(), {
      color: '#f8fafc',
      fontSize: '12px',
      fontFamily: 'monospace',
      backgroundColor: '#14532d',
      padding: { x: 8, y: 5 },
      wordWrap: { width: 318 },
    }).setScrollFactor(0).setDepth(40);

    this.add.text(18, 618, 'Tap to walk. Step onto the glowing entrance.', {
      color: '#052e16',
      fontSize: '11px',
      fontFamily: 'monospace',
      backgroundColor: '#fef3c7',
      padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(40);

    this.add.text(16, 46, this.progressText(), {
      color: '#e2e8f0',
      fontSize: '10px',
      fontFamily: 'monospace',
      backgroundColor: '#0f172a',
      padding: { x: 7, y: 4 },
      wordWrap: { width: 318 },
    }).setScrollFactor(0).setDepth(40);

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.time.delayedCall(650, () => {
      this.canUseEntrances = true;
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.handlePointerDown, this);
    });
  }

  update() {
    const speed = 128;
    let vx = 0;
    let vy = 0;
    let moving = false;

    if (this.cursors.left?.isDown) vx -= speed;
    if (this.cursors.right?.isDown) vx += speed;
    if (this.cursors.up?.isDown) vy -= speed;
    if (this.cursors.down?.isDown) vy += speed;

    if (vx !== 0 || vy !== 0) {
      moving = true;
      this.target = undefined;
      this.player.setVelocity(vx, vy);
      this.player.body?.velocity.normalize().scale(speed);
      this.updatePlayerFacing(vx, vy);
    } else if (this.target) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.target.x, this.target.y);
      if (distance < 7) {
        this.player.setVelocity(0, 0);
        this.target = undefined;
      } else {
        moving = true;
        this.physics.moveToObject(this.player, this.target, speed);
        this.updatePlayerFacing(this.target.x - this.player.x, this.target.y - this.player.y);
      }
    } else {
      this.player.setVelocity(0, 0);
    }

    if (moving) {
      this.player.play(this.walkAnimationForFacing(), true);
    } else {
      this.player.stop();
      this.player.setFrame(this.idleFrameForFacing());
    }

    this.syncPlayerPresentation(moving);
  }

  private syncPlayerPresentation(moving: boolean) {
    const flipTool = this.playerFacing === 'side' && this.player.flipX;
    const handX = this.playerFacing === 'side'
      ? this.player.x + (flipTool ? -11 : 11)
      : this.player.x + 8;
    const handY = this.player.y - (moving ? 22 : 24);
    this.player.setDepth(this.player.y);
    this.playerTool
      .setPosition(handX, handY)
      .setFlipX(flipTool)
      .setAngle(this.toolAngleForFacing(flipTool))
      .setDepth(this.player.depth + 1);
  }

  private createPlayerAnimations() {
    this.createFrameAnimation('player-topdown-walk-down', PLAYER_WALK_DOWN);
    this.createFrameAnimation('player-topdown-walk-side', PLAYER_WALK_SIDE);
    this.createFrameAnimation('player-topdown-walk-up', PLAYER_WALK_UP);
  }

  private createFrameAnimation(key: string, frames: number[]) {
    if (this.anims.exists(key)) return;

    this.anims.create({
      key,
      frames: frames.map((frame) => ({ key: assetKeys.playerTopDown, frame })),
      frameRate: 8,
      repeat: -1,
    });
  }

  private updatePlayerFacing(vx: number, vy: number) {
    if (Math.abs(vx) > Math.abs(vy)) {
      this.playerFacing = 'side';
      this.player.setFlipX(vx < 0);
      return;
    }

    this.player.setFlipX(false);
    this.playerFacing = vy < 0 ? 'up' : 'down';
  }

  private idleFrameForFacing() {
    if (this.playerFacing === 'up') return PLAYER_IDLE_UP;
    if (this.playerFacing === 'side') return PLAYER_IDLE_SIDE;
    return PLAYER_IDLE_DOWN;
  }

  private walkAnimationForFacing() {
    if (this.playerFacing === 'up') return 'player-topdown-walk-up';
    if (this.playerFacing === 'side') return 'player-topdown-walk-side';
    return 'player-topdown-walk-down';
  }

  private toolAngleForFacing(flipTool: boolean) {
    if (this.playerFacing === 'up') return flipTool ? 110 : -110;
    if (this.playerFacing === 'down') return flipTool ? 90 : -90;
    return flipTool ? 140 : -140;
  }

  private drawMap() {
    const ground = this.add.renderTexture(0, 0, WORLD_WIDTH, WORLD_HEIGHT).setOrigin(0, 0).setDepth(0);

    this.paintGrassBase(ground);
    this.paintForestFloor(ground);
    this.paintClearings(ground);
    this.paintRoadLayer(ground);
    this.paintTopDetails(ground);

    this.placeCouncil(24, 8);
    this.placeForge(30, 34);
    this.placeHome(12, 38);
    this.placeMarket(13, 21);
    this.placeShrine(28, 48);

    this.placeMineEntrance(530, 218);
    this.placeTrees();
    this.placeProps();
  }

  private paintGrassBase(ground: Phaser.GameObjects.RenderTexture) {
    const grassA = this.namedTile('grass-fill-a');
    const grassB = this.namedTile('grass-fill-b');
    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let col = 0; col < MAP_COLUMNS; col += 1) {
        const frame = (col + row) % 5 === 0 ? grassB : grassA;
        this.drawTile(ground, frame, col, row);
      }
    }
  }

  private paintForestFloor(ground: Phaser.GameObjects.RenderTexture) {
    const darkGrass = this.tile(2, 0);
    const forestBands = [
      { col: 0, row: 0, width: 12, height: 18 },
      { col: 32, row: 0, width: 13, height: 18 },
      { col: 0, row: 33, width: 9, height: 27 },
      { col: 34, row: 37, width: 11, height: 23 },
      { col: 12, row: 14, width: 5, height: 8 },
      { col: 9, row: 28, width: 5, height: 8 },
      { col: 28, row: 22, width: 4, height: 9 },
    ];

    forestBands.forEach(({ col, row, width, height }) => {
      for (let y = row; y < row + height; y += 1) {
        for (let x = col; x < col + width; x += 1) {
          const frame = (x + y) % 3 === 0 ? darkGrass : this.namedTile('grass-fill-b');
          this.drawTile(ground, frame, x, y);
        }
      }
    });
  }

  private paintClearings(ground: Phaser.GameObjects.RenderTexture) {
    const meadow = this.namedTile('grass-fill-a');
    const meadowAlt = this.namedTile('grass-fill-b');
    const sand = this.tile(5, 1);
    const clearings = [
      { col: 20, row: 6, width: 17, height: 13, type: 'meadow' },
      { col: 28, row: 31, width: 15, height: 13, type: 'meadow' },
      { col: 8, row: 36, width: 15, height: 16, type: 'meadow' },
      { col: 16, row: 18, width: 15, height: 12, type: 'meadow' },
      { col: 27, row: 46, width: 11, height: 9, type: 'meadow' },
      { col: 34, row: 24, width: 8, height: 20, type: 'sand' },
    ] as const;

    clearings.forEach(({ col, row, width, height, type }) => {
      for (let y = row; y < row + height; y += 1) {
        for (let x = col; x < col + width; x += 1) {
          const frame = type === 'sand' ? sand : (x + y) % 4 === 0 ? meadowAlt : meadow;
          this.drawTile(ground, frame, x, y);
        }
      }
    });
  }

  private paintRoadLayer(ground: Phaser.GameObjects.RenderTexture) {
    const path = this.namedTile('path-fill-a');

    this.fillTileRect(ground, 15, 27, 18, 4, path);
    this.fillTileRect(ground, 23, 14, 4, 17, path);
    this.fillTileRect(ground, 19, 18, 12, 4, path);
    this.fillTileRect(ground, 32, 31, 4, 12, path);
    this.fillTileRect(ground, 14, 44, 18, 3, path);
    this.fillTileRect(ground, 17, 33, 3, 12, path);
    this.fillTileRect(ground, 33, 37, 7, 4, path);
  }

  private paintTopDetails(ground: Phaser.GameObjects.RenderTexture) {
    const rock = this.namedTile('rock-pile-a');

    [
      [34, 14, rock],
      [36, 16, rock],
      [38, 34, rock],
      [40, 35, rock],
      [31, 50, rock],
      [13, 33, rock],
    ].forEach(([col, row, frame]) => {
      this.drawTile(ground, frame as number, col as number, row as number);
    });
  }

  private placeCouncil(col: number, row: number) {
    const footprint = this.placeLandmarkSprite(assetKeys.councilBuilding, col, row);
    this.createBuildingLabel(footprint, 'Council');
    this.createDestination(
      footprint.centerX,
      footprint.maxY - 28,
      98,
      34,
      'Council',
      'VerificationScene',
      'council',
      2,
      'Enter the council hall.',
      'Mine a block first.',
    );
  }

  private placeForge(col: number, row: number) {
    const footprint = this.placeLandmarkSprite(assetKeys.forgeBuilding, col, row);
    this.add.sprite((col + 13) * TILE_SIZE, (row + 8) * TILE_SIZE, assetKeys.fire, 0)
      .setOrigin(0.5, 1)
      .setScale(FIRE_SCALE)
      .play('forge-fire')
      .setDepth((row + 8) * TILE_SIZE);
    this.createBuildingLabel(footprint, 'Forge');
    this.createDestination(
      footprint.centerX,
      footprint.maxY - 28,
      96,
      34,
      'Forge',
      'ChainScene',
      'forge',
      3,
      'Enter the chain forge.',
      'Win council consensus first.',
    );
  }

  private placeHome(col: number, row: number) {
    const footprint = this.placeLandmarkSprite(assetKeys.homeBuilding, col, row);
    this.createBuildingLabel(footprint, 'Home');
  }

  private placeMarket(col: number, row: number) {
    const footprint = this.placeLandmarkSprite(assetKeys.marketBuilding, col, row);
    this.add.image((col + 7) * TILE_SIZE, (row + 7) * TILE_SIZE, assetKeys.crateBase)
      .setOrigin(0.5, 1)
      .setScale(CRATE_SCALE * 0.9)
      .setDepth((row + 7) * TILE_SIZE);
    this.add.image((col + 9) * TILE_SIZE, (row + 7) * TILE_SIZE, assetKeys.crateTop)
      .setOrigin(0.5, 1)
      .setScale(CRATE_SCALE * 0.9)
      .setDepth((row + 7) * TILE_SIZE + 1);
    this.createBuildingLabel(footprint, 'Market');
  }

  private placeShrine(col: number, row: number) {
    const footprint = this.placeLandmarkSprite(assetKeys.shrineBuilding, col, row);
    this.createBuildingLabel(footprint, 'Shrine');
  }

  private placeLandmarkSprite(key: string, col: number, row: number): BuildingFootprint {
    const texture = this.textures.get(key).getSourceImage() as { width: number; height: number };
    const x = col * TILE_SIZE + texture.width / 2;
    const y = row * TILE_SIZE + texture.height;
    this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y);
    return {
      centerX: x,
      maxY: y,
    };
  }

  private createBuildingLabel(footprint: BuildingFootprint, label: string) {
    this.add.text(footprint.centerX, footprint.maxY + 18, label, {
      color: '#052e16',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(footprint.maxY + 1);
  }

  private placeMineEntrance(x: number, y: number) {
    const depth = y + 50;
    this.stampPrefab(45, 2, 8, 6, 29, 9, depth);
    this.add.ellipse(x + 10, y + 38, 70, 34, 0x12070a).setDepth(depth + 1);
    this.add.image(x - 30, y + 46, assetKeys.rock).setScale(ROCK_SCALE).setDepth(depth + 2);
    this.add.image(x + 42, y + 50, assetKeys.rock).setScale(ROCK_SCALE * 0.92).setDepth(depth + 2);
    this.add.text(x + 2, y - 34, 'Mines', {
      color: '#052e16',
      fontSize: '12px',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(depth + 3);

    this.createDestination(x + 4, y + 42, 86, 34, 'Mines', 'MiningScene', 'mine', 1, 'Enter the crystal mines.', '');
  }

  private placeTrees() {
    this.placeForestCluster(60, 120, 4, 4, 38, 24);
    this.placeForestCluster(650, 120, 3, 5, 34, 26);
    this.placeForestCluster(34, 700, 2, 4, 34, 24);
    this.placeForestCluster(646, 720, 3, 4, 36, 26);
    this.placeForestCluster(228, 316, 2, 3, 40, 26);
    this.placeForestCluster(520, 450, 2, 3, 38, 24);
    this.placeForestCluster(458, 780, 2, 2, 36, 22);
  }

  private placeForestCluster(startX: number, startY: number, cols: number, rows: number, stepX: number, stepY: number) {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const offsetX = row % 2 === 0 ? 0 : 14;
        const x = startX + col * stepX + offsetX;
        const y = startY + row * stepY;
        const key = (row + col) % 2 === 0 ? assetKeys.treeOne : assetKeys.treeTwo;
        const anim = key === assetKeys.treeOne ? 'tree-one-sway' : 'tree-two-sway';
        this.add.sprite(x, y, key, 0)
          .setOrigin(0.5, 1)
          .setScale(TREE_SCALE)
          .play(anim)
          .setDepth(y);
      }
    }
  }

  private placeProps() {
    [
      [254, 670, assetKeys.crateBase, CRATE_SCALE, 670],
      [284, 670, assetKeys.crateTop, CRATE_SCALE, 671],
      [636, 714, assetKeys.rock, ROCK_SCALE, 714],
      [656, 736, assetKeys.rock, ROCK_SCALE * 0.9, 736],
    ].forEach(([x, y, key, scale, depth]) => {
      if (key === assetKeys.fire) {
        this.add.sprite(x as number, y as number, key as string, 0)
          .setOrigin(0.5, 1)
          .setScale(scale as number)
          .play('forge-fire')
          .setDepth(depth as number);
      } else {
        this.add.image(x as number, y as number, key as string)
          .setOrigin(0.5, 1)
          .setScale(scale as number)
          .setDepth(depth as number);
      }
    });
  }

  private drawVillageLife() {
    this.createTalkSpot(314, 766, 'Wallets are like names on the ledger. They help us track who can spend what.');
    this.drawVillager(314, 736, 0x38bdf8, 'Wallet Kid');

    this.createTalkSpot(422, 284, 'Hash signs are tiny fingerprints. Change the data, and the fingerprint changes too.');
    this.drawVillager(422, 254, 0xf59e0b, 'Hash Clerk');

    this.createTalkSpot(556, 600, 'The reward box opens only when your block is mined, verified, and chained.');
    this.drawRewardBox(556, 568);

    this.createSign(338, 738, 'Block Job Board', 'Today: mine one block, verify TX-01, link it into the village chain.');
  }

  private drawGuide() {
    const target = this.currentDestinationPoint();
    const x = target.x + (target.x > 180 ? -60 : 60);
    const y = target.y + 18;

    this.add.sprite(x, y, assetKeys.villagerIdle, 0)
      .setOrigin(0.5, 1)
      .setScale(NPC_SCALE)
      .setTint(0xf59e0b)
      .play('villager-idle')
      .setDepth(y);

    this.add.text(x, y + 22, 'Old Man', {
      color: '#052e16',
      fontSize: '9px',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(y + 1);
  }

  private drawVillager(x: number, y: number, color: number, name: string) {
    this.add.sprite(x, y + 18, assetKeys.villagerIdle, 0)
      .setOrigin(0.5, 1)
      .setScale(NPC_SCALE)
      .play('villager-idle')
      .setTint(color)
      .setDepth(y + 18);
    this.add.text(x, y + 42, name, {
      color: '#052e16',
      fontSize: '8px',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5).setDepth(y + 19);
  }

  private drawRewardBox(x: number, y: number) {
    this.add.image(x, y + 8, assetKeys.crateBase)
      .setOrigin(0.5, 1)
      .setScale(CRATE_SCALE)
      .setTint(progress.boxUnlocked ? 0xfacc15 : 0xffffff)
      .setDepth(y + 8);
    this.add.image(x, y - 8, assetKeys.crateTop)
      .setOrigin(0.5, 1)
      .setScale(CRATE_SCALE)
      .setAngle(progress.boxUnlocked ? -16 : 0)
      .setDepth(y + 9);
    this.add.text(x, y + 38, progress.boxUnlocked ? 'Box Open' : 'Reward Box', {
      color: '#052e16',
      fontSize: '8px',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5).setDepth(y + 10);
  }

  private createSign(x: number, y: number, label: string, message: string) {
    this.add.rectangle(x, y, 68, 42, 0x7c4a24).setStrokeStyle(2, 0x451a03).setDepth(y);
    this.add.rectangle(x, y + 34, 8, 28, 0x451a03).setDepth(y - 1);
    this.add.text(x, y, label, {
      color: '#fef3c7',
      fontSize: '8px',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 58 },
    }).setOrigin(0.5).setDepth(y + 1);
    this.createTalkSpot(x, y, message);
  }

  private createTalkSpot(x: number, y: number, message: string) {
    const zone = this.add.rectangle(x, y, 84, 56, 0xffffff, 0.001).setDepth(35);
    zone.setInteractive({ useHandCursor: true });
    this.talkSpots.push({ zone, message });
    zone.on('pointerdown', () => this.showStatus(message));
  }

  private createDestination(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    scene: DestinationScene,
    scenery: SceneryKey,
    phase: number,
    prompt: string,
    lockedText: string,
  ) {
    const active = this.phase >= phase;
    const zone = this.add.rectangle(x, y, width, height, active ? 0x86efac : 0x94a3b8, active ? 0.45 : 0.2);
    zone.setDepth(34);
    zone.setStrokeStyle(2, active ? 0x22c55e : 0x475569);
    zone.setInteractive({ useHandCursor: true });
    this.physics.add.existing(zone, true);

    this.add.text(x, y, label, {
      color: active ? '#052e16' : '#334155',
      fontSize: '10px',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(35);

    const destination = { scene, scenery, phase, label, prompt, lockedText, zone };
    this.destinations.push(destination);
    zone.on('pointerdown', () => this.tryEnter(destination));
  }

  private bindDestinationOverlaps() {
    this.destinations.forEach((destination) => {
      this.physics.add.overlap(this.player, destination.zone, () => this.tryEnter(destination));
    });
  }

  private tryEnter(destination: Destination) {
    if (this.entering || !this.canUseEntrances) return;

    if (this.phase < destination.phase) {
      this.showStatus(destination.lockedText);
      return;
    }

    this.entering = true;
    this.showStatus(destination.prompt);
    this.player.setVelocity(0, 0);
    this.cameras.main.fadeOut(280, 8, 13, 24);
    this.time.delayedCall(290, () => this.scene.start('SceneryScene', { scenery: destination.scenery }));
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (pointer.y > 604) return;

    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    const tappedDestination = this.destinations.some((destination) => destination.zone.getBounds().contains(worldX, worldY));

    const tappedTalkSpot = this.talkSpots.some((spot) => {
      if (!spot.zone.getBounds().contains(worldX, worldY)) return false;
      this.showStatus(spot.message);
      return true;
    });

    if (!tappedDestination && !tappedTalkSpot) {
      this.target = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(worldX, 24, WORLD_WIDTH - 24),
        Phaser.Math.Clamp(worldY, 74, WORLD_HEIGHT - 24),
      );
    }
  }

  private showStatus(message: string) {
    this.statusText?.destroy();
    this.statusText = this.add.text(VIEW_WIDTH / 2, 76, message, {
      color: '#ffffff',
      backgroundColor: '#0f172a',
      fontSize: '12px',
      fontFamily: 'monospace',
      align: 'center',
      padding: { x: 8, y: 5 },
      wordWrap: { width: 292 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(45);

    this.time.delayedCall(1250, () => {
      this.statusText?.destroy();
      this.statusText = undefined;
    });
  }

  private objectiveText() {
    if (this.phase >= 3) return 'Old Man: Walk to the forge and link the blockchain.';
    if (this.phase >= 2) return 'Old Man: Walk to the council hall for verification.';
    return 'Old Man: Walk to the mines for your first shift.';
  }

  private progressText() {
    const rewards = progress.rewards.length ? progress.rewards.join(' | ') : 'none';
    return `Block ${progress.block.transactionId}: ${progress.block.status}   Rewards: ${rewards}`;
  }

  private currentDestinationPoint() {
    if (this.phase >= 3) return { x: 560, y: 600 };
    if (this.phase >= 2) return { x: 400, y: 272 };
    return { x: 534, y: 260 };
  }

  private startPoint() {
    if (this.phase >= 3) return { x: 466, y: 650 };
    if (this.phase >= 2) return { x: 524, y: 286 };
    return { x: 154, y: 760 };
  }

  private fillTileRect(
    ground: Phaser.GameObjects.RenderTexture,
    startCol: number,
    startRow: number,
    width: number,
    height: number,
    frame: number,
  ) {
    for (let row = startRow; row < startRow + height; row += 1) {
      for (let col = startCol; col < startCol + width; col += 1) {
        this.drawTile(ground, frame, col, row);
      }
    }
  }

  private drawTile(ground: Phaser.GameObjects.RenderTexture, frame: number, col: number, row: number) {
    ground.drawFrame(assetKeys.tileset16, frame, col * TILE_SIZE, row * TILE_SIZE);
  }

  private stampPrefab(
    srcCol: number,
    srcRow: number,
    width: number,
    height: number,
    dstCol: number,
    dstRow: number,
    depth: number,
  ) {
    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const frame = this.tile(srcCol + col, srcRow + row);
        this.add.image((dstCol + col) * TILE_SIZE, (dstRow + row) * TILE_SIZE, assetKeys.tileset16, frame)
          .setOrigin(0, 0)
          .setDepth(depth);
      }
    }
  }

  private tile(col: number, row: number) {
    return tileId(col, row);
  }

  private namedTile(name: string) {
    const tile = starterTiles16.find((entry) => entry.name === name);
    if (!tile) throw new Error(`Missing starter tile "${name}"`);
    return tileId(tile.at.col, tile.at.row);
  }
}
