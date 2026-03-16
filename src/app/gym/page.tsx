import { Metadata } from 'next'
import GymClient from './GymClient'

export const metadata: Metadata = {
  title: 'Trading Gym | Koblich Chronicles',
  description: 'Practice your trading decisions by replaying real trades. Compare your calls with actual outcomes.',
}

export default function GymPage() {
  return <GymClient />
}
