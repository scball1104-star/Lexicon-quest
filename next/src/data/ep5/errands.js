// The ep5 pack's step of the world cross-references (issue #100): the errands, Penny's cart and the restocks live in
// ../ep4/errands.js; registering again here adds what this pack made possible (its NPCs, items and shops) and puts the
// errand talk back in front of this pack's own lines. Last in ORDER, after npcs, shops and maps.
export { register, default } from '../ep4/errands.js';
