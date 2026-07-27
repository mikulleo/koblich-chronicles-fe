'use client'

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls, useAnimations, useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import { cn } from '@/lib/utils'
import type { LevelAvatar } from './levelAvatars'
import { LEVEL_AVATARS } from './levelAvatars'

/**
 * Renders a rigged, animated CC0 character for a gym level.
 *
 * Every model is auto-fitted to the same height and grounded at y=0 so a
 * mushroom and a dragon frame identically; per-level `scale` then reintroduces
 * a deliberate sense of size. Lighting is explicit (no drei <Environment>,
 * which would pull an HDRI off a CDN at runtime).
 */

/**
 * Frame budget in world units. Height and width are fitted separately: the
 * quadrupeds (fox, wolf, bull) are far longer than they are tall, so fitting on
 * height alone runs them off the sides while fitting on the longest axis leaves
 * the upright characters tiny. Width uses max(x, z) because the model turns.
 */
const FRAME_HEIGHT = 2.2
const FRAME_WIDTH = 3.0

interface Fit {
  scale: number
  position: [number, number, number]
}

/**
 * Measure a character as it is actually drawn.
 *
 * Neither of the obvious approaches works on these rigs. `Box3.setFromObject()`
 * expands over every Object3D including the armature, and Quaternius bone chains
 * reach far outside the silhouette (a wolf measures 527 units that way). Using
 * the geometry bounding boxes instead fixes that, but the packs are inconsistent
 * about whether the 100x scale sits on the mesh node or on the bones, so some
 * characters come out wildly too large.
 *
 * So we skin the vertices ourselves: `applyBoneTransform` puts each vertex where
 * the GPU would, giving bounds that match the rendered pose on every model. This
 * runs once, on a frame where the mixer has already posed the skeleton, and the
 * meshes are low-poly enough (a few thousand verts, sampled) to make it cheap.
 */
function computeSkinnedBounds(root: THREE.Object3D, reference: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3()
  const vertex = new THREE.Vector3()
  root.updateWorldMatrix(true, true)

  // Measure in the reference (parent group) space, not world space: the group
  // carries the layout offset and the yaw, and a rotated AABB in world space
  // would both mis-centre the model and inflate as it turns.
  const toLocal = reference.matrixWorld.clone().invert()

  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    const position = mesh.geometry.attributes.position
    if (!position) return

    const skinned = mesh as unknown as THREE.SkinnedMesh
    const isSkinned = skinned.isSkinnedMesh === true
    if (isSkinned) skinned.skeleton?.update()

    // ~600 samples is plenty to bound a low-poly silhouette
    const step = Math.max(1, Math.floor(position.count / 600))
    for (let i = 0; i < position.count; i += step) {
      vertex.fromBufferAttribute(position, i)
      if (isSkinned) skinned.applyBoneTransform(i, vertex)
      vertex.applyMatrix4(mesh.matrixWorld).applyMatrix4(toLocal)
      box.expandByPoint(vertex)
    }
  })

  return box
}

/* ------------------------------------------------------------------ */
/* Character                                                            */
/* ------------------------------------------------------------------ */

