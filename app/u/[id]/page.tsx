import { Metadata } from 'next';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = { title: '프로필 | 재테크한입' };

export default function ProfilePage({ params }: { params: { id: string } }) {
  return <ProfileClient userId={params.id} />;
}
