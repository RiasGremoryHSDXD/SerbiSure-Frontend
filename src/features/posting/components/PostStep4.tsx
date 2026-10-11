import React from 'react';
import { Text, View, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { postingStyles as styles } from '../styles';
import type { PostFormController } from '../hooks/usePostForm';

export function PostStep4({ form }: { form: PostFormController }) {
  const {
    config,
    step,
    engagementType,
    setupPreference,
    selectedTime,
    selectedCity,
    selectedBarangay,
    streetAddress,
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
        <Text style={styles.inputGroupLabel}>{config.previewLabel}</Text>
        <View style={styles.autoMessageCard}>
          <View style={styles.autoMessageHeader}>
            <Ionicons name="chatbox-ellipses" size={18} color="#F97316" />
            <Text style={styles.autoMessageTitle}>Listing Preview</Text>
          </View>
          <Text style={styles.autoMessageQuote}>
            "{buildAutoMessage()}"
          </Text>
        </View>

        {/* Clean Summary Table */}
        <Text style={[styles.inputGroupLabel, { marginTop: 14 }]}>SUMMARY</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{config.summaryRoleLabel}</Text>
            <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>
              {getSelectedRoleLabel()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{config.summaryTypeLabel}</Text>
            <Text style={styles.summaryValue}>
              {engagementType === 'short' ? 'Part-time (Short-term)' : 'Long-term'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Setup</Text>
            <Text style={styles.summaryValue}>
              {setupPreference === 'stay-in' ? 'Stay-in' : 'Stay-out'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{config.rateLabel}</Text>
            <Text style={[styles.summaryValue, { color: '#D97706', fontWeight: '800' }]}>
              ₱{offerAmount} {engagementType === 'short' ? '/ day' : '/ month'}
            </Text>
          </View>
          {engagementType === 'short' && (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{config.timeLabel}</Text>
                <Text style={styles.summaryValue}>
                  {selectedTime === 'morning'
                    ? 'Morning (8 AM - 12 PM)'
                    : selectedTime === 'afternoon'
                      ? 'Afternoon (12 PM - 5 PM)'
                      : 'Night (5 PM - 9 PM)'}
                </Text>
              </View>
            </>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>
            <Text style={[styles.summaryValue, { textAlign: 'right', flex: 1, marginLeft: 20 }]} numberOfLines={2}>
              {selectedBarangay?.name
                ? `${selectedBarangay.name}, ${selectedCity?.name || ''}`
                : streetAddress || 'Cagayan de Oro'}
            </Text>
          </View>
        </View>

        <View style={styles.visibleNoticeBox}>
          <Ionicons name="shield-checkmark" size={16} color="#065F46" style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={styles.visibleNoticeText}>
            {config.notice}
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
            {config.termsPrefix}<Text style={{ color: '#0D0D11', fontWeight: '700' }}>{config.termsName}</Text>{config.termsSuffix}
          </Text>
        </Pressable>
      </View>
    )}
  </>);
}
