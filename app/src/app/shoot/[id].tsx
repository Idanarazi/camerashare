// One of your shoots, opened from Home.
import { Redirect, useLocalSearchParams } from 'expo-router';

import { ShootView } from '@/components/shoot-view';
import { findShoot, shootLabel, useShoots } from '@/lib/shoots';

export default function ShootScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shoot = findShoot(useShoots(), id);
  if (!shoot) return <Redirect href="/" />;
  return <ShootView title={shootLabel(shoot.at)} photos={shoot.photos} badge={shoot.demo ? 'Demo' : undefined} />;
}
