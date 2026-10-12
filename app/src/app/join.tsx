// The directing phone after scanning or typing a code: joining, waiting to be let in, connected.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Platform, View } from 'react-native';

import { Message, Screen } from '@/components/status';
import { Button } from '@/components/ui';
import { haptic } from '@/lib/motion';
import { useRoom } from '@/lib/use-room';

export default function Join() {
  const { code, k } = useLocalSearchParams<{ code: string; k?: string }>();
  const { state, leave } = useRoom({ role: 'director', code, key: k });
  const live = state.kind === 'connected' && !state.partnerAway;
  useEffect(() => {
    if (live) haptic.success();
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
    case 'connected':
      body = state.partnerAway ? (
        <Message busy title="Their camera dropped out" body="Their connection dropped. If they open PicMe again, you'll reconnect by yourself." />
      ) : (
        <Message tone="good" icon="bolt" title="Connected!" body="Your phones are paired. Live video comes in the next build, so for now this is where pairing ends.">
          <View style={{ height: 8 }} />
          <Button kind="secondary" label="Leave session" onPress={goHome} />
        </Message>
      );
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
