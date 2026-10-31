import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import THEME from '../theme/theme';
import { useLanguage } from '../localization/LanguageContext';

export function GreetingCard({ name, greeting, avatarUri, onAvatarPress }: {
  name: string; greeting: string; avatarUri?: string | null; onAvatarPress?: () => void;
}) {
  const { formatDate } = useLanguage();
  const date = formatDate(new Date(), 'greeting').toUpperCase();
  return (
    <View style={styles.card}>
      <Pressable onPress={onAvatarPress} style={{ marginRight: 14 }}>
        <ProfileAvatar uri={avatarUri} name={name} size={48} />
      </Pressable>
      <View style={styles.text}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit>{greeting}, {name}!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: THEME.colors.white, marginHorizontal: 20, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 14 }, text: { flex: 1 },
  date: { fontSize: 10.5, fontFamily: THEME.typography.fontFamily.secondaryMedium, color: THEME.colors.textMuted, letterSpacing: 0.6, marginBottom: 2 },
  greeting: { fontSize: 19, fontFamily: THEME.typography.fontFamily.display, color: THEME.colors.ink },
});
