import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { WorkScheduleFields } from '../../bookings/components/WorkScheduleFields';
import { WorkLocationFields } from '../../bookings/components/WorkLocationFields';
import React from 'react';
import { Text, View, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { postingStyles as styles } from '../styles';
import type { PostFormController } from '../hooks/usePostForm';

export function PostStep2({ form }: { form: PostFormController }) {
  const { tr: uiText } = useUiLanguage();
  const {
    step,
    engagementType,
    setupPreference,
    setSetupPreference,
    selectedTime,
    setSelectedTime,
    handleEngagementChange,
  } = form;
  return (<>
    {/* STEP 2: ARRANGEMENT & SETUP */}
    {step === 2 && (
      <View style={styles.step2Container}>
        {/* 1. Engagement Type: Short-term vs Long-term */}
        <Text style={styles.sectionLabel}>{uiText("ENGAGEMENT TYPE")}</Text>
        <View style={styles.typeToggleRow}>
          <Pressable
            style={[styles.typeCard, engagementType === 'short' && styles.typeCardActive]}
            onPress={() => handleEngagementChange('short')}
          >
            <Ionicons
              name="time"
              size={24}
              color={engagementType === 'short' ? '#0D0D11' : '#FFB380'}
              style={styles.typeIcon}
            />
            <Text style={styles.typeTitle}>{uiText("Short-term")}</Text>
          </Pressable>

          <Pressable
            style={[styles.typeCard, engagementType === 'long' && styles.typeCardActive]}
            onPress={() => handleEngagementChange('long')}
          >
            <Ionicons
              name="calendar"
              size={24}
              color={engagementType === 'long' ? '#0D0D11' : '#FFB380'}
              style={styles.typeIcon}
            />
            <Text style={styles.typeTitle}>{uiText("Long-term")}</Text>
          </Pressable>
        </View>

        {/* 2. Setup Preference: Stay-in vs Stay-out */}
        {engagementType === 'long' && <>
        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>{uiText("WORK SETUP PREFERENCE")}</Text>
        <View style={styles.typeToggleRow}>
          <Pressable
            style={[styles.typeCard, setupPreference === 'stay-out' && styles.typeCardActive]}
            onPress={() => setSetupPreference('stay-out')}
          >
            <Ionicons
              name="walk"
              size={24}
              color={setupPreference === 'stay-out' ? '#0D0D11' : '#FFB380'}
              style={styles.typeIcon}
            />
            <Text style={styles.typeTitle}>{uiText("Stay-out")}</Text>
          </Pressable>

          <Pressable
            style={[styles.typeCard, setupPreference === 'stay-in' && styles.typeCardActive]}
            onPress={() => setSetupPreference('stay-in')}
          >
            <Ionicons
              name="home"
              size={24}
              color={setupPreference === 'stay-in' ? '#0D0D11' : '#FFB380'}
              style={styles.typeIcon}
            />
            <Text style={styles.typeTitle}>{uiText("Stay-in")}</Text>
          </Pressable>
        </View>
        </>}

        {engagementType && <WorkScheduleFields
          bookingType={engagementType === 'long' ? 'long_term' : 'short_term'}
          startDate={form.startDate} endDate={form.endDate} workHours={form.workHours} days={form.workDays} shift={selectedTime}
          onStartDate={form.setStartDate} onEndDate={form.setEndDate} onWorkHours={form.setWorkHours}
          onDays={form.setWorkDays} onShift={setSelectedTime}
          ongoing={form.ongoing} onOngoing={form.setOngoing}
          disabled={!form.visible || form.isPosting}
        />}
        {engagementType === 'long' && <View style={{ marginTop: 14 }}>
          <Text style={styles.sectionLabel}>{uiText("WORK REGION")}</Text>
          <WorkLocationFields form={form} regionOnly disabled={!form.visible || form.isPosting} />
          <Text style={styles.longTermScheduleText}>{uiText("Complete the Province, City / Municipality, Barangay and street address in Step 3.")}</Text>
        </View>}

      </View>
    )}
  </>);
}
