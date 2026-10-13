# Runway Scenes — Current Build

Runway was connected for this upgrade. The game includes sixteen generated scenes: eight region arrivals and eight guardian reveals. Each is approximately ten seconds at 1280×720, encoded as H.264 MP4 with yuv420p and fast-start playback. All files are embedded locally; there are no runtime account calls or expiring media links.

These replace the previous six-second composited still clips. Generation used 800 Runway credits in total (16 accepted video tasks at 50 credits each). Three new game sprite atlases were created with built-in image generation and integrated into exploration.

The player supports replay, skip, and still-art/reduced-motion fallback. Dialogue remains native game text, so chosen hero names work normally. Muted region videos also appear behind dialogue when motion and cinematics are enabled, and are unloaded when leaving dialogue.

Task IDs, generation prompts, and media metadata are recorded in `RUNWAY_PROVENANCE.json`. Sprite briefs are recorded in `ART_PROMPTS.json`. Generated media was inspected at intermediate/end frames and fully decoded; real browser/phone testing remains pending.

## Shared art direction

Original modern pixel fantasy RPG. Preserve the artwork's visible pixel clusters, colors, architecture, creature identity, and composition. Slow cinematic movement; atmospheric light and subtle environmental animation. No photorealism, no franchise characters, no text, no subtitles, no logo. Do not generate dialogue lettering or the main hero's name in the video. Keep visual intensity gentle; avoid fast flashes. The current generated scenes are approximately ten seconds.

`assets/art/environments.png` is a 2-column × 4-row environment atlas. `assets/art/bosses.png` is a 4-column × 2-row guardian atlas. The runtime uses optimized WebP copies. The game keeps high-quality PNG artwork for future production.

## Region arrival clips

Use the corresponding environment as a visual reference, together with the shared art direction.

| File | Scene prompt |
| --- | --- |
| chapter-1.mp4 | Willowmere at blue hour. Glide gently toward the stone bridge and lantern-lit archive. Willow branches sway, warm windows flicker, and faint golden motes drift above the river. A quiet evening begins to feel mysterious. |
| chapter-2.mp4 | Nameless Hollow. Track slowly across a ruined mirror palace. Pale fog rolls over the still water. Towers briefly lose their reflections, then return. Preserve the silver-blue and violet palette. |
| chapter-3.mp4 | Emberpeak. Push slowly toward the mountain forge. Lava flows in narrow channels, furnace light pulses softly, and a few embers drift through the indigo smoke. |
| chapter-4.mp4 | Valewyn. Glide over turquoise water toward flooded royal arches. Moonlight catches the crown of an old statue; the reflected columns ripple while the architecture remains stable. |
| chapter-5.mp4 | Whispering Desert. Drift slowly toward the sandstone observatory. Dust slides along the dunes, the gold celestial rings turn gently, and distant constellations shimmer. |
| chapter-6.mp4 | Skybound Isles. Travel slowly past a dock toward floating islands. Clouds roll beneath the bridges, a small airship drifts gently, and sunlight moves across the stone. |
| chapter-7.mp4 | Hollow North. Push slowly toward the frozen cathedral. Sparse snow falls, pine branches sway, and a soft aurora moves across the night sky. |
| chapter-8.mp4 | First Library. Rise slowly toward the suspended open book. Pages and golden glyphs orbit at an unhurried pace while violet light illuminates the monumental shelves. |

## Guardian reveal clips

Use each guardian's original design as a reference. Stage it against the corresponding region above. Keep the creature silhouette, colors, and anatomy consistent with the game artwork.

| File | Scene prompt |
| --- | --- |
| boss-1.mp4 | The Archivore forms from swirling empty pages above Willowmere's archive bridge. Its golden single eye opens; the book-wings unfold. A slow, ominous reveal without a jump scare. |
| boss-2.mp4 | The Nameless King emerges from the mirror palace's reflection. Fractured silver armor catches violet light; the crown and glass sword settle into place. |
| boss-3.mp4 | The Cinder Warden steps from the forge's smoke. Its orange furnace heart glows and the molten hammer slowly lowers into a guarded stance. |
| boss-4.mp4 | The Paper Regent rises from Valewyn's still water. Scroll-like robes unfold and the crown gleams as droplets fall from its turquoise form. |
| boss-5.mp4 | The Sand Oracle emerges beside the observatory. The great celestial scorpion curls its golden tail; stars drift within its dark abdomen. |
| boss-6.mp4 | The Storm Scribe forms from wind and blue feathers above the floating isles. Its wings open while luminous quills orbit around it. |
| boss-7.mp4 | The White Phantom appears at the frozen cathedral. An icy antler crown materializes and its ragged cloak moves gently in the snowfall. |
| boss-8.mp4 | The Eraser gathers above the First Library's luminous book. Violet void folds into black robes, empty pages orbit, and a silent white face becomes visible. |

## Review before replacing a clip

Check creature consistency, no unwanted text or extra limbs, a readable 16:9 composition, smooth moderate motion, and successful playback on a phone. Keep the generated video as a reusable source asset. Update the service-worker cache version when replacing packaged clips so existing players receive the new version.
