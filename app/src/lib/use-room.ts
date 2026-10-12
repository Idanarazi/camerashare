// React wrapper around RoomClient: starts it with the screen, reconnects when the app comes back.
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { Mode, Role, RoomClient, RoomState } from './room-client';
import { SERVER } from './theme';

export function useRoom(opts: { role: Role; mode?: Mode; code?: string; key?: string }) {
  const [state, setState] = useState<RoomState>({ kind: 'connecting', slow: false });
  const client = useRef<RoomClient | null>(null);
  const { role, mode, code, key } = opts;

  useEffect(() => {
    const c = new RoomClient({ server: SERVER, role, mode, code, key, onState: setState });
    client.current = c;
    c.start();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') c.wake();
    });
    return () => {
      sub.remove();
      c.stop();
    };
  }, [role, mode, code, key]);

  return {
    state,
    answerKnock: (allowed: boolean) => client.current?.answerKnock(allowed),
    leave: () => client.current?.leave(),
    retry: () => {
      client.current?.stop();
      const c = new RoomClient({ server: SERVER, role, mode, code, key, onState: setState });
      client.current = c;
      c.start();
    },
  };
}
