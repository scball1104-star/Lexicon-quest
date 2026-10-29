// Small pixel icons drawn from text grids. Used on the canvas HUD and (as data URLs) on HTML buttons.

const PAL = {
  k: '#2d1b1f', r: '#e8473e', R: '#ff8a7a', d: '#8a2a25', y: '#f9d77a', o: '#eba14d', b: '#b0702a',
  w: '#f6f4ee', s: '#b3b6c4', g: '#66637f', n: '#8f5533', N: '#6e3d2c', p: '#9a6ad0', P: '#7040aa',
  c: '#7ac3ef', C: '#3e88ca', e: '#4c445c', l: '#62a845',
};

const GRIDS = {
  heart: [
    '.kk.kk.',
    'kRrkrrk',
    'krrrrrk',
    'krrrrdk',
    '.krrdk.',
    '..kdk..',
    '...k...'],
  heart_half: [
    '.kk.kk.',
    'kRrkeek',
    'krrkeek',
    'krrkeek',
    '.krkek.',
    '..kkk..',
    '...k...'],
  heart_empty: [
    '.kk.kk.',
    'keekeek',
    'keeeeek',
    'keeeeek',
    '.keeek.',
    '..kek..',
    '...k...'],
  coin: [
    '.kkkk.',
    'kyyyok',
    'kywyok',
    'kywyok',
    'kyyoob',
    '.kkkk.'],
  star: [
    '....k....',
    '...kyk...',
    '...kyk...',
    'kkkkyykkk',
    'kyyywyyok',
    '.kyyyyok.',
    '..kyoyok.',
    '.kyok.kok',
    '.kok...kk',
    '.kk......'],
  star_empty: [
    '....k....',
    '...kek...',
    '...kek...',
    'kkkkeekkk',
    'keeeeeeek',
    '.keeeeek.',
    '..keeeek.',
    '.keek.kek',
    '.kek...kk',
    '.kk......'],
  sword: [
    '..........kk',
    '.........kwk',
    '........kwsk',
    '.......kwsk.',
    '......kwsk..',
    '.....kwsk...',
    '.kk.kwsk....',
    '.kokwsk.....',
    '..kosk......',
    '.kkook......',
    'knk.kok.....',
    'kk...kk.....'],
  staff: [
    '.........kk.',
    '........kcck',
    '.......kcwck',
    '........kcck',
    '.......knkk.',
    '......knk...',
    '.....knk....',
    '....knk.....',
    '...knk......',
    '..knk.......',
    '.knk........',
    '.kk.........'],
  hammer: [
    '...kkkkk....',
    '..kssssgk...',
    '.kswsssggk..',
    '.ksssssggk..',
    '..kssssgkk..',
    '...kknkk.k..',
    '.....knk....',
    '......knk...',
    '.......knk..',
    '........knk.',
    '.........knk',
    '..........kk'],
  scroll: [
    '.kkkkkkk.',
    'kwwwwwwwk',
    'knwwwwwnk',
    '.kwkkkwk.',
    '.kwwwwwk.',
    '.kwkkwwk.',
    '.kwwwwwk.',
    'knwwwwwnk',
    'kwwwwwwwk',
    '.kkkkkkk.'],
};

const cache = {};
export function icon(name) {
  if (cache[name]) return cache[name];
  const rows = GRIDS[name];
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && PAL[ch]) { g.fillStyle = PAL[ch]; g.fillRect(x, y, 1, 1); } }));
  cache[name] = c;
  return c;
}

/** A scaled-up data URL for HTML use (crisp, nearest neighbour). */
export function iconURL(name, scale = 4) {
  const src = icon(name);
  const c = document.createElement('canvas'); c.width = src.width * scale; c.height = src.height * scale;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL();
}