function Character({
  avatar,
  celebrate,
  spin,
  yaw,
}: {
  avatar: LevelAvatar
  celebrate: boolean
  spin: boolean
  yaw: number
}) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(avatar.model)

  // Clone per instance — the roadmap renders several avatars at once and a
  // shared skinned mesh would have them all driven by the same skeleton.
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { actions } = useAnimations(animations, group)

  // Auto-fit is deferred to the first posed frame — see computeSkinnedBounds.
  const [fit, setFit] = useState<Fit | null>(null)
  const frames = useRef(0)
  // Guards the measurement separately from `fit`: setFit is batched, so several
  // more frames run before the state lands and a `!fit` check would re-measure
  // on each of them.
  const measured = useRef(false)

  useEffect(() => {
    setFit(null)
    frames.current = 0
    measured.current = false
  }, [model, avatar.scale])

  // Play the idle clip, or the celebrate clip on level-up
  useEffect(() => {
    const names = Object.keys(actions)
    if (!names.length) return

    const wanted = celebrate ? (avatar.celebrateClip ?? avatar.idleClip) : avatar.idleClip
    // Clip names differ between Quaternius packs ("Idle" vs
    // "CharacterArmature|Idle"), so match loosely before giving up.
    const suffix = wanted.split('|').pop() ?? wanted
    const key =
      names.find((n) => n === wanted) ??
      names.find((n) => n.split('|').pop() === suffix) ??
      names.find((n) => n.toLowerCase().includes('idle')) ??
      names[0]

    const action = actions[key]
    if (!action) return
    action.reset().fadeIn(0.35).play()
    return () => {
      action.fadeOut(0.35)
    }
  }, [actions, avatar.idleClip, avatar.celebrateClip, celebrate])

  useFrame((state, delta) => {
    if (!group.current) return

    // Wait a couple of frames so useAnimations' mixer has posed the skeleton,
    // otherwise we'd measure the bind pose again.
    if (!measured.current && ++frames.current > 2) {
      const box = computeSkinnedBounds(model, group.current)
      if (!box.isEmpty()) {
        measured.current = true
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        const horizontal = Math.max(size.x, size.z, 0.001)
        const s =
          Math.min(FRAME_HEIGHT / Math.max(size.y, 0.001), FRAME_WIDTH / horizontal) * avatar.scale
        setFit({
          scale: s,
          // Centred on X/Z, resting on y=0 so the contact shadow lands under it
          position: [-center.x * s, -box.min.y * s, -center.z * s],
        })
      }
    }

    if (spin) group.current.rotation.y += delta * 0.35
    else group.current.rotation.y = yaw
  })

  return (
    <group ref={group} rotation={[0, yaw, 0]}>
      {/* Hidden until measured — avoids a visible pop from unscaled to fitted */}
      <primitive
        object={model}
        visible={fit !== null}
        scale={fit?.scale ?? 1}
        position={fit?.position ?? [0, 0, 0]}
      />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Lighting rig                                                         */
/* ------------------------------------------------------------------ */

function Lighting({ accent }: { accent: string }) {
  return (
    <>
      {/* Generous ambient — several characters are near-black and vanish otherwise */}
      <ambientLight intensity={0.85} />
      {/* Key */}
      <spotLight
        position={[3, 5, 4]}
        intensity={90}
        angle={0.6}
        penumbra={0.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {/* Accent rim from behind — this is what sells the "hero" look */}
      <spotLight position={[-3.5, 3.5, -3]} intensity={70} angle={0.7} penumbra={1} color={accent} />
      {/* Cool fill, matching the gym's purple theme */}
      <pointLight position={[-3, 1.5, 3]} intensity={22} color="#8b5cf6" />
      <pointLight position={[0, 0.2, 2]} intensity={8} color={accent} distance={6} decay={2} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Canvas wrapper                                                       */
/* ------------------------------------------------------------------ */

export interface LevelAvatar3DProps {
  avatar: LevelAvatar
  /** Emoji shown while the model streams in, and if WebGL/loading fails */
  fallbackEmoji?: string
  /** Drag-to-rotate + zoom. Off for the small card, on in the showcase. */
  interactive?: boolean
  /** Slow turntable rotation. Off by default — a fixed 3/4 pose reads better. */
  spin?: boolean
  /** Presentation angle in radians when not spinning */
  yaw?: number
  /** Play the level-up clip instead of the idle loop */
  celebrate?: boolean
  /** Dim + desaturate for locked levels in the roadmap */
  locked?: boolean
  className?: string
}

export default function LevelAvatar3D({
  avatar,
  fallbackEmoji,
  interactive = false,
  spin = false,
  yaw = 0.6,
  celebrate = false,
  locked = false,
  className,
}: LevelAvatar3DProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className={cn('flex items-center justify-center text-4xl', className)}>
        {fallbackEmoji ?? '🏋️'}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Accent glow behind the character — cheap stand-in for bloom, which
          would otherwise need @react-three/postprocessing */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: `radial-gradient(circle at 50% 62%, ${avatar.accent}33 0%, transparent 62%)`,
        }}
      />

      <Canvas
        camera={{ position: [0, 1.15, 4.2], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        shadows
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.15
        }}
        onError={() => setFailed(true)}
      >
        <Lighting accent={avatar.accent} />

        <Suspense fallback={null}>
          <group position={[0, -0.85, 0]}>
            <Character avatar={avatar} celebrate={celebrate} spin={spin} yaw={yaw} />
            <ContactShadows
              position={[0, 0.01, 0]}
              opacity={0.55}
              scale={5}
              blur={2.4}
              far={3}
              color="#000000"
            />
          </group>
        </Suspense>

        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={2.4}
            maxDistance={7}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 1.9}
            autoRotate={false}
          />
        )}
      </Canvas>

      {/* Locked levels stay recognisable — desaturated and dimmed, not blacked out */}
      {locked && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[#0a1629]/25 [backdrop-filter:grayscale(0.85)_brightness(0.85)]"
        />
      )}
    </div>
  )
}

/** Warm the cache for the levels the user can actually see */
export function preloadLevelAvatars(levels: number[]) {
  for (const lvl of levels) {
    const a = LEVEL_AVATARS.find((x) => x.level === lvl)
    if (a) useGLTF.preload(a.model)
  }
}
