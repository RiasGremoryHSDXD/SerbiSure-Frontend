import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import THEME from '../../../shared/theme/theme';

interface Props {
  message?: string;
  onReturnToSignIn: () => void;
}

export function SuspendedAccountScreen({ message, onReturnToSignIn }: Readonly<Props>) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, {
          paddingTop: Math.max(insets.top + 36, 64),
          paddingBottom: Math.max(insets.bottom + 28, 44),
        }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconCircle} accessibilityLabel="Account suspended">
          <Ionicons name="lock-closed-outline" size={30} color={THEME.colors.error} />
        </View>
        <Text style={styles.eyebrow}>SerbiSure account</Text>
        <Text style={styles.title}>Account suspended</Text>
        <Text style={styles.message} accessibilityRole="text">
          {message || 'Your account access has been suspended. You cannot use SerbiSure until an official restores your account.'}
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens now?</Text>
          <Text style={styles.infoText}>Sign-in and app features are temporarily unavailable.</Text>
          <Text style={styles.infoText}>If you believe this is a mistake, contact SerbiSure Support through the official support channel.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to sign in"
          onPress={onReturnToSignIn}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Return to sign in</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.errorLight,
    marginBottom: 24,
  },
  eyebrow: {
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.secondarySemiBold,
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  title: {
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamily.display,
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 14,
  },
  message: {
    maxWidth: 360,
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.body,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  infoCard: {
    width: '100%',
    maxWidth: 380,
    marginTop: 28,
    padding: 20,
    borderRadius: THEME.roundness.card,
    backgroundColor: THEME.colors.white,
  },
  infoTitle: {
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 16,
    marginBottom: 10,
  },
  infoText: {
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  button: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: THEME.roundness.pill,
    backgroundColor: THEME.colors.ink,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    color: THEME.colors.white,
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 15,
  },
});
