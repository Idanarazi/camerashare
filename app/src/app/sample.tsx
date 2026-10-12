// A sample shoot: what a new user gets after shooting with PicMe. Tap any photo, swipe, heart.
import { router } from 'expo-router';

import { ShootView } from '@/components/shoot-view';
import { SAMPLE_PHOTOS } from '@/lib/samples';

export default function Sample() {
  return (
    <ShootView
      badge="Sample"
      title="One afternoon, four keepers"
      intro="This is what a shoot looks like. Tap a photo to open it, swipe through, and tap ♥ on the ones you love."
      photos={SAMPLE_PHOTOS}
      footer={{ label: 'Start your first shoot', onPress: () => router.back() }}
    />
  );
}
