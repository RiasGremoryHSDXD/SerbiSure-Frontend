import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import THEME from '../../../shared/theme/theme';

interface AboutUsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutUsModal({ visible, onClose }: AboutUsModalProps) {
  const insets = useSafeAreaInsets();
  const { tr: uiText } = useUiLanguage();
  const scrollViewRef = useRef<ScrollView>(null);

  const handleOpenEmail = () => {
    Linking.openURL('mailto:support@serbisure.ph?subject=SerbiSure Support Inquiry').catch(() => {});
  };

  const handleOpenWebsite = () => {
    Linking.openURL('https://serbisure.ph').catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.fullScreenContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <Text style={styles.agreementTag}>{uiText("RESEARCH PROJECT")}</Text>
          <Text style={styles.modalTitle}>{uiText("About SerbiSure")}</Text>

          <View style={styles.contentWrap}>
            {/* Overview */}
            <View style={styles.sectionBlock}>
              <Text style={styles.paragraph}>
                {uiText(
                  "SerbiSure is a capstone research project of the Department of Information Technology, College of Information and Computing, University of Science and Technology of Southern Philippines (USTP), Cagayan de Oro City. It responds to the informal domestic-work economy by helping Homeowners and Kasambahays connect, document engagements, and access safer, more accountable household work under Republic Act No. 10361, the Batas Kasambahay."
                )}
              </Text>
            </View>

            {/* Mission */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{uiText("1. Our Mission")}</Text>
              <Text style={styles.paragraph}>
                {uiText(
                  "To provide a safer, fairer, and transparent domestic work platform that safeguards the welfare of household workers while ensuring reliable and accountable home care services for homeowners."
                )}
              </Text>
            </View>

            {/* Research Pillars */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{uiText("2. Research Pillars")}</Text>

              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Batas Kasambahay Compliance:")}</Text>{" "}
                  {uiText(
                    "The platform is designed around Republic Act No. 10361 and supports clearer engagements, documented work arrangements, and labor-protection safeguards for domestic workers."
                  )}
                </Text>
              </View>

              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Dual-Tier Engagement Protection:")}</Text>{" "}
                  {uiText(
                    "Long-term contracts and short-term household tasks are supported with a three-booking monthly cap and a regional wage-floor safeguard to discourage misclassification."
                  )}
                </Text>
              </View>

              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Barangay LGU Workforce Analytics:")}</Text>{" "}
                  {uiText(
                    "Authorized Barangay officials and System Administrators can use aggregated, anonymized workforce metrics while worker identities remain protected from public exposure."
                  )}
                </Text>
              </View>

              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Multilingual Local NLP:")}</Text>{" "}
                  {uiText(
                    "Feedback can be written in English, Filipino, Bisaya or Taglish and evaluated for transparent sentiment labels using a model suited to the local context."
                  )}
                </Text>
              </View>
            </View>

            {/* Contact & Support */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{uiText("3. Contact and Support")}</Text>
              <Text style={styles.paragraph}>
                {uiText("Have questions, feedback, or need assistance? Reach out to us through the following channels:")}
              </Text>

              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Email:")}</Text> support@serbisure.ph
                </Text>
              </View>
              <Pressable style={styles.emailPill} onPress={handleOpenEmail}>
                <Text style={styles.emailPillText}>support@serbisure.ph</Text>
              </Pressable>

              <View style={[styles.bulletItem, { marginTop: 10 }]}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Website:")}</Text> https://serbisure.ph
                </Text>
              </View>
              <Pressable style={styles.emailPill} onPress={handleOpenWebsite}>
                <Text style={styles.emailPillText}>https://serbisure.ph</Text>
              </Pressable>

              <View style={[styles.bulletItem, { marginTop: 10 }]}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Headquarters:")}</Text> Cagayan de Oro, Misamis Oriental, PH
                </Text>
              </View>
            </View>

            {/* Project Background */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{uiText("4. Project Background")}</Text>
              <Text style={styles.paragraph}>
                {uiText(
                  "A capstone research project by the Department of Information Technology, College of Information and Computing, University of Science and Technology of Southern Philippines (USTP), Cagayan de Oro City."
                )}
              </Text>
            </View>

            <View style={{ height: 24 }} />
          </View>
        </ScrollView>

        {/* Bottom Actions: Back & Understood */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            style={({ pressed }) => [styles.declineBtn, pressed && styles.btnPressed]}
            onPress={onClose}
          >
            <Text style={styles.declineBtnText}>{uiText("Back")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.acceptBtn, pressed && styles.btnPressed]}
            onPress={onClose}
          >
            <Text style={styles.acceptBtnText}>{uiText("Understood")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  agreementTag: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.mainBold,
    letterSpacing: 1.5,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 26,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#FFB380',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  contentWrap: {
    marginTop: 4,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#111827',
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13.5,
    fontFamily: THEME.typography.fontFamily.body,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3,
    paddingLeft: 6,
  },
  bulletDot: {
    fontSize: 14,
    color: '#FFB380',
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: THEME.typography.fontFamily.body,
    color: '#4B5563',
    lineHeight: 20,
  },
  boldText: {
    fontFamily: THEME.typography.fontFamily.bodyBold,
    color: '#1F2937',
  },
  emailPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4ED',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  emailPillText: {
    fontSize: 13.5,
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#FFB380',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  declineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#111827',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#111827',
  },
  acceptBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFB380',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#111827',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
