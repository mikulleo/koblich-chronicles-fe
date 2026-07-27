/**
 * 3D level avatars for the gym progress system.
 *
 * Each gym level (see BE `src/utilities/gymProgress.ts` GYM_LEVELS) maps to a
 * rigged, animated glTF character. Models are CC0 1.0 by Quaternius — see
 * `public/gym/avatars/CREDITS.md`.
 *
 * The BE emoji `avatar` stays as-is and is used as the loading/fallback glyph,
 * so nothing breaks if a model fails to load or WebGL is unavailable.
 */

export interface LevelAvatar {
  /** Matches GymLevel.level from the BE */
  level: number
  /** Character name, shown in the roadmap */
  name: string
  /** Path under /public */
  model: string
  /** Animation clip to loop while idling */
  idleClip: string
  /** Clip played on the level-up celebration (falls back to idleClip) */
  celebrateClip?: string
  /**
   * Relative size, applied on top of auto-fit. Auto-fit normalises every model
   * to the frame, which makes a dragon look identical in size to a mushroom;
   * ramping this 0.72 → 1.0 up the ladder restores a sense of growth.
   *
   * Keep it at or below 1.0 — auto-fit is the upper bound, and anything above
   * pushes the character outside the frame.
   */
  scale: number
  /** Rim-light / aura colour, warming up as the ladder progresses */
  accent: string
}

export const LEVEL_AVATARS: LevelAvatar[] = [
  {
    level: 1,
    name: 'Sprout',
    model: '/gym/avatars/Mushnub.glb',
    idleClip: 'CharacterArmature|Idle',
    celebrateClip: 'CharacterArmature|Jump',
    scale: 0.72,
    accent: '#94a3b8',
  },
  {
    level: 2,
    name: 'Croak',
    model: '/gym/avatars/Frog.glb',
    idleClip: 'CharacterArmature|Idle',
    celebrateClip: 'CharacterArmature|Jump',
    scale: 0.76,
    accent: '#4ade80',
  },
  {
    level: 3,
    name: 'Goleling',
    model: '/gym/avatars/Goleling.glb',
    idleClip: 'CharacterArmature|Flying_Idle',
    celebrateClip: 'CharacterArmature|Headbutt',
    scale: 0.79,
    accent: '#38bdf8',
  },
  {
    level: 4,
    name: 'Scout Fox',
    model: '/gym/avatars/Fox.glb',
    idleClip: 'Idle',
    celebrateClip: 'Gallop',
    scale: 0.82,
    accent: '#fb923c',
  },
  {
    level: 5,
    name: 'Momentum Wolf',
    model: '/gym/avatars/Wolf.glb',
    idleClip: 'Idle',
    celebrateClip: 'Gallop',
    scale: 0.85,
    accent: '#a78bfa',
  },
  {
    level: 6,
    name: 'The Surgeon',
    model: '/gym/avatars/Wizard.glb',
    idleClip: 'CharacterArmature|Idle',
    celebrateClip: 'CharacterArmature|Jump',
    scale: 0.88,
    accent: '#c084fc',
  },
  {
    level: 7,
    name: 'The Bull',
    model: '/gym/avatars/Bull.glb',
    idleClip: 'Idle',
    celebrateClip: 'Attack_Headbutt',
    scale: 0.91,
    accent: '#f59e0b',
  },
  {
    level: 8,
    name: 'The Brute',
    model: '/gym/avatars/Orc.glb',
    idleClip: 'CharacterArmature|Idle',
    celebrateClip: 'CharacterArmature|Punch',
    scale: 0.94,
    accent: '#22d3ee',
  },
  {
    level: 9,
    name: 'Trading Dragon',
    model: '/gym/avatars/Dragon_Evolved.glb',
    idleClip: 'CharacterArmature|Flying_Idle',
    celebrateClip: 'CharacterArmature|Fast_Flying',
    scale: 0.97,
    accent: '#f43f5e',
  },
  {
    level: 10,
    name: 'The GOAT',
    model: '/gym/avatars/Skeleton_Warrior.glb',
    // Richest rig in the pack — 20 clips. Uses the combat idle so the final
    // level reads as ready-to-fight rather than standing around.
    idleClip: 'Idle_Combat',
    celebrateClip: '2H_Melee_Attack_Spin',
    scale: 1.0,
    accent: '#fbbf24',
  },
]

export const avatarForLevel = (level: number): LevelAvatar =>
  LEVEL_AVATARS.find((a) => a.level === level) ?? LEVEL_AVATARS[0]
