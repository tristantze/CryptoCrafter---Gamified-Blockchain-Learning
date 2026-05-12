export interface TilePoint {
  col: number;
  row: number;
}

export interface TileRegion {
  name: string;
  start: TilePoint;
  end: TilePoint;
  notes?: string;
}

export interface NamedTile {
  name: string;
  at: TilePoint;
  notes?: string;
}

export interface MapLayerGuide {
  name: string;
  order: number;
  purpose: string;
  notes?: string;
}

export interface CompositionGuide {
  name: string;
  summary: string;
  notes?: string;
}

export const TILESET_16PX = {
  key: 'tileset.tileset_sunnysideworld_16px',
  path: '/assets/Sunnyside_World_Assets/Tileset/spr_tileset_sunnysideworld_16px.png',
  tileWidth: 16,
  tileHeight: 16,
  columns: 64,
  rows: 64,
} as const;

export function tileId(col: number, row: number) {
  return row * TILESET_16PX.columns + col;
}

// This is a coarse region map for navigating the sheet quickly.
// It is intentionally grouped by usable clusters rather than pretending every
// individual tile already has game-ready meaning.
export const tileRegions16: TileRegion[] = [
  {
    name: 'terrain-grass-cliff-path',
    start: { col: 0, row: 0 },
    end: { col: 14, row: 8 },
    notes: 'Grass tops, dirt, cliff edges, path pieces, and corner transitions.',
  },
  {
    name: 'water-and-shore',
    start: { col: 19, row: 0 },
    end: { col: 29, row: 7 },
    notes: 'Deep water, shore transitions, and bank shapes.',
  },
  {
    name: 'saplings-flowers-stones-small-decor',
    start: { col: 27, row: 0 },
    end: { col: 41, row: 5 },
    notes: 'Tiny foliage, flowers, pebbles, and decor variants.',
  },
  {
    name: 'fences-and-wood-connectors',
    start: { col: 37, row: 0 },
    end: { col: 47, row: 7 },
    notes: 'Fence spans, posts, gates, and small wooden joiners.',
  },
  {
    name: 'stone-ruins-and-camp',
    start: { col: 45, row: 0 },
    end: { col: 55, row: 8 },
    notes: 'Stone wall chunks, ruins, stairs, and campsite-style pieces.',
  },
  {
    name: 'tree-clusters-large',
    start: { col: 56, row: 0 },
    end: { col: 63, row: 7 },
    notes: 'Large treetop and forest cluster tiles.',
  },
  {
    name: 'wood-building-kit-blue',
    start: { col: 15, row: 8 },
    end: { col: 35, row: 20 },
    notes: 'Blue-roof wall, corner, roof, and facade pieces for assembled buildings.',
  },
  {
    name: 'wood-building-kit-green',
    start: { col: 15, row: 20 },
    end: { col: 35, row: 32 },
    notes: 'Green-roof variant of the same building kit.',
  },
  {
    name: 'wood-building-kit-orange',
    start: { col: 15, row: 32 },
    end: { col: 35, row: 44 },
    notes: 'Orange-roof variant of the same building kit.',
  },
  {
    name: 'wood-building-kit-red',
    start: { col: 15, row: 44 },
    end: { col: 35, row: 54 },
    notes: 'Red-roof variant of the same building kit.',
  },
  {
    name: 'wood-building-kit-purple',
    start: { col: 15, row: 54 },
    end: { col: 35, row: 63 },
    notes: 'Purple-roof variant of the same building kit.',
  },
  {
    name: 'tree-crowns-and-canopies',
    start: { col: 0, row: 18 },
    end: { col: 8, row: 27 },
    notes: 'Rounded treetops and canopy variants.',
  },
  {
    name: 'water-curves-whitecaps',
    start: { col: 0, row: 18 },
    end: { col: 12, row: 27 },
    notes: 'Overlay-style water and foam shapes mixed into the left-mid section.',
  },
  {
    name: 'rocks-and-ore-clusters',
    start: { col: 46, row: 20 },
    end: { col: 58, row: 40 },
    notes: 'Rock piles, ore-color variants, and mineable-looking clusters.',
  },
  {
    name: 'crates-barrels-sacks-workshop',
    start: { col: 36, row: 21 },
    end: { col: 48, row: 34 },
    notes: 'Storage props, barrels, sacks, benches, and workshop pieces.',
  },
  {
    name: 'crops-and-farm-items',
    start: { col: 52, row: 9 },
    end: { col: 63, row: 29 },
    notes: 'Harvestables, crop stages, seeds, flowers, and farm pickups.',
  },
  {
    name: 'interior-rugs-furniture',
    start: { col: 37, row: 42 },
    end: { col: 52, row: 50 },
    notes: 'Beds, tables, rugs, benches, and indoor furnishing tiles.',
  },
  {
    name: 'ui-icons-tools-cursors',
    start: { col: 37, row: 54 },
    end: { col: 51, row: 63 },
    notes: 'Small UI sprites, tools, pointers, symbols, and status icons.',
  },
];

