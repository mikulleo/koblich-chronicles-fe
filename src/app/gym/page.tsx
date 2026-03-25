import { Metadata } from 'next'
import GymClient from './GymClient'

export const metadata: Metadata = {
  title: 'Trading Gym | Koblich Chronicles',
  description: 'Train your trading edge — replay real trades and make your own calls, plus track your mindset and build discipline.',
}

export default function GymPage() {
  return <GymClient />
}
