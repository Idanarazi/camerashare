// "Me": scan the code on the camera phone (or type it), then join.
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { Message, Screen } from '@/components/status';
import { Button, Press } from '@/components/ui';
import { Icon } from '@/components/icon';
import { haptic } from '@/lib/motion';
import { normalizeCode, parseJoin } from '@/lib/room-client';
import { useSettings } from '@/lib/settings';

export default function Scan() {
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [notPicMe, setNotPicMe] = useState(false);
  const handled = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const join = (code: string, key?: string) => {
    if (handled.current) return;
    handled.current = true;
    router.replace({ pathname: '/join', params: key ? { code, k: key } : { code } });
  };

  const onScanned = ({ data }: { data: string }) => {
    if (handled.current) return;
    const j = parseJoin(data);
    if (j) {
      haptic.success();
      join(j.code, j.key);
    } else {
      setNotPicMe(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setNotPicMe(false), 2200);
    }
  };

  const typedCode = normalizeCode(typed);
  const typedOk = /^[a-z]+-[a-z]+-\d{4}-[a-z]+$/.test(typedCode);

  const typeSheet = (
    <Modal visible={typing} transparent animationType="slide" onRequestClose={() => setTyping(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <View style={[styles.sheet, { backgroundColor: t.surface, paddingBottom: insets.bottom + 20 }]}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: t.text }}>Type the code</Text>
          <Text style={{ fontSize: 14.5, color: t.text2 }}>It's under the QR code on their phone, like “lake wren 7698 cove”.</Text>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="go"
            onSubmitEditing={() => typedOk && join(typedCode)}
            placeholder="lake wren 7698 cove"
            placeholderTextColor={t.text3}
            accessibilityLabel="Code"
            style={[styles.input, { color: t.text, backgroundColor: t.surface2, borderColor: t.line }]}
          />
          <Button label="Join" onPress={() => typedOk && join(typedCode)} />
          <Button kind="ghost" label="Cancel" onPress={() => setTyping(false)} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (!permission) return <Screen onHome={() => router.back()} homeIcon="close" homeLabel="Close">{null}</Screen>;

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <Screen onHome={() => router.back()} homeIcon="close" homeLabel="Close">
        <Message
          icon="scan"
          title="Scan their code"
          body={blocked ? 'Camera access is off for PicMe. Turn it on in Settings to scan, or type the code instead.' : 'PicMe needs your camera to scan the code on their phone. Nothing is recorded.'}>
          <View style={{ height: 8 }} />
          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            {blocked ? <Button label="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} /> : <Button label="Allow camera" onPress={() => requestPermission()} />}
            <Button kind="secondary" label="Type the code instead" onPress={() => setTyping(true)} />
          </View>
        </Message>
        {typeSheet}
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScanned} />
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <Press onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Glass style={styles.round}>
            <Icon name="close" size={22} color="#F5F5F2" />
          </Glass>
        </Press>
        <Glass style={styles.pill}>
          <Text style={styles.pillText} accessibilityLiveRegion="polite">
            {notPicMe ? 'That’s not a PicMe code' : 'Point at the code on their phone'}
          </Text>
        </Glass>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.frame} pointerEvents="none">
        <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18, borderColor: t.accent }]} />
        <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18, borderColor: t.accent }]} />
        <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18, borderColor: t.accent }]} />
        <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18, borderColor: t.accent }]} />
      </View>

      <View style={[styles.bottom, { bottom: insets.bottom + 24 }]}>
        <Text style={styles.hint}>On their phone: PicMe › Someone else</Text>
        <Press onPress={() => setTyping(true)} accessibilityRole="button">
          <Glass style={styles.glassBtn}>
            <Icon name="key" size={20} color="#F5F5F2" />
            <Text style={{ color: '#F5F5F2', fontSize: 17, fontWeight: '700' }}>Type the code instead</Text>
          </Glass>
        </Press>
      </View>
      {typeSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  glassBtn: { minHeight: 54, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  pill: { minHeight: 38, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 19, borderWidth: 1, justifyContent: 'center', flexShrink: 1 },
  pillText: { color: '#F5F5F2', fontSize: 14.5, fontWeight: '700' },
  frame: { position: 'absolute', alignSelf: 'center', top: '50%', width: 250, height: 250, marginTop: -150 },
  corner: { position: 'absolute', width: 48, height: 48 },
  bottom: { position: 'absolute', left: 20, right: 20, gap: 14 },
  hint: { color: 'rgba(245,245,242,0.85)', fontSize: 14.5, textAlign: 'center' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, gap: 12 },
  input: { height: 54, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, fontSize: 18, fontWeight: '600' },
});
