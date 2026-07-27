import { Metadata } from 'next'
import AvatarLabClient from './AvatarLabClient'

/** Review-only preview of the 3D gym level avatars. Not linked from the app. */
export const metadata: Metadata = {
  title: 'Avatar Lab (review) | Koblich Chronicles',
  robots: { index: false, follow: false },
}

export default function AvatarLabPage() {
  return <AvatarLabClient />
}
