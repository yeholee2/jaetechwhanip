import { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = { title: '프로필 | 재테크한입' };

export default function ProfilePage({ params }: { params: { id: string } }) {
  return (
    <AppShell active="my">
      <ProfileClient userId={params.id} />
    </AppShell>
  );
}
