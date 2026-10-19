import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { workSetupLabel } from '../workSetup';
import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BookingItem } from '../api/bookingApi';

export function ContractDownloadCard({ summary }: Readonly<{ summary: NonNullable<BookingItem['contract_summary']> }>) {
  const { tr: uiText, formatDate } = useUiLanguage();
  const download = async () => {
    try { await Linking.openURL(summary.contract_pdf_url); }
    catch { Alert.alert('Unable to Download', 'Check your connection and try again.'); }
  };
  return <View style={styles.card}>
    <Text style={styles.title}>{uiText("Long-term engagement terms")}</Text>
    <Text style={styles.terms}>{summary.service_category.map(value => value.replace(/_/g, ' ')).join(', ')} · {summary.rate_needs_review ? 'Confirm the amount from the original agreement' : 'PHP ' + Number(summary.rate_amount).toLocaleString() + '/month'}</Text>
    <Text style={styles.terms}>{uiText("Work setup:")} {workSetupLabel(summary.work_setup)}</Text>
    <Text style={styles.terms}>{uiText("Starts:")} {new Date(summary.start_date).toLocaleDateString()}</Text>
    <Text style={styles.terms}>{summary.end_date ? `${uiText('End date')}: ${formatDate(summary.end_date, 'full')}` : uiText('No end date')}</Text>
    <Text style={styles.terms}>{summary.location}</Text>
    <Text style={styles.notice}>{summary.notice}</Text>
    <Pressable accessibilityRole="button" onPress={download} style={styles.button}>
      <Ionicons name="download-outline" size={18} color="#9A3412" />
      <Text style={styles.buttonText}>{uiText("Download DOLE Standard Kasambahay Contract (PDF)")}</Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF4ED', borderRadius: 16, padding: 14, marginVertical: 12 },
  title: { color: '#0D0D11', fontWeight: '700', fontSize: 15, marginBottom: 6 },
  terms: { color: '#374151', fontSize: 12, marginBottom: 4 },
  notice: { color: '#6B7280', fontSize: 12, lineHeight: 18, marginVertical: 8 },
  button: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#9A3412', fontSize: 12, fontWeight: '700', flex: 1 },
});

