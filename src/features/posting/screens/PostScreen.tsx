import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Text, View, Image, Pressable, Modal, KeyboardAvoidingView, Platform, Animated, StatusBar, ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { VerificationRequiredModal } from '../../verification/components/VerificationRequiredModal';

const logoSource = require('../../../../assets/serbisure-logo.png');

import type { PostScreenProps } from '../types';

import { usePostForm } from '../hooks/usePostForm';
import { postingStyles as styles } from '../styles';
import { PostStep1 } from '../components/PostStep1';
import { PostStep2 } from '../components/PostStep2';
import { PostStep3 } from '../components/PostStep3';
import { PostStep4 } from '../components/PostStep4';

export function PostScreen(props: PostScreenProps) {
  const { tr: uiText } = useUiLanguage();
  const form = usePostForm(props);
  const {
    visible,
    onClose,
    onOpenVerification,
    config,
    insets,
    step,
    postedSuccess,
    isPosting,
    showVerificationRequired,
    setShowVerificationRequired,
    verificationStatus,
    scaleAnim,
    spin,
    handleClose,
    handleNext,
    handleBack,
  } = form;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.innerContainer,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* Header Row */}
          <View style={styles.header}>
            <Pressable style={styles.backCircleButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color="#0D0D11" />
            </Pressable>
            <Text style={styles.headerTitle}>{uiText(config.title)}</Text>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Step Pill Counter */}
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>{uiText('Step {step} of {total}', { step, total: 4 })}</Text>
          </View>

          {/* Step Main Title */}
          <View style={styles.titleBlock}>
            {step === 1 && (
              <Text style={styles.mainTitle}>
                {uiText("What")}{' '}<Text style={styles.titleHighlight}>{uiText(config.roleWord)}</Text>{' '}{uiText(config.questionSuffix)}
              </Text>
            )}
            {step === 2 && (
              <Text style={styles.mainTitle}>
                {uiText("Job type &")}{' '}<Text style={styles.titleHighlight}>{uiText("setup")}</Text>
              </Text>
            )}
            {step === 3 && (
              <Text style={styles.mainTitle}>
                {uiText("Location &")}{' '}<Text style={styles.titleHighlight}>{uiText(config.rateHeading)}</Text>
              </Text>
            )}
            {step === 4 && (
              <Text style={styles.mainTitle}>
                {uiText("Review your")}{' '}<Text style={styles.titleHighlight}>{uiText(config.postHeading)}</Text>
              </Text>
            )}
          </View>

          {/* Scrollable Content Area */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <PostStep1 form={form} />
            <PostStep2 form={form} />
            <PostStep3 form={form} />
            <PostStep4 form={form} />

          </ScrollView>

          {/* Unified Clean Pill Bottom Buttons - Single Row */}
          <View style={styles.bottomButtonsContainer}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.btnPressed]}
              onPress={handleBack}
              disabled={isPosting}
            >
              <Text style={styles.backButtonText}>{step === 1 ? uiText("Cancel") : uiText("Back")}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.nextButton, pressed && styles.btnPressed]}
              onPress={handleNext}
              disabled={isPosting}
            >
              <Text style={styles.nextButtonText}>
                {isPosting ? uiText("Posting...") : step === 4 ? uiText(config.submitLabel) : uiText("Next")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Job Posted Success Overlay */}
        {postedSuccess && (
          <View style={styles.successOverlay}>
            <Animated.View style={[styles.successContainer, { transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.logoRingWrapper}>
                <Animated.View style={[styles.rotatingRing, { transform: [{ rotate: spin }] }]} />
                <View style={styles.innerLogoCircle}>
                  <Image source={logoSource} style={styles.successLogoImage} resizeMode="contain" />
                </View>
              </View>
              <Text style={styles.successTitleText}>{uiText(config.successTitle)}</Text>
            </Animated.View>
          </View>
        )}

        {/* Verification Required Modal */}
        <VerificationRequiredModal
          visible={showVerificationRequired}
          onClose={() => setShowVerificationRequired(false)}
          onVerify={() => {
            setShowVerificationRequired(false);
            if (onOpenVerification) {
              onOpenVerification();
            } else {
              onClose();
            }
          }}
          role={config.role}
          verificationStatus={verificationStatus}
        />

      </KeyboardAvoidingView>
    </Modal>
  );
}

