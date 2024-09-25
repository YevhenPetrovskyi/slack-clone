'use client';

import { useRouter } from 'next/navigation';

import { UserButton } from '@/features/auth/components/user-button';

export default function Home() {
  return (
    <div>
      Logged in!
      <UserButton />
    </div>
  );
}
