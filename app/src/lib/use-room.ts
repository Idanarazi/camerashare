// React wrapper around RoomClient: starts it with the screen, reconnects when the app comes back.
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Command } from './directing';
import { Mode, PartnerEvent, Role, RoomClient, RoomState } from './room-client';
import { SERVER } from './theme';

export function useRoom(opts: { role: Role; mode?: Mode; code?: string; key?: string; token?: string; onCommand?: (command: Command, data?: any) => void; onEvent?: (e: PartnerEvent) => void }) {
  // With a token, this screen continues a session in a new role (after switching roles).
  const { role, mode, code, key, token } = opts;
  const [state, setState] = useState<RoomState>(token ? { kind: 'switching' } : { kind: 'connecting', slow: false });
  const client = useRef<RoomClient | null>(null);
  const session = token && code ? { code, token, mode: 'photo' as Mode } : undefined;
  // The latest handler, without restarting the connection when it changes.
  const onCommand = useRef(opts.onCommand);
  onCommand.current = opts.onCommand;
  const onEvent = useRef(opts.onEvent);
  onEvent.current = opts.onEvent;
  const make = () =>
    new RoomClient({ server: SERVER, role, mode, code, key, session, onState: setState, onCommand: (c, d) => onCommand.current?.(c, d), onEvent: (e) => onEvent.current?.(e) });

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
  }, [role, mode, code, key, token]);

  return {
    state,
    answerKnock: (allowed: boolean) => client.current?.answerKnock(allowed),
    sendCommand: (command: Command, data?: object) => client.current?.sendCommand(command, data) ?? false,
    sendReference: (data: string | null) => client.current?.sendReference(data) ?? false,
    announceShot: (count: number) => client.current?.announceShot(count) ?? false,
    sendPhoto: (burst: string, index: number, count: number, data: string) => client.current?.sendPhoto(burst, index, count, data) ?? false,
    requestSwap: () => client.current?.requestSwap() ?? false,
    answerSwap: (accept: boolean) => client.current?.answerSwap(accept),
    leave: () => client.current?.leave(),
    retry: () => {
      client.current?.stop();
      const c = make();
      client.current = c;
      c.start();
    },
  };
}
