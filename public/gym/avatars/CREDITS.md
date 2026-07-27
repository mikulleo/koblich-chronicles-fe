# Gym level avatars — asset credits

All character models in this folder are **CC0 1.0 Universal (public domain)**.

- **Author:** Quaternius — https://quaternius.com
- **Packs:** Universal Animation Library, Universal Base Characters, Modular Character Outfits
- **License:** https://creativecommons.org/publicdomain/zero/1.0/
- **Retrieved from:** https://github.com/Dallolz/moorfall-assets (`enemies/`), a CC0 mirror
  of the Quaternius packs already converted to `.glb`

CC0 places no conditions on us: no attribution is legally required, and commercial
use, modification and redistribution are all permitted. This file is kept as a
courtesy record of where the assets came from.

If you find these useful, Quaternius takes support at https://www.patreon.com/quaternius

## Files

| File | Level | Character | Idle clip |
| --- | --- | --- | --- |
| `Mushnub.glb` | 1 — Gym Rookie | Sprout | `CharacterArmature\|Idle` |
| `Frog.glb` | 2 — Chart Watcher | Croak | `CharacterArmature\|Idle` |
| `Goleling.glb` | 3 — Candle Counter | Goleling | `CharacterArmature\|Flying_Idle` |
| `Fox.glb` | 4 — Breakout Scout | Scout Fox | `Idle` |
| `Wolf.glb` | 5 — Momentum Hunter | Momentum Wolf | `Idle` |
| `Wizard.glb` | 6 — Swing Surgeon | The Surgeon | `CharacterArmature\|Idle` |
| `Bull.glb` | 7 — Risk Tamer | The Bull | `Idle` |
| `Orc.glb` | 8 — Market Brute | The Brute | `CharacterArmature\|Idle` |
| `Dragon_Evolved.glb` | 9 — Trading Dragon | Trading Dragon | `CharacterArmature\|Flying_Idle` |
| `Skeleton_Warrior.glb` | 10 — Gym GOAT | The GOAT | `Idle_Combat` |

Total: ~3.4 MB. Models are loaded lazily per level, so a user only downloads the
characters actually rendered on screen.

`Skeleton_Warrior.glb` was compressed with
`gltf-transform optimize --texture-compress webp --compress quantize`
(1.15 MB → 981 KB). It uses `KHR_mesh_quantization`, which three.js's GLTFLoader
supports natively — no extra decoder needed.

## Rejected during review

- `Yeti.glb` — a giant disembodied head; reads as goofy rather than a final boss.
- `Squidle.glb` — shares the winged rig with Goleling and Dragon_Evolved, so
  levels 3 / 8 / 9 all looked like the same creature.
- `Mushroom_King.glb` — nice bookend to level 1, but too small and gentle for a peak.
- `Blue_Demon.glb` — solid boss silhouette, just less detailed than the Skeleton Warrior.
- `Superhero_Male.glb` (from `characters/`) — highest-detail model in the pack and
  thematically ideal for a gym, but ships with **no animations**. It shares the
  Universal rig's exact 65 bones, so clips extracted from `animations/UAL1.glb`
  bind with no retargeting, and it compresses 2.5 MB → 415 KB. Dropped only
  because the pack has no gym-appropriate outfit (peasant and ranger only), so it
  renders as a bare mannequin. Worth revisiting if a suitable outfit turns up.
