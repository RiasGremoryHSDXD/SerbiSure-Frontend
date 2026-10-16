import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import THEME from '../theme/theme';
import { useLanguage } from '../localization/LanguageContext';

export function GreetingCard({ name, greeting, avatarUri, onAvatarPress }: {
  name: string; greeting: string; avatarUri?: string | null; onAvatarPress?: () => void;
}) {
  const { formatDate } = useLanguage();
  const date = formatDate(new Date(), 'greeting').toUpperCase();
  return (
    <View style={styles.card}>
      <Pressable onPress={onAvatarPress}>
        <Image source={{ uri: avatarUri || 'https://i.pravatar.cc/150?u=serbisure' }} style={styles.avatar} />
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
