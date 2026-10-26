import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BookingItem } from '../api/bookingApi';

export function ContractDownloadCard({ summary }: Readonly<{ summary: NonNullable<BookingItem['contract_summary']> }>) {
  const { tr: uiText } = useUiLanguage();
  const download = async () => {
    try { await Linking.openURL(summary.contract_pdf_url); }
    catch { Alert.alert('Unable to Download', 'Check your connection and try again.'); }
  };
  return (
    <Pressable accessibilityRole="button" onPress={download} style={styles.button}>
      <Ionicons name="download-outline" size={16} color="#4B5563" />
      <Text style={styles.buttonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {uiText("Download DOLE Standard Kasambahay Contract")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  buttonText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
});

