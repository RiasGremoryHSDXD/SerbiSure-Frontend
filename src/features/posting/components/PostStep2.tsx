import React from 'react';
import { Text, View, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { postingStyles as styles } from '../styles';
import type { PostFormController } from '../hooks/usePostForm';

export function PostStep2({ form }: { form: PostFormController }) {
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
        <Text style={styles.sectionLabel}>ENGAGEMENT TYPE</Text>
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
            <Text style={styles.typeTitle}>Short-term</Text>
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
            <Text style={styles.typeTitle}>Long-term</Text>
          </Pressable>
        </View>

        {/* 2. Setup Preference: Stay-in vs Stay-out */}
        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>WORK SETUP PREFERENCE</Text>
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
            <Text style={styles.typeTitle}>Stay-out</Text>
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
            <Text style={styles.typeTitle}>Stay-in</Text>
          </Pressable>
        </View>

        {/* 3. Preferred Time (ONLY for Short-term) */}
        {engagementType === 'short' ? (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.sectionLabel}>WHAT TIME WORKS BEST?</Text>
            <View style={styles.timeSlotRow}>
              <Pressable
                style={[styles.timeSlotCard, selectedTime === 'morning' && styles.timeSlotActive]}
                onPress={() => setSelectedTime('morning')}
              >
                <Ionicons name="sunny" size={20} color={selectedTime === 'morning' ? '#0D0D11' : '#FFB380'} />
                <Text style={styles.timeSlotTitle}>Morning</Text>
                <Text style={styles.timeSlotSub}>8 AM - 12 PM</Text>
              </Pressable>

              <Pressable
                style={[styles.timeSlotCard, selectedTime === 'afternoon' && styles.timeSlotActive]}
                onPress={() => setSelectedTime('afternoon')}
              >
                <Ionicons name="partly-sunny" size={20} color={selectedTime === 'afternoon' ? '#0D0D11' : '#FFB380'} />
                <Text style={styles.timeSlotTitle}>Afternoon</Text>
                <Text style={styles.timeSlotSub}>12 PM - 5 PM</Text>
              </Pressable>

              <Pressable
                style={[styles.timeSlotCard, selectedTime === 'night' && styles.timeSlotActive]}
                onPress={() => setSelectedTime('night')}
              >
                <Ionicons name="moon" size={20} color={selectedTime === 'night' ? '#0D0D11' : '#FFB380'} />
                <Text style={styles.timeSlotTitle}>Night</Text>
                <Text style={styles.timeSlotSub}>5 PM - 9 PM</Text>
              </Pressable>
            </View>
          </View>
        ) : engagementType === 'long' ? (
          <View style={styles.longTermScheduleCard}>
            <Ionicons name="time-outline" size={20} color="#0D0D11" style={{ marginRight: 10, marginTop: 1 }} />
            <Text style={styles.longTermScheduleText}>
              Long-term employment follows a standard domestic schedule (approx. 8 hours/day with 1 rest day per week).
            </Text>
          </View>
        ) : null}
      </View>
    )}
  </>);
}
