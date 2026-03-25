'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/* Gym Floor                                                            */
/* ------------------------------------------------------------------ */

function GymFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[16, 14]} />
      <meshStandardMaterial color="#12121f" roughness={0.55} metalness={0.35} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Back Wall                                                            */
/* ------------------------------------------------------------------ */

function BackWall() {
  return (
    <mesh position={[0, 3.5, -6]} receiveShadow>
      <planeGeometry args={[16, 7]} />
      <meshStandardMaterial color="#0c0c1a" roughness={0.92} metalness={0.08} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Trading Monitor — wall-mounted screen with candlestick chart         */
/* ------------------------------------------------------------------ */

function TradingMonitor({
  position,
  candles,
}: {
  position: [number, number, number]
  candles: { h: number; c: string }[]
}) {
  return (
    <group position={position}>
      {/* Bezel */}
      <mesh>
        <boxGeometry args={[2.6, 1.6, 0.06]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.25} metalness={0.85} />
      </mesh>
      {/* Screen panel */}
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[2.4, 1.4]} />
        <meshStandardMaterial
          color="#06140e"
          emissive="#072e17"
          emissiveIntensity={0.4}
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>
      {/* Candlestick bars */}
      {candles.map((bar, i) => {
        const x = -1 + i * (2 / (candles.length - 1))
        const bodyH = Math.abs(bar.h) * 0.55
        const wickH = bodyH * 1.4
        return (
          <group key={i} position={[x, bar.h * 0.18 - 0.15, 0.055]}>
            <mesh>
              <boxGeometry args={[0.09, bodyH, 0.015]} />
              <meshStandardMaterial
                color={bar.c}
                emissive={bar.c}
                emissiveIntensity={0.6}
              />
            </mesh>
            <mesh position={[0, 0, -0.005]}>
              <boxGeometry args={[0.02, wickH, 0.008]} />
              <meshStandardMaterial color="#444" />
            </mesh>
          </group>
        )
      })}
      {/* Glow */}
      <pointLight
        position={[0, 0, 0.6]}
        intensity={0.35}
        color="#22c55e"
        distance={3.5}
        decay={2}
      />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Squat Rack with barbell and plates                                   */
/* ------------------------------------------------------------------ */

function SquatRack({ position }: { position: [number, number, number] }) {
  const postH = 2.4
  const postR = 0.04
  const metal = { roughness: 0.18, metalness: 0.92 }

  return (
    <group position={position}>
      {/* Uprights */}
      {(
        [
          [-0.55, postH / 2, 0],
          [0.55, postH / 2, 0],
          [-0.55, postH / 2, -0.55],
          [0.55, postH / 2, -0.55],
        ] as [number, number, number][]
      ).map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[postR, postR, postH, 8]} />
          <meshStandardMaterial color="#2a2a2a" {...metal} />
        </mesh>
      ))}

      {/* Top cross-bars */}
      {[0, -0.55].map((z, i) => (
        <mesh key={`top-${i}`} position={[0, postH, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
          <meshStandardMaterial color="#2a2a2a" {...metal} />
        </mesh>
      ))}

      {/* J-hooks */}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={`hook-${i}`} position={[x, 1.55, 0.02]}>
          <boxGeometry args={[0.08, 0.06, 0.14]} />
          <meshStandardMaterial color="#3a3a3a" {...metal} />
        </mesh>
      ))}

      {/* Barbell */}
      <mesh position={[0, 1.58, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 2.4, 12]} />
        <meshStandardMaterial color="#999" roughness={0.12} metalness={0.95} />
      </mesh>

      {/* Weight plates */}
      {[-0.9, -0.78, 0.78, 0.9].map((x, i) => (
        <mesh
          key={`plate-${i}`}
          position={[x, 1.58, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry
            args={[0.24 - (i % 2) * 0.04, 0.24 - (i % 2) * 0.04, 0.035, 24]}
          />
          <meshStandardMaterial
            color="#7c3aed"
            roughness={0.15}
            metalness={0.88}
            envMapIntensity={1.4}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Dumbbell Rack                                                        */
/* ------------------------------------------------------------------ */

function DumbbellRack({ position }: { position: [number, number, number] }) {
  const dbColors = ['#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa']
  const metal = { roughness: 0.15, metalness: 0.9 }

  return (
    <group position={position}>
      {/* Vertical supports */}
      {[-0.85, 0, 0.85].map((x, i) => (
        <mesh key={i} position={[x, 0.65, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.3, 8]} />
          <meshStandardMaterial color="#2a2a2a" {...metal} />
        </mesh>
      ))}

      {/* Shelves + dumbbells */}
      {[0.35, 0.8].map((y, si) => (
        <group key={si}>
          <mesh position={[0, y, 0]}>
            <boxGeometry args={[1.9, 0.035, 0.28]} />
            <meshStandardMaterial color="#1e1e1e" roughness={0.3} metalness={0.8} />
          </mesh>
          {[-0.55, -0.2, 0.2, 0.55].map((x, di) => {
            const size = 0.055 + si * 0.015
            return (
              <group key={`db-${si}-${di}`} position={[x, y + 0.1, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.018, 0.018, 0.22, 8]} />
                  <meshStandardMaterial color="#888" roughness={0.12} metalness={0.95} />
                </mesh>
                {[-0.12, 0.12].map((offset, j) => (
                  <mesh
                    key={j}
                    position={[offset, 0, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    <cylinderGeometry args={[size, size, 0.04, 12]} />
                    <meshStandardMaterial color={dbColors[di]} {...metal} envMapIntensity={1.3} />
                  </mesh>
                ))}
              </group>
            )
          })}
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Heavy Bag — subtle sway                                              */
/* ------------------------------------------------------------------ */

function HeavyBag({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.25) * 0.025
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.18 + 0.7) * 0.015
  })

  return (
    <group position={position} ref={ref}>
      <mesh position={[0, 2.8, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.9, 6]} />
        <meshStandardMaterial color="#555" roughness={0.2} metalness={0.9} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <capsuleGeometry args={[0.22, 0.85, 8, 16]} />
        <meshStandardMaterial color="#1a0a0a" roughness={0.88} metalness={0.08} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Flat Bench                                                           */
/* ------------------------------------------------------------------ */

function FlatBench({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.44, 0]}>
        <boxGeometry args={[0.38, 0.07, 1.1]} />
        <meshStandardMaterial color="#18182b" roughness={0.82} metalness={0.08} />
      </mesh>
      {(
        [
          [-0.14, 0.21, -0.4],
          [0.14, 0.21, -0.4],
          [-0.14, 0.21, 0.4],
          [0.14, 0.21, 0.4],
        ] as [number, number, number][]
      ).map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.022, 0.022, 0.42, 8]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.2} metalness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Neon accent lights                                                   */
/* ------------------------------------------------------------------ */

function NeonAccents() {
  return (
    <>
      {/* Horizontal strip — top of back wall */}
      <mesh position={[0, 5.8, -5.9]}>
        <boxGeometry args={[14, 0.045, 0.045]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={2.5} />
      </mesh>
      <pointLight position={[0, 5.5, -5.5]} intensity={0.5} color="#8b5cf6" distance={9} decay={2} />

      {/* Vertical accents */}
      <mesh position={[-7.9, 3, 0]}>
        <boxGeometry args={[0.035, 6, 0.035]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.8} />
      </mesh>
      <mesh position={[7.9, 3, 0]}>
        <boxGeometry args={[0.035, 6, 0.035]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.8} />
      </mesh>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Floating dust motes                                                  */
/* ------------------------------------------------------------------ */

function GymDust({ count = 70 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14
      pos[i * 3 + 1] = Math.random() * 5.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1
    }
    return pos
  }, [count])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.006
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#a78bfa" transparent opacity={0.28} sizeAttenuation />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/* Subtle camera sway                                                   */
/* ------------------------------------------------------------------ */

function CameraRig() {
  useFrame(({ camera, clock }) => {
    camera.position.x = Math.sin(clock.elapsedTime * 0.08) * 0.25
    camera.position.y = 2.2 + Math.sin(clock.elapsedTime * 0.12) * 0.08
    camera.lookAt(0, 1.4, -2)
  })
  return null
}

/* ------------------------------------------------------------------ */
/* Chart data for monitors                                              */
/* ------------------------------------------------------------------ */

const chartLeft = [
  { h: 0.3, c: '#22c55e' }, { h: 0.5, c: '#22c55e' }, { h: -0.2, c: '#ef4444' },
  { h: 0.65, c: '#22c55e' }, { h: 0.8, c: '#22c55e' }, { h: -0.15, c: '#ef4444' },
  { h: 0.95, c: '#22c55e' }, { h: 1.1, c: '#22c55e' }, { h: -0.1, c: '#ef4444' },
  { h: 1.05, c: '#22c55e' }, { h: 1.25, c: '#22c55e' },
]

const chartRight = [
  { h: 0.7, c: '#22c55e' }, { h: -0.35, c: '#ef4444' }, { h: 0.45, c: '#22c55e' },
  { h: 0.6, c: '#22c55e' }, { h: -0.5, c: '#ef4444' }, { h: 0.35, c: '#22c55e' },
  { h: 0.55, c: '#22c55e' }, { h: 0.85, c: '#22c55e' }, { h: -0.2, c: '#ef4444' },
  { h: 0.95, c: '#22c55e' }, { h: 0.8, c: '#22c55e' },
]

/* ------------------------------------------------------------------ */
/* Scene composition                                                    */
/* ------------------------------------------------------------------ */

function GymInterior() {
  return (
    <>
      <fog attach="fog" args={['#080818', 4, 16]} />

      {/* Lighting rig */}
      <ambientLight intensity={0.12} />
      <spotLight position={[0, 5.5, 3]} intensity={0.9} angle={0.55} penumbra={0.8} color="#fff" castShadow />
      <spotLight position={[-3.5, 5.5, -1]} intensity={0.45} angle={0.5} penumbra={0.6} color="#8b5cf6" />
      <spotLight position={[3.5, 5.5, -1]} intensity={0.45} angle={0.5} penumbra={0.6} color="#22c55e" />
      <pointLight position={[0, 0.6, 4]} intensity={0.15} color="#fbbf24" distance={5} decay={2} />

      <Environment preset="night" />

      {/* Structure */}
      <GymFloor />
      <BackWall />

      {/* Wall-mounted trading monitors */}
      <TradingMonitor position={[-2.8, 3.4, -5.85]} candles={chartLeft} />
      <TradingMonitor position={[2.8, 3.4, -5.85]} candles={chartRight} />

      {/* Equipment */}
      <SquatRack position={[-2.5, 0, -3.5]} />
      <FlatBench position={[2.2, 0, -2.8]} />
      <DumbbellRack position={[-5.5, 0, -1.5]} />
      <HeavyBag position={[5, 0, -4]} />

      {/* Accents & atmosphere */}
      <NeonAccents />
      <GymDust count={65} />
      <CameraRig />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Exported canvas wrapper                                              */
/* ------------------------------------------------------------------ */

export default function GymScene({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 2.2, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        shadows
        style={{ background: 'transparent' }}
      >
        <GymInterior />
      </Canvas>
    </div>
  )
}
