import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../../shared/theme/theme';
import { SERVICE_CHOICES, WORK_DAYS } from '../engagementForm';
import { workSetupLabel, type WorkSetup } from '../workSetup';

export type BookingOfferStep = 1 | 2 | 3 | 4;

interface Props {
  serviceCategory: string[];
  workSetup: WorkSetup | null;
  bookingType: 'short_term' | 'long_term';
  startDate: string; endDate: string; workHours: string; days: string[];
  ongoing?: boolean;
  region: string; location: string; salary: string;
  onEdit?: (step: BookingOfferStep) => void;
  disabled?: boolean;
}

/** A readable summary of entered or saved terms; missing historic values stay explicit. */
export function BookingOfferReview(props: Props) {
  const { tr: uiText } = useUiLanguage();
  const short = props.bookingType === 'short_term';
  const amount = props.salary.trim() && Number.isFinite(Number(props.salary))
    ? `₱${Number(props.salary).toLocaleString('en-PH', { maximumFractionDigits: 2 })}` : props.salary || 'Not provided';
  const services = props.serviceCategory.map(value => SERVICE_CHOICES.find(item => item.id === value)?.label || value.replace(/_/g, ' ')).join(', ');
  const days = WORK_DAYS.filter(day => props.days.includes(day.value)).map(day => uiText(day.label)).join(', ');
  const sections = [
    { title: 'Service & setup', icon: 'briefcase-outline' as const, step: 1 as const, rows: [
      ['Services', services], ['Engagement', short ? 'Short-term' : 'Long-term'],
      ...(!short ? [['Work setup', workSetupLabel(props.workSetup)]] : []),
    ] },
    { title: 'Schedule', icon: 'calendar-outline' as const, step: 2 as const, rows: [
      [short ? 'Service date' : 'Starts', props.startDate],
      ...(!short || (props.endDate && props.endDate !== props.startDate) ? [['Ends', props.ongoing ? uiText('No end date') : props.endDate]] : []),
      ['Work hours (PH)', props.workHours], ...(!short ? [['Work days', days]] : []),
    ] },
    { title: 'Location & pay', icon: 'location-outline' as const, step: 3 as const, rows: [
      ['Work region', props.region], ['Address', props.location],
    ] },
  ];
  return <View>
    {sections.map(section => <View key={section.title} style={styles.card}>
      <View style={styles.headingRow}>
        <Ionicons name={section.icon} size={18} color={THEME.colors.brandDark} />
        <Text style={styles.heading}>{uiText(section.title)}</Text>
        {props.onEdit && <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${section.title}`} disabled={props.disabled}
          hitSlop={8} onPress={() => props.onEdit?.(section.step)}><Text style={styles.edit}>{uiText("Edit")}</Text></Pressable>}
      </View>
      {section.rows.map(([label, value]) => <View key={label} style={styles.row}>
        <Text style={styles.label}>{uiText(label || '')}</Text><Text style={styles.value}>{uiText(value || 'Not provided')}</Text>
      </View>)}
      {section.step === 3 && <View style={styles.pay}>
        <Text style={styles.label}>{short ? 'Agreed daily rate' : 'Agreed monthly salary'}</Text>
        <Text style={styles.amount}>{amount}<Text style={styles.unit}> {short ? uiText("/ day") : uiText("/ month")}</Text></Text>
      </View>}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: THEME.colors.white, borderRadius: 22, padding: 16, marginBottom: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  heading: { flex: 1, color: THEME.colors.ink, fontFamily: THEME.typography.fontFamily.mainBold, fontSize: 15 },
  edit: { color: '#9A3412', fontFamily: THEME.typography.fontFamily.mainBold, fontSize: 13 },
  row: { marginBottom: 12 }, label: { color: THEME.colors.textSecondary, fontSize: 12, marginBottom: 3 },
  value: { color: THEME.colors.ink, fontSize: 14, lineHeight: 20 },
  pay: { backgroundColor: THEME.colors.brandLight, borderRadius: 14, padding: 12, marginTop: 2 },
  amount: { color: THEME.colors.ink, fontSize: 24, fontFamily: THEME.typography.fontFamily.mainExtraBold },
  unit: { color: THEME.colors.textSecondary, fontSize: 12, fontFamily: THEME.typography.fontFamily.mainRegular },
});
