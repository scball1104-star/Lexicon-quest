// What stars and coins buy. Stars are a wallet for pets; coins buy weapon and ability upgrades.

/** Pets: each has one power. The Slime is the free starter. Costs are in stars. */
export const PET_SHOP = {
  Slime: { power: 'magnet', title: 'Magnet Slime', cost: 0, desc: 'Grabs coins from far away.' },
  Beetle: { power: 'shield', title: 'Shield Beetle', cost: 3, desc: 'Blocks one hit, then recharges.' },
  Page: { power: 'seeker', title: 'Seeker Page', cost: 4, desc: 'Sniffs out hidden passages and secret chests.' },
  Pup: { power: 'helper', title: 'Helper Pup', cost: 6, desc: 'Nips at enemies near you.' },
};

/** Coin upgrades. `costs` has one entry per level you can buy. `needs` = weapon you must find first. */
export const UPGRADE_SHOP = [
  { id: 'sword', name: 'Sword Power', icon: 'sword', costs: [30, 70], desc: 'Sword hits harder.', needs: 'Sword' },
  { id: 'staff', name: 'Staff Power', icon: 'staff', costs: [30, 70], desc: 'Sparks hit harder.', needs: 'Staff' },
  { id: 'hammer', name: 'Hammer Power', icon: 'hammer', costs: [40, 80], desc: 'Hammer hits harder.', needs: 'Hammer' },
  { id: 'boomerang', name: 'Boomerang Power', icon: 'boomerang', costs: [40, 80], desc: 'Boomerang hits harder.', needs: 'Boomerang' },
  { id: 'hook', name: 'Hook Power', icon: 'hook', costs: [50, 90], desc: 'Hook tugs harder.', needs: 'Hook' },
  { id: 'hearts', name: 'Extra Heart', icon: 'heart', costs: [50, 100], desc: 'One more heart each level.' },
  { id: 'super', name: 'Super Charger', icon: 'star', costs: [60], desc: 'SUPER fills up faster.' },
];

/** Floors of each location, bottom to top. */
export const LOCATIONS = [
  { id: 'willowmere', name: 'Willowmere Valley', floors: ['valley', 'obby', 'archive', 'race', 'boss'] },
  // floors still being built are listed in `soon` so the map can show them
  { id: 'hollow', name: 'Nameless Hollow', floors: ['hollow', 'silverglass', 'glassway', 'reflection', 'king'] },
  { id: 'emberpeak', name: 'Emberpeak', floors: ['bellows', 'ashfall', 'liftworks', 'minecart', 'warden'] },
  { id: 'valewyn', name: 'Valewyn', floors: [], soon: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Top Floor'] },
  { id: 'oracle', name: 'Oracle Sands', floors: [], soon: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Top Floor'] },
  { id: 'zephyr', name: 'Zephyr Landing', floors: [], soon: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Top Floor'] },
  { id: 'palehaven', name: 'Palehaven', floors: [], soon: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Top Floor'] },
  { id: 'library', name: 'The First Library', floors: [], soon: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Top Floor'] },
];

export const lvl = (save, id) => (save.levels && save.levels[id]) || 0;
