import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SupportContact, SupportContacts } from '../api/chatApi';
import { getCachedSupportContacts, loadSupportContacts } from '../supportContactsCache';
import THEME from '../../../shared/theme/theme';

export function SupportContactsCard({ accountId, token, profileKey, refreshKey, onContact }: {
  accountId: string;
  token?: string | null;
  profileKey: string;
  refreshKey: number;
  onContact: (contact: SupportContact) => void;
}) {
  const { tr: uiText } = useUiLanguage();
  const cacheKey = JSON.stringify([accountId, profileKey]);
  const [state, setState] = useState<{ key: string; data: SupportContacts | null; error: string; loading: boolean }>(() => {
    const data = token && accountId ? getCachedSupportContacts(cacheKey) : null;
    return { key: cacheKey, data, error: '', loading: !!token && !!accountId && !data };
  });
  const [retry, setRetry] = useState(0);
  const previous = useRef({ cacheKey, refreshKey, retry });
  const { data, error, loading } = state.key === cacheKey && token && accountId ? state
    : { data: null, error: '', loading: !!token && !!accountId };

  useEffect(() => {
    let active = true;
    let version = 0;
    const forceRefresh = previous.current.cacheKey === cacheKey &&
      (previous.current.refreshKey !== refreshKey || previous.current.retry !== retry);
    previous.current = { cacheKey, refreshKey, retry };
    const load = async (force = false) => {
      const requestVersion = ++version;
      const saved = token && accountId ? getCachedSupportContacts(cacheKey) : null;
      setState({ key: cacheKey, data: saved, error: '', loading: !!token && !!accountId && !saved });
      if (!token || !accountId) return;
      try {
        const contacts = await loadSupportContacts(cacheKey, token, force);
        if (active && requestVersion === version) setState({ key: cacheKey, data: contacts, error: '', loading: false });
      } catch {
        if (active && requestVersion === version) {
          setState({ key: cacheKey, data: saved, loading: false,
            error: saved ? 'Could not refresh contacts.' : 'Could not load contacts.' });
        }
      }
    };
    void load(forceRefresh);
    let appState = AppState.currentState;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && appState !== 'active') void load();
      appState = state;
    });
    return () => { active = false; subscription.remove(); };
  }, [token, accountId, cacheKey, refreshKey, retry]);

  const contactButton = (contact: SupportContact, local: boolean) => (
    <Pressable key={contact.id} accessibilityRole="button"
      accessibilityLabel={local ? `Message ${data?.barangay.name} Barangay` : `Message SerbiSure Support, ${contact.name}`}
      disabled={loading}
      onPress={() => onContact(contact)}
      style={({ pressed }) => [styles.contact, local && styles.divider, pressed && styles.pressed]}>
      <View style={styles.icon}><Ionicons name={local ? 'business-outline' : 'chatbubble-ellipses-outline'} size={22} color={THEME.colors.ink} /></View>
      <View style={styles.copy}>
        <Text style={styles.label}>{local ? `${data?.barangay.name} Barangay` : uiText("SerbiSure Support")}</Text>
        {(data?.superadmins.length || 0) > 1 && !local && <Text style={styles.description}>{contact.name}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#71717A" />
    </Pressable>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{uiText("Need help?")}</Text>
      {loading && <View style={styles.loading}><ActivityIndicator color="#A44913" /><Text style={styles.description}>{uiText("Loading contacts…")}</Text></View>}
      {!loading && error ? <View accessibilityLiveRegion="polite">
        <Text style={styles.notice}>{uiText(error)}</Text>
        <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={styles.retry}>
          <Text style={styles.label}>{uiText("Try again")}</Text>
        </Pressable>
      </View> : null}
      {!loading && data && <>
        {data.superadmins.map(contact => contactButton(contact, false))}
        {data.superadmins.length === 0 && <Text style={styles.notice}>{uiText("Support is unavailable. Try again later.")}</Text>}
        {data.barangay.available ? data.barangay.contacts.map(contact => contactButton(contact, true)) : (
          <View style={[styles.contact, styles.divider]} accessibilityLiveRegion="polite">
            <View style={[styles.icon, styles.iconMuted]}><Ionicons name="business-outline" size={22} color="#71717A" /></View>
            <View style={styles.copy}>
              <Text style={styles.label}>{data.barangay.name ? `${data.barangay.name} Barangay` : uiText("Your Barangay")}</Text>
              <Text style={styles.description}>{data.superadmins.length > 0 ? uiText("Not available yet. Message support.") : uiText("Not available yet.")}</Text>
            </View>
          </View>
        )}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 6, marginBottom: 18, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 3, borderRadius: 20, backgroundColor: '#FFFFFF' },
  title: { fontSize: 14, color: '#52525B', fontFamily: THEME.typography.fontFamily.display, marginBottom: 2 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4E4E7' },
  icon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  iconMuted: {},
  copy: { flex: 1 },
  label: { fontSize: 15, lineHeight: 21, color: THEME.colors.ink, fontFamily: THEME.typography.fontFamily.display },
  description: { marginTop: 2, fontSize: 13, lineHeight: 19, color: '#6B7280' },
  notice: { marginTop: 10, fontSize: 13, lineHeight: 19, color: '#92400E' },
  loading: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  retry: { paddingVertical: 12, alignSelf: 'flex-start' },
  pressed: { opacity: 0.65 },
});
