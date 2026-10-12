import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import THEME from '../theme/theme';

export function ProfileAvatar({ uri, name, size = 48 }: Readonly<{ uri?: string | null; name: string; size?: number }>) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const photoUri = uri?.trim();
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (photoUri && failedUri !== photoUri) {
    return <Image source={{ uri: photoUri }} style={[styles.photo, shape]} resizeMode="cover" accessibilityLabel={`${name}'s profile photo`} onError={() => setFailedUri(photoUri)} />;
  }
  return (
    <View style={[styles.fallback, shape]} accessibilityLabel={`${name}'s profile photo placeholder`}>
      <Text style={[styles.initials, { fontSize: size * 0.32 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: THEME.colors.brandLight },
  fallback: { backgroundColor: THEME.colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  initials: { color: THEME.colors.brandDark, fontFamily: THEME.typography.fontFamily.display },
});
