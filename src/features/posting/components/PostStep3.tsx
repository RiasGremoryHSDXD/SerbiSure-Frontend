import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { WorkLocationFields } from '../../bookings/components/WorkLocationFields';
import React from 'react';
import { Text, View, Pressable, TextInput } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import THEME from '../../../shared/theme/theme';

import { postingStyles as styles } from '../styles';
import type { PostFormController } from '../hooks/usePostForm';

export function PostStep3({ form }: { form: PostFormController }) {
  const { tr: uiText } = useUiLanguage();
  const {
    config,
    user,
    step,
    engagementType,
    instructions,
    setInstructions,
    wagePolicy,
    offerAmount,
    setOfferAmount,
    applyUserProfileAddress,
    getSelectedRoleLabel,
  } = form;
  return (<>
    {/* STEP 3: DETAILS, INSTRUCTIONS & RATE */}
    {step === 3 && (
      <View style={styles.step3Container}>
        {/* Location Header & Profile Address Quick Use */}
        <View style={styles.locationHeaderRow}>
          <Text style={styles.inputGroupLabel}>{uiText(config.addressLabel)}</Text>
          {user && (user.barangay || user.city) ? (
            <Pressable style={styles.useProfileAddressBtn} onPress={applyUserProfileAddress}>
              <Ionicons name="location" size={13} color="#EA580C" />
              <Text style={styles.useProfileAddressText}>{uiText("Use Profile Address")}</Text>
            </Pressable>
          ) : null}
        </View>

        <WorkLocationFields form={form} disabled={form.isPosting} />

        <Text style={styles.inputGroupLabel}>{uiText(config.instructionsLabel)}</Text>
        <TextInput
          style={styles.multilineInput}
          multiline
          numberOfLines={4}
          placeholder={uiText(config.instructionsPlaceholder)}
          placeholderTextColor="#9CA3AF"
          value={instructions}
          onChangeText={setInstructions}
        />

        <Text style={styles.inputGroupLabel}>
          {engagementType === 'short' ? 'OFFER AMOUNT (PER DAY)' : 'MONTHLY SALARY OFFER'}
        </Text>
        {(() => {
          const num = Number(offerAmount.replace(/[^0-9.]/g, ''));
          const isBelowMin = offerAmount.trim().length > 0 && (wagePolicy ? num < Number(wagePolicy.minimum_rate) : false);
          return (
            <>
              <View style={[styles.offerInputWrapper, isBelowMin && styles.offerInputWrapperInvalid]}>
                <Text style={[styles.currencyPrefix, isBelowMin && { color: '#DC2626' }]}>₱</Text>
                <TextInput
                  style={[styles.offerInput, isBelowMin && { color: '#DC2626' }]}
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                  keyboardType="numeric"
                  placeholder={wagePolicy?.minimum_rate || 'Enter amount'}
                  placeholderTextColor={isBelowMin ? '#FCA5A5' : '#9CA3AF'}
                />
                <Text style={[styles.rateUnitSuffix, isBelowMin && { color: '#DC2626' }]}>
                  {engagementType === 'short' ? '/day' : '/month'}
                </Text>
              </View>
              {isBelowMin ? (
                <Text style={styles.invalidRateHint}>
                  {engagementType === 'short'
                    ? (wagePolicy?.description || 'Select the work region to load the daily policy.')
                    : (wagePolicy?.description || 'Select your work region to load the monthly wage policy.')}
                </Text>
              ) : null}
            </>
          );
        })()}

        <View style={styles.recommendBox}>
          <Text style={styles.recommendTitle}>
            {engagementType === 'short'
              ? `Suggested rate for ${getSelectedRoleLabel()}: `
              : `Standard monthly rate for ${getSelectedRoleLabel()}: `}
            <Text style={{ fontFamily: THEME.typography.fontFamily.mainExtraBold, fontWeight: '800', color: '#0D0D11' }}>
              {wagePolicy ? 'Minimum: PHP ' + Number(wagePolicy.minimum_rate).toLocaleString() + '/' + wagePolicy.rate_period : 'Loading applicable minimum...'}
            </Text>
          </Text>
          <Text style={styles.recommendSub}>
            {engagementType === 'short'
              ? (wagePolicy?.description || 'The server checks the current platform daily minimum.')
              : (wagePolicy?.description || 'The server checks the regional monthly minimum.')}
          </Text>
        </View>
      </View>
    )}
  </>);
}
