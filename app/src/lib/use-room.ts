// React wrapper around RoomClient: starts it with the screen, reconnects when the app comes back.
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Command } from './directing';
import { Mode, Role, RoomClient, RoomState } from './room-client';
import { SERVER } from './theme';

export function useRoom(opts: { role: Role; mode?: Mode; code?: string; key?: string; onCommand?: (command: Command, data?: any) => void }) {
  const [state, setState] = useState<RoomState>({ kind: 'connecting', slow: false });
  const client = useRef<RoomClient | null>(null);
  const { role, mode, code, key } = opts;
  // The latest handler, without restarting the connection when it changes.
  const onCommand = useRef(opts.onCommand);
  onCommand.current = opts.onCommand;
  const make = () => new RoomClient({ server: SERVER, role, mode, code, key, onState: setState, onCommand: (c, d) => onCommand.current?.(c, d) });

  useEffect(() => {
    const c = make();
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
    sendCommand: (command: Command, data?: object) => client.current?.sendCommand(command, data) ?? false,
    leave: () => client.current?.leave(),
    retry: () => {
      client.current?.stop();
      const c = make();
      client.current = c;
      c.start();
    },
  };
}
