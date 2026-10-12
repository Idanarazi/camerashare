// The directing phone after scanning or typing a code: joining, waiting to be let in, connected.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Platform, View } from 'react-native';

import { DirectorView } from '@/components/director-view';
import { Message, Screen } from '@/components/status';
import { Button } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import { connectedFeedback, prepareSounds } from '@/lib/sounds';
import { useRoom } from '@/lib/use-room';

export default function Join() {
  const { code, k } = useLocalSearchParams<{ code: string; k?: string }>();
  const { state, leave, sendCommand } = useRoom({ role: 'director', code, key: k });
  const live = state.kind === 'connected' && !state.partnerAway;
  const { settings } = useSettings();
  // The connected moment: this phone builds up, theirs lands it. Sound only the first time.
  const greeted = useRef(false);
  useEffect(() => prepareSounds(), []);
  useEffect(() => {
    if (!live) return;
    const first = !greeted.current;
    greeted.current = true;
    return connectedFeedback('director', first && settings.beeps);
  }, [live]);

  const goHome = () => {
    const end = () => {
      leave();
      router.back();
    };
    if (state.kind === 'connected' && Platform.OS !== 'web') {
      Alert.alert('Leave this session?', 'You can scan their code again to come back.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: end },
      ]);
    } else end();
  };

  // Connected: the directing controls take the whole screen.
  if (state.kind === 'connected') {
    return <DirectorView mode={state.mode} partnerAway={state.partnerAway} send={sendCommand} onLeave={goHome} />;
  }

  let body;
  switch (state.kind) {
    case 'connecting':
      body = state.slow ? (
        <Message busy title="Waking up PicMe…" body="The first connection of the day can take up to a minute. Keep this screen open." />
      ) : (
        <Message busy title="Joining…" />
      );
      break;
    case 'reconnecting':
      body = <Message busy title="Reconnecting…" body="Hang on, your connection dropped for a moment." />;
      break;
    case 'knocking':
      body = <Message busy title="Waiting for them" body="Ask them to let you in on their phone." />;
      break;
    case 'error':
    case 'ended':
      body = (
        <Message tone={state.kind === 'error' ? 'bad' : 'normal'} icon={state.kind === 'error' ? 'close' : 'scan'} title={state.kind === 'error' ? 'Couldn’t join' : 'Session ended'} body={state.message}>
          <View style={{ height: 8 }} />
          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <Button label="Scan again" onPress={() => router.replace('/scan')} />
            <Button kind="ghost" label="Back to home" onPress={() => router.back()} />
          </View>
        </Message>
      );
      break;
    default:
      body = <Message busy title="Joining…" />;
  }

  return <Screen onHome={goHome}>{body}</Screen>;
}
