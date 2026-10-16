import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { StyleSheet, Text, View, Modal, Pressable, ScrollView, Image, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const logoSource = require('../../../../assets/serbisure-logo.png');

interface AboutUsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutUsModal({ visible, onClose }: AboutUsModalProps) {
  const { tr: uiText } = useUiLanguage();
  const handleOpenEmail = () => {
    Linking.openURL('mailto:support@serbisure.ph?subject=Serbisure Support Inquiry').catch(() => { });
  };

  const handleOpenWebsite = () => {
    Linking.openURL('https://serbisure.ph').catch(() => { });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="information-circle" size={22} color="#FFB43B" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.modalTitle}>{uiText("About Us")}</Text>
                <Text style={styles.modalSubtitle}>{uiText("USTP CDO Capstone Research Project")}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#777" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hero Brand Section */}
            <View style={styles.brandCard}>
              <Image source={logoSource} style={styles.logo} resizeMode="contain" />
              <Text style={styles.appName}>SerbiSure</Text>
              <Text style={styles.appTagline}>
                {uiText("A capstone research project for safer, fairer household work")}</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>{uiText("USTP CDO • 2026")}</Text>
              </View>
            </View>

            {/* Mission Statement */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="heart-outline" size={18} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("Our Mission")}</Text>
              </View>
              <Text style={styles.sectionParagraph}>
                {uiText("SerbiSure is a capstone research project of the Department of Information Technology, College of Information and Computing, University of Science and Technology of Southern Philippines (USTP), Cagayan de Oro City. It responds to the informal domestic-work economy by helping Homeowners and Kasambahays connect, document engagements, and access safer, more accountable household work under Republic Act No. 10361, the Batas Kasambahay.")}</Text>
            </View>

            {/* Core Pillars */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="sparkles-outline" size={18} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("Research Pillars")}</Text>
              </View>

              <View style={styles.pillarItem}>
                <View style={styles.pillarIconBox}>
                  <Ionicons name="shield-checkmark" size={18} color="#27AE60" />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>{uiText("Batas Kasambahay Compliance")}</Text>
                  <Text style={styles.pillarDesc}>
                    {uiText("The platform is designed around RA 10361 and supports clearer engagements, documented work arrangements, and labor-protection safeguards for domestic workers.")}</Text>
                </View>
              </View>

              <View style={styles.pillarItem}>
                <View style={styles.pillarIconBox}>
                  <Ionicons name="git-branch-outline" size={18} color="#F39C12" />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>{uiText("Dual-Tier Engagement Protection")}</Text>
                  <Text style={styles.pillarDesc}>
                    {uiText("Long-term contracts and short-term household tasks are supported with a three-booking monthly cap and a regional wage-floor safeguard to discourage misclassification.")}</Text>
                </View>
              </View>

              <View style={styles.pillarItem}>
                <View style={styles.pillarIconBox}>
                  <Ionicons name="people" size={18} color="#8E44AD" />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>{uiText("Barangay LGU Workforce Analytics")}</Text>
                  <Text style={styles.pillarDesc}>
                    {uiText("Authorized Barangay officials and System Administrators can use aggregated, anonymized workforce metrics while worker identities remain protected from public exposure.")}</Text>
                </View>
              </View>

              <View style={[styles.pillarItem, { marginBottom: 0 }]}>
                <View style={styles.pillarIconBox}>
                  <Ionicons name="language-outline" size={18} color="#3498DB" />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>{uiText("Multilingual Local NLP")}</Text>
                  <Text style={styles.pillarDesc}>
                    {uiText("Feedback can be written in English, Filipino, Bisaya or Taglish and evaluated for transparent sentiment labels using a model suited to the local context.")}</Text>
                </View>
              </View>
            </View>

            {/* Contact & Support */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("Get in Touch")}</Text>
              </View>

              <Pressable style={styles.contactRow} onPress={handleOpenEmail}>
                <View style={styles.contactIconCircle}>
                  <Ionicons name="mail-outline" size={18} color="#FFB43B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.contactLabel}>{uiText("Email Support")}</Text>
                  <Text style={styles.contactValue}>support@serbisure.ph</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
              </Pressable>

              <Pressable style={styles.contactRow} onPress={handleOpenWebsite}>
                <View style={styles.contactIconCircle}>
                  <Ionicons name="globe-outline" size={18} color="#FFB43B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.contactLabel}>{uiText("Official Website")}</Text>
                  <Text style={styles.contactValue}>https://serbisure.ph</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#BDBDBD" />
              </Pressable>

              <View style={[styles.contactRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.contactIconCircle}>
                  <Ionicons name="location-outline" size={18} color="#FFB43B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.contactLabel}>{uiText("Headquarters")}</Text>
                  <Text style={styles.contactValue}>Cagayan de Oro, Misamis Oriental, PH</Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {uiText("A capstone research project by USTP Cagayan de Oro City")}</Text>
              <Text style={styles.footerText}>{uiText("Developed by the Department of Information Technology, College of Information and Computing.")}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F9F8F6',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '88%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE1',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  brandCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  logo: {
    width: 68,
    height: 68,
    marginBottom: 10,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  versionBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 12,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D68910',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionParagraph: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  pillarItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  pillarIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F7F6F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  pillarTextCol: {
    flex: 1,
  },
  pillarTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 2,
  },
  pillarDesc: {
    fontSize: 12,
    color: '#777',
    lineHeight: 17,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3EF',
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontSize: 11.5,
    color: '#888',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
});