// The example mockup image in the asset pack shows the intended assembly style:
// terrain is tile-based, but the final scene reads as layered composition rather
// than a single painted layer. Use these guides when building a Tiled map or a
// procedural map pass in Phaser.
export const mapLayerGuide16: MapLayerGuide[] = [
  {
    name: 'water-base',
    order: 0,
    purpose: 'Deep water fill for the world outside islands, rivers, ponds, and canals.',
    notes: 'Treat water as the absolute base layer. Shore foam and bank transitions sit above it.',
  },
  {
    name: 'ground-base',
    order: 1,
    purpose: 'Grass, dirt, sand, and field fill tiles that define walkable land masses.',
    notes: 'The mockup uses broad fill areas with subtle variation, not noisy per-tile randomness.',
  },
  {
    name: 'shore-and-path-transitions',
    order: 2,
    purpose: 'Water edges, beach borders, path edges, and other transition tiles.',
    notes: 'Transition tiles should hug the silhouettes of islands and roads rather than form boxy shapes.',
  },
  {
    name: 'cliff-tops-and-walls',
    order: 3,
    purpose: 'Raised land, ledges, island rims, and elevation changes.',
    notes: 'Model height in at least two parts: top lip on the ground plane, then vertical cliff faces below.',
  },
  {
    name: 'hardscape-and-connectors',
    order: 4,
    purpose: 'Bridges, ladders, docks, stairs, fences, retaining walls, and other traversal pieces.',
    notes: 'These read as assembled prefabs made from multiple tiles, not isolated icons dropped on top.',
  },
  {
    name: 'building-bases',
    order: 5,
    purpose: 'House footprints, walls, doors, windmill shafts, and market structures.',
    notes: 'Buildings in the mockup are built from the color-coded kit rows in the 16px tileset.',
  },
  {
    name: 'props-and-worksites',
    order: 6,
    purpose: 'Crates, barrels, rocks, crops, workshop pieces, signs, and small decor.',
    notes: 'Use these to explain function of an area after the terrain silhouette is already readable.',
  },
  {
    name: 'character-blocking-foreground',
    order: 7,
    purpose: 'Tree canopies, roof eaves, tall walls, and anything that should draw above the player.',
    notes: 'The mockup relies on foreground overlap for depth. Do not flatten tall objects into only one layer.',
  },
];

export const compositionGuide16: CompositionGuide[] = [
  {
    name: 'islands-first',
    summary: 'Block the world as large island and shoreline shapes before placing buildings or props.',
    notes: 'The mockup is driven by strong land silhouettes. Terrain readability comes before decoration.',
  },
  {
    name: 'cliffs-create-height',
    summary: 'Raised areas are built from top grass tiles plus stacked brown cliff faces below.',
    notes: 'Avoid single-tile cliffs. The scene uses continuous cliff ribbons to create believable elevation.',
  },
  {
    name: 'roads-are-soft-shapes',
    summary: 'Paths meander with rounded corners and variable width instead of strict rectangles.',
    notes: 'Blend path fill, corner, and edge tiles so routes feel worn into the landscape.',
  },
  {
    name: 'buildings-are-prefabs',
    summary: 'Houses, mills, towers, and shops are multi-tile assemblies from the roof-and-wall kit rows.',
    notes: 'Do not treat these like one-frame props. Compose them as facades with separate roof, wall, and doorway pieces.',
  },
  {
    name: 'trees-need-depth-splitting',
    summary: 'Large trees should be split conceptually into trunk/body behind the player and canopy/cover in front when needed.',
    notes: 'The mockup uses overlap heavily, especially around forests and village edges.',
  },
  {
    name: 'props-support-biomes',
    summary: 'Decor is clustered by place: farms get tilled rows and fences, coasts get docks and boats, mines get rock piles and ore.',
    notes: 'Place props as biome-specific sets instead of sprinkling every variant evenly across the map.',
  },
  {
    name: 'hero-elements-are-not-tiles',
    summary: 'Characters, animals, animated VFX, clouds, and some decorative set pieces should remain sprites, not tilemap cells.',
    notes: 'The mockup mixes tiles with sprite-based actors and animated props. Keep that separation in Phaser.',
  },
];

// Starter picks for a first Phaser map pass. These should be validated in-engine
// and extended as we wire up actual ground/building layers.
export const starterTiles16: NamedTile[] = [
  { name: 'grass-fill-a', at: { col: 1, row: 0 }, notes: 'Basic grass fill.' },
  { name: 'grass-fill-b', at: { col: 2, row: 0 }, notes: 'Grass variant for visual noise.' },
  { name: 'path-fill-a', at: { col: 5, row: 0 }, notes: 'Light dirt path fill.' },
  { name: 'path-corner-inner', at: { col: 7, row: 2 }, notes: 'Useful for path corners.' },
  { name: 'cliff-top-a', at: { col: 9, row: 1 }, notes: 'Brown cliff or ledge top.' },
  { name: 'water-fill-a', at: { col: 20, row: 1 }, notes: 'Deep water interior.' },
  { name: 'shore-edge-a', at: { col: 22, row: 2 }, notes: 'Water-to-land transition.' },
  { name: 'tree-small-a', at: { col: 58, row: 2 }, notes: 'Small tree canopy / full tree tile.' },
  { name: 'tree-small-b', at: { col: 60, row: 3 }, notes: 'Alternate tree tile.' },
  { name: 'rock-pile-a', at: { col: 47, row: 24 }, notes: 'Good for mine props.' },
  { name: 'crate-a', at: { col: 41, row: 9 }, notes: 'Single crate tile.' },
  { name: 'barrel-a', at: { col: 42, row: 17 }, notes: 'Workshop storage tile.' },
  { name: 'house-wall-blue', at: { col: 18, row: 10 }, notes: 'Building kit wall segment.' },
  { name: 'house-roof-blue', at: { col: 21, row: 10 }, notes: 'Building kit roof segment.' },
  { name: 'house-door-blue', at: { col: 16, row: 15 }, notes: 'Doorway segment in blue kit.' },
];
