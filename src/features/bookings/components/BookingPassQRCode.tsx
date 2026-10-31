import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { API_BASE_URL } from '../../../shared/api/config';
import { useLanguage } from '../../../shared/localization/LanguageContext';

// React Native 0.74 does not supply TextEncoder. The QR library includes this
// polyfill; install it only when missing, before generating the local matrix.
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = require('text-encoding').TextEncoder;
}

export function bookingPassUrl(passUrl?: string | null): string | null {
  if (typeof passUrl !== 'string' || !passUrl) return null;
  const prefix = `${API_BASE_URL.replace(/\/+$/, '')}/verify/?token=`;
  if (!passUrl.startsWith(prefix)) return null;
  try {
    const token = decodeURIComponent(passUrl.slice(prefix.length));
    // Shape/origin checks only. Django verifies the signature and its age.
    return /^[A-Za-z0-9_-]+:[A-Za-z0-9]+:[A-Za-z0-9_-]+$/.test(token) ? passUrl : null;
  } catch { return null; }
}

export function BookingPassQRCode({ bookingId, passUrl }: { bookingId?: string | null; passUrl?: string | null }) {
  const { tr } = useLanguage();
  const [width, setWidth] = useState(264);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const url = bookingPassUrl(passUrl);
  const code = bookingId && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookingId)
    ? `BK-${bookingId.slice(0, 8).toUpperCase()}` : null;

  useEffect(() => {
    mounted.current = true;
    setFeedback('');
    setFailed(false);
    return () => {
      mounted.current = false;
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [bookingId, passUrl]);

  const copy = async () => {
    if (!code) return;
    try {
      const copied = await Clipboard.setStringAsync(code);
      if (!mounted.current) return;
      setFeedback(copied ? 'Booking code copied' : 'Could not copy. Please write down the booking code.');
    } catch {
      if (!mounted.current) return;
      setFeedback('Could not copy. Please write down the booking code.');
    }
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => { if (mounted.current) setFeedback(''); }, 2500);
  };

  if (!code) {
    return <Text style={styles.placeholder}>{tr('QR Pass will be generated once booking is sent.')}</Text>;
  }

  return (
    <View style={styles.container} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <Text style={styles.title}>{tr('Digital Village Pass')}</Text>
      <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel={tr('Copy booking code')}
        accessibilityHint={tr('Scan this QR code to check the booking online.')} style={styles.copyTarget}>
        {!url ? <Text style={styles.placeholder}>{tr('Connect to the internet and reopen this booking to get a fresh pass.')}</Text> :
          failed ? <Text style={styles.placeholder}>{tr('QR unavailable. Please reload the ticket.')}</Text> :
          <QRCode value={url} size={Math.max(120, Math.min(300, Math.floor(width)))}
            color="#000000" backgroundColor="#FFFFFF" quietZone={32} ecl="M"
            onError={() => { if (mounted.current) setFailed(true); }} />}
        <Text selectable={false} style={styles.code}>{code}</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={styles.hint}>
        {tr(feedback || 'Tap the QR or code to copy the booking code.')}
      </Text>
      <Text style={styles.note}>{tr('The guard needs internet to check the live booking status.')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center', backgroundColor: '#FFFFFF' },
  title: { fontSize: 14, fontWeight: '700', color: '#171717', marginBottom: 4, textAlign: 'center' },
  copyTarget: { alignItems: 'center', minHeight: 44, backgroundColor: '#FFFFFF', maxWidth: '100%' },
  code: { fontSize: 22, fontWeight: '800', letterSpacing: 1.2, color: '#000000', textAlign: 'center', marginTop: 4, paddingVertical: 8 },
  placeholder: { fontSize: 13, lineHeight: 20, color: '#64748B', paddingVertical: 12, textAlign: 'center' },
  hint: { fontSize: 12, lineHeight: 18, color: '#334155', textAlign: 'center', marginTop: 4 },
  note: { fontSize: 11, lineHeight: 17, color: '#64748B', textAlign: 'center', marginTop: 6 },
});
