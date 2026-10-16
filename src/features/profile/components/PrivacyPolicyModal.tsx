import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { StyleSheet, Text, View, Modal, Pressable, ScrollView, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ visible, onClose }: PrivacyPolicyModalProps) {
  const { tr: uiText } = useUiLanguage();
  const handleOpenEmail = () => {
    Linking.openURL('mailto:privacy@serbisure.ph?subject=Privacy Inquiry').catch(() => { });
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
                <Ionicons name="shield-checkmark" size={20} color="#FFB43B" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.modalTitle}>{uiText("Privacy Policy")}</Text>
                <Text style={styles.modalSubtitle}>{uiText("Effective: September 2026")}</Text>
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
            {/* Introduction Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.introHeading}>{uiText("Commitment to Data Privacy")}</Text>
              <Text style={styles.paragraph}>
                {uiText("At SerbiSure, we value your trust and are dedicated to safeguarding your personal data. This Privacy Policy describes our practices regarding the collection, processing, and protection of information gathered through the SerbiSure mobile application, in compliance with Republic Act No. 10173, otherwise known as the")}<Text style={styles.boldText}>{uiText("Data Privacy Act of 2012 (DPA)")}</Text> {uiText("of the Philippines.")}</Text>
            </View>

            {/* 1. Information We Collect */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="documents-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("1. Information We Collect")}</Text>
              </View>
              <Text style={styles.paragraph}>
                {uiText("We collect personal information necessary to deliver trusted matching services between Homeowners and Kasambahays:")}</Text>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Account Credentials:")}</Text> {uiText("Full name, mobile phone number, email address, password hash, and account type.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Identity Documents:")}</Text> {uiText("National ID (PhilSys), NBI Clearances, Police Clearances, and facial liveness verification photos.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Service Data:")}</Text> {uiText("Job posts, service requests, booking histories, location (city/province), and ratings/reviews.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Resumes & Credentials:")}</Text> {uiText("CVs are generated from saved profile details. Experience and training are self-reported. Workers choose whether phone numbers and family details appear on shared CVs.")}</Text>
              </View>
            </View>

            {/* 2. How We Use Your Information */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="cog-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("2. How We Use Information")}</Text>
              </View>
              <Text style={styles.paragraph}>
                {uiText("Your data is collected strictly for legitimate platform purposes:")}</Text>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Verification Screening:")}</Text> {uiText("Validating government-issued IDs with OCR and administrative review to safeguard community safety.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Matching & Connection:")}</Text> {uiText("Displaying verified profiles, service categories, and contact availability.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>{uiText("Trust & Quality Assurance:")}</Text> {uiText("Aggregating feedback and computing transparent sentiment ratings to prevent abuse.")}</Text>
              </View>
            </View>

            {/* 3. Data Protection & Security */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="lock-closed-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("3. Security & Storage")}</Text>
              </View>
              <Text style={styles.paragraph}>
                {uiText("We implement robust technical and organizational measures:")}</Text>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  {uiText("All communications between your mobile device and our backend servers are encrypted using modern Transport Layer Security (TLS/HTTPS).")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  {uiText("Clearance documents and verification media are stored on secure, authenticated object storage with restricted administrative access.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  {uiText("Account passwords are salted and hashed using industry-standard cryptography; passwords are never stored in plain text.")}</Text>
              </View>
            </View>

            {/* 4. Your Rights as a Data Subject */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="person-circle-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("4. Your Rights Under RA 10173")}</Text>
              </View>
              <Text style={styles.paragraph}>
                {uiText("As a registered user, you retain the following statutory rights:")}</Text>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}><Text style={styles.boldText}>{uiText("Right to be Informed:")}</Text> {uiText("Knowing how your personal data is collected and processed.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}><Text style={styles.boldText}>{uiText("Right to Access:")}</Text> {uiText("Requesting a copy of your personal data held by SerbiSure.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}><Text style={styles.boldText}>{uiText("Right to Rectification:")}</Text> {uiText("Correcting outdated, inaccurate, or incomplete information.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}><Text style={styles.boldText}>{uiText("Right to Erasure:")}</Text> {uiText("Requesting the deletion of your account and related records.")}</Text>
              </View>
            </View>

            {/* 5. Contact Data Protection Officer */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="mail-unread-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("5. Contact Data Protection Officer")}</Text>
              </View>
              <Text style={styles.paragraph}>
                {uiText("For inquiries, data access requests, or privacy concerns, please contact our Data Protection Officer:")}</Text>
              <Pressable style={styles.emailPill} onPress={handleOpenEmail}>
                <Ionicons name="mail" size={16} color="#FFB43B" />
                <Text style={styles.emailPillText}>privacy@serbisure.ph</Text>
              </Pressable>
            </View>

            {/* Bottom spacer */}
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Bottom Action Button */}
          <View style={styles.bottomBar}>
            <Pressable style={styles.dismissBtn} onPress={onClose}>
              <Text style={styles.dismissBtnText}>{uiText("I Understand")}</Text>
            </Pressable>
          </View>
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
    height: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
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
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  introHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  paragraph: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
    marginBottom: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 14,
    color: '#FFB43B',
    marginRight: 8,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: 12.5,
    color: '#555',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: '#2A2A2A',
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#FDEBD0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  emailPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EAE1',
  },
  dismissBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFB43B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB43B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
