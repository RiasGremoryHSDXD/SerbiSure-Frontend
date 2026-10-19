import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../../shared/localization/LanguageContext';
import THEME from '../../../shared/theme/theme';

export function BookingRestrictionModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { tr } = useLanguage();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView style={styles.card} contentContainerStyle={styles.content} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.title}>{tr('Booking & Posting Restricted')}</Text>
          <Text style={styles.message}>
            {tr('You have accumulated 3/3 penalty points this month. Your posting and booking privileges are paused until the 1st of next month.')}
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>{tr('Understood')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(13,13,17,0.5)' },
  card: { width: '100%', maxWidth: 390, maxHeight: '90%', flexGrow: 0, alignSelf: 'center', borderRadius: 24, backgroundColor: THEME.colors.white },
  content: { padding: 24 },
  title: { fontFamily: THEME.typography.fontFamily.mainBold, fontSize: 21, lineHeight: 28, color: THEME.colors.textPrimary },
  message: { marginTop: 12, fontFamily: THEME.typography.fontFamily.body, fontSize: 14, lineHeight: 21, color: THEME.colors.textSecondary },
  button: { marginTop: 24, paddingVertical: 14, borderRadius: 24, alignItems: 'center', backgroundColor: THEME.colors.ink },
  buttonText: { fontFamily: THEME.typography.fontFamily.mainBold, fontSize: 15, color: THEME.colors.white },
});
