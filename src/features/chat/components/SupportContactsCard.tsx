import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchSupportContacts, SupportContact, SupportContacts } from '../api/chatApi';
import THEME from '../../../shared/theme/theme';

export function SupportContactsCard({ token, profileKey, refreshKey, onContact }: {
  token?: string | null;
  profileKey: string;
  refreshKey: number;
  onContact: (contact: SupportContact) => void;
}) {
  const { tr: uiText } = useUiLanguage();
  const [data, setData] = useState<SupportContacts | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let version = 0;
    setData(null);
    const load = async () => {
      const requestVersion = ++version;
      setLoading(true);
      setError('');
      if (!token) { setLoading(false); return; }
      try {
        const contacts = await fetchSupportContacts(token);
        if (active && requestVersion === version) setData(contacts);
      } catch {
        if (active && requestVersion === version) {
          setData(null);
          setError('Could not load contacts.');
        }
      } finally {
        if (active && requestVersion === version) setLoading(false);
      }
    };
    void load();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void load();
    });
    return () => { active = false; subscription.remove(); };
  }, [token, profileKey, refreshKey, retry]);

  const contactButton = (contact: SupportContact, local: boolean) => (
    <Pressable key={contact.id} accessibilityRole="button"
      accessibilityLabel={local ? `Message ${data?.barangay.name} Barangay` : `Message SerbiSure Support, ${contact.name}`}
      disabled={loading}
      onPress={() => onContact(contact)}
      style={({ pressed }) => [styles.contact, local && styles.divider, pressed && styles.pressed]}>
      <View style={styles.icon}><Ionicons name={local ? 'business-outline' : 'chatbubble-ellipses-outline'} size={20} color="#A44913" /></View>
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
        <Text style={styles.notice}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={styles.retry}>
          <Text style={styles.label}>{uiText("Try again")}</Text>
        </Pressable>
      </View> : null}
      {!loading && data && <>
        {data.superadmins.map(contact => contactButton(contact, false))}
        {data.superadmins.length === 0 && <Text style={styles.notice}>{uiText("Support is unavailable. Try again later.")}</Text>}
        {data.barangay.available ? data.barangay.contacts.map(contact => contactButton(contact, true)) : (
          <View style={[styles.contact, styles.divider]} accessibilityLiveRegion="polite">
            <View style={[styles.icon, styles.iconMuted]}><Ionicons name="business-outline" size={20} color="#71717A" /></View>
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
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF0E5', alignItems: 'center', justifyContent: 'center' },
  iconMuted: { backgroundColor: '#F4F4F5' },
  copy: { flex: 1 },
  label: { fontSize: 15, lineHeight: 21, color: THEME.colors.ink, fontFamily: THEME.typography.fontFamily.display },
  description: { marginTop: 2, fontSize: 13, lineHeight: 19, color: '#6B7280' },
  notice: { marginTop: 10, fontSize: 13, lineHeight: 19, color: '#92400E' },
  loading: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  retry: { paddingVertical: 12, alignSelf: 'flex-start' },
  pressed: { opacity: 0.65 },
});
