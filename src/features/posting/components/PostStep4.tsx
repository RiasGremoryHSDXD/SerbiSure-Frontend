import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { WORK_DAYS, WORK_SHIFTS } from '../../bookings/engagementForm';
import React from 'react';
import { Text, View, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { postingStyles as styles } from '../styles';
import type { PostFormController } from '../hooks/usePostForm';

export function PostStep4({ form }: { form: PostFormController }) {
  const { tr: uiText } = useUiLanguage();
  const {
    config,
    step,
    engagementType,
    setupPreference,
    selectedTime,
    offerAmount,
    agreedTerms,
    setAgreedTerms,
    getSelectedRoleLabel,
    buildAutoMessage,
  } = form;
  return (<>
    {/* STEP 4: EMPHASIZED MESSAGE PREVIEW & SUMMARY */}
    {step === 4 && (
      <View style={styles.step4Container}>
        {/* Emphasized Listing Preview */}
        <Text style={styles.inputGroupLabel}>{uiText(config.previewLabel)}</Text>
        <View style={styles.autoMessageCard}>
          <View style={styles.autoMessageHeader}>
            <Ionicons name="chatbox-ellipses" size={18} color="#F97316" />
            <Text style={styles.autoMessageTitle}>{uiText("Listing Preview")}</Text>
          </View>
          <Text style={styles.autoMessageQuote}>
            "{buildAutoMessage()}"
          </Text>
        </View>

        {/* Clean Summary Table */}
        <Text style={[styles.inputGroupLabel, { marginTop: 14 }]}>{uiText("SUMMARY")}</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{uiText(config.summaryRoleLabel)}</Text>
            <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>
              {getSelectedRoleLabel()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{uiText(config.summaryTypeLabel)}</Text>
            <Text style={styles.summaryValue}>
              {engagementType === 'short' ? uiText("Part-time (Short-term)") : uiText("Long-term")}
            </Text>
          </View>
          {engagementType === 'long' && <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{uiText("Setup")}</Text>
              <Text style={styles.summaryValue}>
                {setupPreference === 'stay-in' ? uiText("Stay-in") : uiText("Stay-out")}
              </Text>
            </View>
          </>}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{uiText(config.rateLabel)}</Text>
            <Text style={[styles.summaryValue, { color: '#D97706', fontWeight: '800' }]}>
              ₱{offerAmount} {engagementType === 'short' ? uiText("/ day") : uiText("/ month")}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{uiText(engagementType === 'short' ? 'Availability Date' : 'Dates')}</Text>
            <Text style={styles.summaryValue}>{form.startDate}{engagementType === 'long' ? ` – ${form.ongoing ? uiText('No end date') : form.endDate}` : ''}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{uiText("Work Hours (PH)")}</Text>
            <Text style={styles.summaryValue}>{engagementType === 'short' && selectedTime !== 'custom' ? WORK_SHIFTS.find(item => item.value === selectedTime)?.hours : form.workHours}</Text>
          </View>
          {engagementType === 'long' && <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{uiText("Working Days")}</Text>
              <Text style={styles.summaryValue}>{WORK_DAYS.filter(item => form.workDays.includes(item.value)).map(item => uiText(item.label)).join(', ')}</Text>
            </View>
          </>}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{uiText("Work Region")}</Text>
            <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>{form.selectedRegion?.displayName || form.selectedRegion?.name}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{uiText("Location")}</Text>
            <Text style={[styles.summaryValue, { textAlign: 'right', flex: 1, marginLeft: 20 }]}>
              {form.getLocationLabel()}
            </Text>
          </View>
        </View>

        <View style={styles.visibleNoticeBox}>
          <Ionicons name="shield-checkmark" size={16} color="#065F46" style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={styles.visibleNoticeText}>
            {uiText(config.notice)}
          </Text>
        </View>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setAgreedTerms(!agreedTerms)}
        >
          <View style={[styles.checkbox, agreedTerms && styles.checkboxActive]}>
            {agreedTerms && <Ionicons name="checkmark" size={16} color="#0D0D11" />}
          </View>
          <Text style={styles.checkboxText}>
            {uiText(config.termsPrefix)}<Text style={{ color: '#0D0D11', fontWeight: '700' }}>{uiText(config.termsName)}</Text>{uiText(config.termsSuffix)}
          </Text>
        </Pressable>
      </View>
    )}
  </>);
}
