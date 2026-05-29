import Phaser from 'phaser';

interface ImageAsset {
  key: string;
  type: 'image';
  path: string;
}

interface SpritesheetAsset {
  key: string;
  type: 'spritesheet';
  path: string;
  frameConfig: Phaser.Types.Loader.FileTypes.ImageFrameConfig;
}

type GameAsset = ImageAsset | SpritesheetAsset;

const assets = {
  playerIdle: {
    key: 'characters.human.idle.base_idle',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Characters/Human/IDLE/base_idle_strip9.png',
    frameConfig: { frameWidth: 96, frameHeight: 64, startFrame: 0, endFrame: 8, margin: 0, spacing: 0 },
  },
  playerWalk: {
    key: 'characters.human.walking.base_walk',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Characters/Human/WALKING/base_walk_strip8.png',
    frameConfig: { frameWidth: 96, frameHeight: 64, startFrame: 0, endFrame: 7, margin: 0, spacing: 0 },
  },
  playerTopDown: {
    key: 'player.custom.topdown',
    type: 'spritesheet',
    path: '/assets/character.png',
    frameConfig: { frameWidth: 64, frameHeight: 64, margin: 0, spacing: 0 },
  },
  mainIdleDown: {
    key: 'player.main.idle.down',
    type: 'spritesheet',
    path: '/assets/main_idle.png',
    frameConfig: { frameWidth: 46, frameHeight: 49, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  mainCharIdle: {
    key: 'player.main.char.idle',
    type: 'spritesheet',
    path: '/assets/main_idle.png',
    frameConfig: { frameWidth: 46, frameHeight: 49, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  mainCharPickSwing: {
    key: 'player.main.char.pick_swing',
    type: 'spritesheet',
    path: '/assets/main_charpick_swing.png',
    frameConfig: { frameWidth: 128, frameHeight: 64, startFrame: 0, endFrame: 5, margin: 0, spacing: 0 },
  },
  commonOre: {
    key: 'mining.ore.common',
    type: 'image',
    path: '/assets/common_ore.png',
  },
  cryptoOre: {
    key: 'mining.ore.crypto',
    type: 'image',
    path: '/assets/crypto_ore.png',
  },
  caveBackground: {
    key: 'mining.cave.background',
    type: 'image',
    path: '/assets/cave_background.png',
  },
  blacksmithScene: {
    key: 'story.blacksmith.scene',
    type: 'image',
    path: '/assets/blacksmith_scene.png',
  },
  blacksmithSceneExtended: {
    key: 'story.blacksmith.scene.extended',
    type: 'image',
    path: '/assets/blacksmith_scene_extended.png',
  },
  anvilSurface: {
    key: 'forge.anvil.surface',
    type: 'image',
    path: '/assets/anvil_surface.png',
  },
  anvilSurfaceExtended: {
    key: 'forge.anvil.surface.extended',
    type: 'image',
    path: '/assets/anvil_surface_extended.png',
  },
  cryptocrafterLogo: {
    key: 'ui.cryptocrafter.logo',
    type: 'image',
    path: '/assets/cryptocrafter_logo.png',
  },
  miningBadge: {
    key: 'reward.badge.mining',
    type: 'image',
    path: '/assets/mining_badge.png',
  },
  verificationBadge: {
    key: 'reward.badge.verification',
    type: 'image',
    path: '/assets/verification_badge.png',
  },
  chainBadge: {
    key: 'reward.badge.chain',
    type: 'image',
    path: '/assets/chain_badge.png',
  },
  mainMenuBackground: {
    key: 'ui.main_menu.background',
    type: 'image',
    path: '/assets/main_menu_bg.png',
  },
  mainMenuBackgroundExtended: {
    key: 'ui.main_menu.background.extended',
    type: 'image',
    path: '/assets/main_menu_bg_extended.png',
  },
  blacksmithSmashBack: {
    key: 'characters.blacksmith.smash.back',
    type: 'spritesheet',
    path: '/assets/blacksmith_smash_back.png',
    frameConfig: { frameWidth: 136, frameHeight: 52, startFrame: 0, endFrame: 4, margin: 0, spacing: 0 },
  },
  blacksmithIdleFront: {
    key: 'characters.blacksmith.idle.front',
    type: 'spritesheet',
    path: '/assets/blacksmith_idle_front.png',
    frameConfig: { frameWidth: 50, frameHeight: 53, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  introInterior: {
    key: 'story.intro.interior',
    type: 'image',
    path: '/assets/intro_interior.png',
  },
  introInteriorExtended: {
    key: 'story.intro.interior.extended',
    type: 'image',
    path: '/assets/intro_interior_extended.png',
  },
  minesExterior: {
    key: 'story.mines.exterior',
    type: 'image',
    path: '/assets/mines_exterior.png',
  },
  minesExteriorExtended: {
    key: 'story.mines.exterior.extended',
    type: 'image',
    path: '/assets/mines_exterior_extended.png',
  },
  councilBuildingOutside: {
    key: 'story.council.outside',
    type: 'image',
    path: '/assets/council_building_outside.png',
  },
  councilBuildingOutsideExtended: {
    key: 'story.council.outside.extended',
    type: 'image',
    path: '/assets/council_building_outside_extended.png',
  },
  councilInterior: {
    key: 'verification.council.interior',
    type: 'image',
    path: '/assets/council_interior.png',
  },
  councilInteriorExtended: {
    key: 'verification.council.interior.extended',
    type: 'image',
    path: '/assets/council_interior_extended.png',
  },
  councilDeskLayer: {
    key: 'verification.council.desk_layer',
    type: 'image',
    path: '/assets/desk_layer.png',
  },
  oldManIdle: {
    key: 'characters.old_man.idle',
    type: 'spritesheet',
    path: '/assets/old_man_idle.png',
    frameConfig: { frameWidth: 47, frameHeight: 48, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  oldManIdleBack: {
    key: 'characters.old_man.idle.back',
    type: 'spritesheet',
    path: '/assets/old_man_idle_back.png',
    frameConfig: { frameWidth: 47, frameHeight: 47, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  ledgerWardenIdle: {
    key: 'characters.council.ledger_warden.idle',
    type: 'spritesheet',
    path: '/assets/ledger_warden_idle.png',
    frameConfig: { frameWidth: 47, frameHeight: 48, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  sealSageIdle: {
    key: 'characters.council.seal_sage.idle',
    type: 'spritesheet',
    path: '/assets/seal_sage_idle.png',
    frameConfig: { frameWidth: 47, frameHeight: 57, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  echoWatcherIdle: {
    key: 'characters.council.echo_watcher.idle',
    type: 'spritesheet',
    path: '/assets/echo_watcher_idle.png',
    frameConfig: { frameWidth: 47, frameHeight: 50, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  concordChairIdle: {
    key: 'characters.council.concord_chair.idle',
    type: 'spritesheet',
    path: '/assets/concord_chair_idle.png',
    frameConfig: { frameWidth: 49, frameHeight: 47, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  mainIdleLeft: {
    key: 'player.main.idle.left',
    type: 'spritesheet',
    path: '/assets/main_idle_left.png',
    frameConfig: { frameWidth: 43, frameHeight: 48, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  mainIdleRight: {
    key: 'player.main.idle.right',
    type: 'spritesheet',
    path: '/assets/main_idle_right.png',
    frameConfig: { frameWidth: 43, frameHeight: 48, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  mainIdleUp: {
    key: 'player.main.idle.up',
    type: 'spritesheet',
    path: '/assets/main_idle_back.png',
    frameConfig: { frameWidth: 46, frameHeight: 47, startFrame: 0, endFrame: 1, margin: 0, spacing: 0 },
  },
  mainWalkDown: {
    key: 'player.main.walk.down',
    type: 'spritesheet',
    path: '/assets/main_walk_down.png',
    frameConfig: { frameWidth: 60, frameHeight: 49, startFrame: 0, endFrame: 8, margin: 0, spacing: 0 },
  },
  mainWalkLeft: {
    key: 'player.main.walk.left',
    type: 'spritesheet',
    path: '/assets/main_walk_left.png',
    frameConfig: { frameWidth: 59, frameHeight: 47, startFrame: 0, endFrame: 8, margin: 0, spacing: 0 },
  },
  mainWalkRight: {
    key: 'player.main.walk.right',
    type: 'spritesheet',
    path: '/assets/main_walk_right.png',
    frameConfig: { frameWidth: 59, frameHeight: 47, startFrame: 0, endFrame: 8, margin: 0, spacing: 0 },
  },
  mainWalkUp: {
    key: 'player.main.walk.up',
    type: 'spritesheet',
    path: '/assets/main_walk_up.png',
    frameConfig: { frameWidth: 60, frameHeight: 49, startFrame: 0, endFrame: 8, margin: 0, spacing: 0 },
  },
  mainJumpEmote: {
    key: 'player.main.jump.emote',
    type: 'image',
    path: '/assets/main_jump_emote.png',
  },
  playerToolsIdle: {
    key: 'characters.human.idle.tools_idle',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Characters/Human/IDLE/tools_idle_strip9.png',
    frameConfig: { frameWidth: 96, frameHeight: 64, startFrame: 0, endFrame: 8, margin: 0, spacing: 0 },
  },
  playerToolsWalk: {
    key: 'characters.human.walking.tools_walk',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Characters/Human/WALKING/tools_walk_strip8.png',
    frameConfig: { frameWidth: 96, frameHeight: 64, startFrame: 0, endFrame: 7, margin: 0, spacing: 0 },
  },
  villagerIdle: {
    key: 'characters.human.idle.shorthair_idle',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Characters/Human/IDLE/shorthair_idle_strip9.png',
    frameConfig: { frameWidth: 96, frameHeight: 64, startFrame: 0, endFrame: 8, margin: 0, spacing: 0 },
  },
  villagerWalk: {
    key: 'characters.human.walking.shorthair_walk',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Characters/Human/WALKING/shorthair_walk_strip8.png',
    frameConfig: { frameWidth: 96, frameHeight: 64, startFrame: 0, endFrame: 7, margin: 0, spacing: 0 },
  },
  treeOne: {
    key: 'elements.plants.deco_tree_01',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/Plants/spr_deco_tree_01_strip4.png',
    frameConfig: { frameWidth: 32, frameHeight: 34, startFrame: 0, endFrame: 3, margin: 0, spacing: 0 },
  },
  treeTwo: {
    key: 'elements.plants.deco_tree_02',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/Plants/spr_deco_tree_02_strip4.png',
    frameConfig: { frameWidth: 28, frameHeight: 43, startFrame: 0, endFrame: 3, margin: 0, spacing: 0 },
  },
  fire: {
    key: 'elements.vfx.fire.deco_fire_01',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/VFX/Fire/spr_deco_fire_01_strip4.png',
    frameConfig: { frameWidth: 5, frameHeight: 10, startFrame: 0, endFrame: 3, margin: 0, spacing: 0 },
  },
  glint: {
    key: 'elements.vfx.glint.deco_glint_01',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/VFX/Glint/spr_deco_glint_01_strip6.png',
    frameConfig: { frameWidth: 7, frameHeight: 7, startFrame: 0, endFrame: 5, margin: 0, spacing: 0 },
  },
  windmill: {
    key: 'elements.other.deco_windmill',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/Other/spr_deco_windmill_strip9.png',
    frameConfig: { frameWidth: 112, frameHeight: 112, startFrame: 0, endFrame: 8, margin: 0, spacing: 0 },
  },
  coracle: {
    key: 'elements.other.deco_coracle',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/Other/spr_deco_coracle_strip4.png',
    frameConfig: { frameWidth: 48, frameHeight: 37, startFrame: 0, endFrame: 3, margin: 0, spacing: 0 },
  },
  pig: {
    key: 'elements.animals.deco_pig_01',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/Animals/spr_deco_pig_01_strip4.png',
    frameConfig: { frameWidth: 32, frameHeight: 32, startFrame: 0, endFrame: 3, margin: 0, spacing: 0 },
  },
  sheep: {
    key: 'elements.animals.deco_sheep_01',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/Animals/spr_deco_sheep_01_strip4.png',
    frameConfig: { frameWidth: 32, frameHeight: 32, startFrame: 0, endFrame: 3, margin: 0, spacing: 0 },
  },
  cow: {
    key: 'elements.animals.deco_cow',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/Animals/spr_deco_cow_strip4.png',
    frameConfig: { frameWidth: 32, frameHeight: 32, startFrame: 0, endFrame: 3, margin: 0, spacing: 0 },
  },
  chicken: {
    key: 'elements.animals.deco_chicken_01',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/Animals/spr_deco_chicken_01_strip4.png',
    frameConfig: { frameWidth: 32, frameHeight: 32, startFrame: 0, endFrame: 3, margin: 0, spacing: 0 },
  },
  duck: {
    key: 'elements.animals.deco_duck_01',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/Animals/spr_deco_duck_01_strip4.png',
    frameConfig: { frameWidth: 16, frameHeight: 16, startFrame: 0, endFrame: 3, margin: 0, spacing: 0 },
  },
  bird: {
    key: 'elements.animals.deco_bird_01',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Elements/Animals/spr_deco_bird_01_strip4.png',
    frameConfig: { frameWidth: 16, frameHeight: 16, startFrame: 0, endFrame: 3, margin: 0, spacing: 0 },
  },
  pickaxe: {
    key: 'ui.pickaxe',
    type: 'image',
    path: '/assets/Sunnyside_World_Assets/UI/pickaxe.png',
  },
  shovel: {
    key: 'ui.shovel',
    type: 'image',
    path: '/assets/Sunnyside_World_Assets/UI/shovel.png',
  },
  sword: {
    key: 'ui.sword',
    type: 'image',
    path: '/assets/Sunnyside_World_Assets/UI/sword.png',
  },
  water: {
    key: 'ui.water',
    type: 'image',
    path: '/assets/Sunnyside_World_Assets/UI/water.png',
  },
  confirm: {
    key: 'ui.confirm',
    type: 'image',
    path: '/assets/Sunnyside_World_Assets/UI/confirm.png',
  },
  crateBase: {
    key: 'elements.crops.crate_base',
    type: 'image',
    path: '/assets/Sunnyside_World_Assets/Elements/Crops/crate_base.png',
  },
  crateTop: {
    key: 'elements.crops.crate_top',
    type: 'image',
    path: '/assets/Sunnyside_World_Assets/Elements/Crops/crate_top.png',
  },
  rock: {
    key: 'elements.crops.rock',
    type: 'image',
    path: '/assets/Sunnyside_World_Assets/Elements/Crops/rock.png',
  },
  wood: {
    key: 'elements.crops.wood',
    type: 'image',
    path: '/assets/Sunnyside_World_Assets/Elements/Crops/wood.png',
  },
  councilBuilding: {
    key: 'generated.buildings.council_blue',
    type: 'image',
    path: '/assets/generated/buildings/council-blue.png',
  },
  marketBuilding: {
    key: 'generated.buildings.market_green',
    type: 'image',
    path: '/assets/generated/buildings/market-green.png',
  },
  forgeBuilding: {
    key: 'generated.buildings.forge_orange',
    type: 'image',
    path: '/assets/generated/buildings/forge-orange.png',
  },
  homeBuilding: {
    key: 'generated.buildings.home_red',
    type: 'image',
    path: '/assets/generated/buildings/home-red.png',
  },
  shrineBuilding: {
    key: 'generated.buildings.shrine_purple',
    type: 'image',
    path: '/assets/generated/buildings/shrine-purple.png',
  },
  tileset16: {
    key: 'tileset.tileset_sunnysideworld_16px',
    type: 'spritesheet',
    path: '/assets/Sunnyside_World_Assets/Tileset/spr_tileset_sunnysideworld_16px.png',
    frameConfig: { frameWidth: 16, frameHeight: 16, margin: 0, spacing: 0 },
  },
} satisfies Record<string, GameAsset>;

export const assetKeys = Object.fromEntries(
  Object.entries(assets).map(([name, asset]) => [name, asset.key]),
) as { [K in keyof typeof assets]: (typeof assets)[K]['key'] };

export function loadGameAssets(scene: Phaser.Scene, names: (keyof typeof assets)[]) {
  names.forEach((name) => {
    const asset = assets[name];
    if (scene.textures.exists(asset.key)) return;

    if (asset.type === 'spritesheet') {
      scene.load.spritesheet(asset.key, asset.path, asset.frameConfig);
      return;
    }

    scene.load.image(asset.key, asset.path);
  });
}

export function createSharedAnimations(scene: Phaser.Scene) {
  createAnimation(scene, 'player-idle', assetKeys.playerIdle, 9, 6, true);
  createAnimation(scene, 'player-walk', assetKeys.playerWalk, 8, 10, true);
  createAnimation(scene, 'player-tools-idle', assetKeys.playerToolsIdle, 9, 6, true);
  createAnimation(scene, 'player-tools-walk', assetKeys.playerToolsWalk, 8, 10, true);
  createAnimation(scene, 'main-idle-down', assetKeys.mainIdleDown, 2, 3, true);
  createAnimation(scene, 'main-char-idle', assetKeys.mainCharIdle, 2, 3, true);
  createAnimation(scene, 'old-man-idle', assetKeys.oldManIdle, 2, 3, true);
  createAnimation(scene, 'old-man-idle-back', assetKeys.oldManIdleBack, 2, 3, true);
  createAnimation(scene, 'blacksmith-smash-back', assetKeys.blacksmithSmashBack, 5, 8, true);
  createAnimation(scene, 'blacksmith-idle-front', assetKeys.blacksmithIdleFront, 2, 3, true);
  createAnimation(scene, 'ledger-warden-idle', assetKeys.ledgerWardenIdle, 2, 3, true);
  createAnimation(scene, 'seal-sage-idle', assetKeys.sealSageIdle, 2, 3, true);
  createAnimation(scene, 'echo-watcher-idle', assetKeys.echoWatcherIdle, 2, 3, true);
  createAnimation(scene, 'concord-chair-idle', assetKeys.concordChairIdle, 2, 3, true);
  createAnimation(scene, 'main-char-pick-swing', assetKeys.mainCharPickSwing, 6, 13, false);
  createAnimation(scene, 'main-idle-left', assetKeys.mainIdleLeft, 2, 3, true);
  createAnimation(scene, 'main-idle-right', assetKeys.mainIdleRight, 2, 3, true);
  createAnimation(scene, 'main-idle-up', assetKeys.mainIdleUp, 2, 3, true);
  createAnimation(scene, 'main-walk-down', assetKeys.mainWalkDown, 9, 10, true);
  createAnimation(scene, 'main-walk-left', assetKeys.mainWalkLeft, 9, 10, true);
  createAnimation(scene, 'main-walk-right', assetKeys.mainWalkRight, 9, 10, true);
  createAnimation(scene, 'main-walk-up', assetKeys.mainWalkUp, 9, 10, true);
  createAnimation(scene, 'villager-idle', assetKeys.villagerIdle, 9, 5, true);
  createAnimation(scene, 'tree-one-sway', assetKeys.treeOne, 4, 3, true);
  createAnimation(scene, 'tree-two-sway', assetKeys.treeTwo, 4, 3, true);
  createAnimation(scene, 'forge-fire', assetKeys.fire, 4, 8, true);
  createAnimation(scene, 'glint', assetKeys.glint, 6, 8, true);
  createAnimation(scene, 'windmill-turn', assetKeys.windmill, 9, 8, true);
  createAnimation(scene, 'coracle-bob', assetKeys.coracle, 4, 5, true);
  createAnimation(scene, 'pig-idle', assetKeys.pig, 4, 4, true);
  createAnimation(scene, 'sheep-idle', assetKeys.sheep, 4, 4, true);
  createAnimation(scene, 'cow-idle', assetKeys.cow, 4, 4, true);
  createAnimation(scene, 'chicken-idle', assetKeys.chicken, 4, 5, true);
  createAnimation(scene, 'duck-swim', assetKeys.duck, 4, 5, true);
  createAnimation(scene, 'bird-hop', assetKeys.bird, 4, 6, true);
}

function createAnimation(scene: Phaser.Scene, key: string, textureKey: string, frameCount: number, frameRate: number, repeat: boolean) {
  if (scene.anims.exists(key)) return;
  if (!scene.textures.exists(textureKey)) return;

  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: frameCount - 1 }),
    frameRate,
    repeat: repeat ? -1 : 0,
  });
}
