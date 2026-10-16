import { useLanguage as useUiLanguage } from '../localization/LanguageContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import THEME from '../theme/theme';

export function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { tr: uiText } = useUiLanguage();
  return (
    <View style={styles.notice}>
      <Text style={styles.message}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}><Text style={styles.retry}>{uiText("Retry")}</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: THEME.colors.white, borderRadius: 24, padding: 20, marginBottom: 12 },
  message: { fontFamily: THEME.typography.fontFamily.secondaryRegular, color: THEME.colors.textSecondary },
  retryButton: { minHeight: 44, justifyContent: 'center' },
  retry: { color: THEME.colors.brandDark, fontFamily: THEME.typography.fontFamily.secondarySemiBold },
});
