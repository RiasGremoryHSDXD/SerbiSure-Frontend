import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { StyleSheet, Text, View, Modal, Pressable, ScrollView, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
  document?: 'privacy' | 'terms';
}

export function PrivacyPolicyModal({ visible, onClose, document = 'privacy' }: PrivacyPolicyModalProps) {
  const { tr: uiText } = useUiLanguage();
  const isTerms = document === 'terms';
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
                <Text style={styles.modalTitle}>{uiText(isTerms ? "Terms and Conditions" : "Privacy Policy")}</Text>
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
            {isTerms ? <TermsContent /> : <>
            {/* Introduction Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.introHeading}>{uiText("Commitment to Data Privacy")}</Text>
              <Text style={styles.paragraph}>
                {uiText("At SerbiSure, we value your trust and are dedicated to safeguarding your personal data. This Privacy Policy describes our practices regarding the collection, processing, and protection of information gathered through the SerbiSure mobile application, in compliance with Republic Act No. 10173, otherwise known as the")}{' '}<Text style={styles.boldText}>{uiText("Data Privacy Act of 2012 (DPA)")}</Text> {uiText("of the Philippines.")}</Text>
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

            {/* 4. Barangay Workforce Analytics and Clearance Confidentiality */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="stats-chart-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("4. Barangay Workforce Analytics")}</Text>
              </View>
              <Text style={styles.paragraph}>{uiText("SerbiSure may compile aggregated and anonymized demographic, employment-status, and service-category statistics to support local government monitoring and the Batas Kasambahay under RA 10361 and DILG MC 2013-61.")}</Text>
              <Text style={styles.paragraph}>{uiText("These analytics are available only to authorized Barangay officials and System Administrators. Public users and Homeowners do not receive identity-level workforce reports.")}</Text>
              <Text style={styles.paragraph}>{uiText("NBI and Police Clearances remain confidential and are visible only to the USTP Superadmin and designated Barangay Desk Officers. They are never publicly visible to Homeowners.")}</Text>
            </View>

            {/* 5. Third-Party Processors and Cloud Services */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="cloud-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("5. Third-Party Processors and Cloud Services")}</Text>
              </View>
              <Text style={styles.paragraph}>{uiText("To operate the platform, selected service providers process information on SerbiSure's behalf under access controls and security requirements:")}</Text>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}><Text style={styles.boldText}>{uiText("Cloudinary:")}</Text> {uiText("stores uploaded identity documents, clearance images, and verification media.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}><Text style={styles.boldText}>{uiText("Neon PostgreSQL:")}</Text> {uiText("stores account, profile, booking, and review records.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}><Text style={styles.boldText}>{uiText("Hugging Face XLM-RoBERTa:")}</Text> {uiText("processes written reviews to produce sentiment labels.")}</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}><Text style={styles.boldText}>{uiText("Cloud OCR service:")}</Text> {uiText("extracts text from submitted identity and clearance documents for assisted review.")}</Text>
              </View>
            </View>

            {/* 6. Biometric Data and Facial Liveness */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="scan-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("6. Biometric Data and Facial Liveness")}</Text>
              </View>
              <Text style={styles.paragraph}>{uiText("The MediaPipe liveness check uses facial landmarks to confirm physical presence during verification. A captured selfie may be cross-referenced with the submitted government ID for identity confirmation only.")}</Text>
              <Text style={styles.paragraph}>{uiText("Facial verification media is sensitive personal information. It is restricted to verification purposes, is never sold, and is not shared with third parties for advertising or unrelated profiling.")}</Text>
            </View>

            {/* 7. Retention and Disposal */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="archive-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("7. Retention and Disposal")}</Text>
              </View>
              <Text style={styles.paragraph}>{uiText("Verification documents, liveness media, and account records are retained only for as long as needed for verification, safety, legal compliance, and documented platform operations.")}</Text>
              <Text style={styles.paragraph}>{uiText("Expired or rejected clearances are marked for review and disposal according to applicable retention requirements. When an account is terminated, records are deleted or anonymized when there is no legal or safety reason to retain them.")}</Text>
            </View>

            {/* 8. Your Rights as a Data Subject */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="person-circle-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{uiText("8. Your Rights Under RA 10173")}</Text>
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
                <Text style={styles.sectionTitle}>{uiText("9. Contact Data Protection Officer")}</Text>
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
            </>}
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

function TermsContent() {
  const { tr: uiText } = useUiLanguage();

  return (
    <>
      <View style={styles.sectionCard}>
        <Text style={styles.introHeading}>{uiText("Agreement to Use SerbiSure")}</Text>
        <Text style={styles.paragraph}>
          {uiText("By creating a SerbiSure account, you agree to these Terms and Conditions and confirm that you have read the Data Privacy Policy.")}
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="person-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{uiText("1. Eligibility and Account Responsibility")}</Text>
        </View>
        <Text style={styles.paragraph}>{uiText("You must provide accurate information, keep your account credentials secure, and be at least 18 years old to use SerbiSure.")}</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="people-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{uiText("2. Using the Platform")}</Text>
        </View>
        <Text style={styles.paragraph}>{uiText("SerbiSure helps Homeowners and Kasambahays discover services, communicate, and arrange bookings. You are responsible for the information and messages you share.")}</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="shield-checkmark-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{uiText("3. Verification and Safety")}</Text>
        </View>
        <Text style={styles.paragraph}>{uiText("Verification supports trust on the platform but does not guarantee a user's identity, qualifications, conduct, or the outcome of a booking. Use your own judgment and follow applicable safety guidance.")}</Text>
        <Text style={styles.paragraph}>{uiText("Homeowners must submit a valid PhilSys National ID. Kasambahays must submit valid NBI and PNP Clearances. Counterfeit, borrowed, altered, or expired credentials may result in immediate suspension and reporting to the proper authorities.")}</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="document-text-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{uiText("4. Bookings, Payments, and Reviews")}</Text>
        </View>
        <Text style={styles.paragraph}>{uiText("Users are responsible for agreeing on service details, schedules, rates, and payment arrangements. Reviews must be honest, relevant, and based on a real interaction.")}</Text>
        <Text style={styles.paragraph}>{uiText("Short-term on-demand bookings between the same Homeowner and Kasambahay are limited to three (3) bookings per calendar month. Reaching the cap triggers a programmatic block and requires the parties to consider a formal long-term contract so recurring work is not misclassified as gig work.")}</Text>
        <Text style={styles.paragraph}>{uiText("After a completed engagement, users must submit a review. Reviews written in English, Filipino, Bisaya, or Taglish may be evaluated by an automated XLM-RoBERTa sentiment model to produce public Positive, Neutral, or Negative labels.")}</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="cash-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{uiText("5. Wage Floor and Platform Role")}</Text>
        </View>
        <Text style={styles.paragraph}>{uiText("Job offers and booking compensation must meet or exceed the applicable RTWPB-10 minimum wage floor for Northern Mindanao and Cagayan de Oro City. Offering below the applicable minimum, including through an off-platform arrangement connected to SerbiSure, violates these Terms.")}</Text>
        <Text style={styles.paragraph}>{uiText("SerbiSure is a technology facilitator and matching marketplace. It is not a Private Employment Agency, employer, or party to the employment contract between a Homeowner and Kasambahay. SerbiSure does not handle payroll, direct wage disbursement, or statutory benefit contributions.")}</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="medical-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{uiText("6. Scope and Safety Boundaries")}</Text>
        </View>
        <Text style={styles.paragraph}>{uiText("SerbiSure does not perform medical or mental-fitness evaluations, physical deployment, dispute arbitration, or legal mediation. Homeowners are responsible for requesting standard health certificates directly when required. Disputes remain subject to the appropriate Barangay Lupon or DOLE process.")}</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="document-lock-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{uiText("7. Required Credentials and Reviews")}</Text>
        </View>
        <Text style={styles.paragraph}>{uiText("Submitting a counterfeit, borrowed, altered, or expired government credential is fraudulent conduct. It may lead to immediate profile suspension and referral to local authorities. Reviews must describe a real completed engagement and must not expose another person's confidential documents or personal information.")}</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="warning-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{uiText("8. Prohibited Conduct")}</Text>
        </View>
        <Text style={styles.paragraph}>{uiText("Do not impersonate another person, submit false documents, harass other users, misuse personal data, or use SerbiSure for unlawful activity.")}</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="lock-closed-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{uiText("9. Account Changes or Suspension")}</Text>
        </View>
        <Text style={styles.paragraph}>{uiText("We may limit or suspend access when needed to protect users, investigate violations, or comply with law. You may stop using the service at any time.")}</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="mail-outline" size={17} color="#FFB43B" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{uiText("10. Contact and Acceptance")}</Text>
        </View>
        <Text style={styles.paragraph}>{uiText("If you have questions about these terms, contact SerbiSure Support. By selecting the consent checkbox, you confirm that you understand and accept these Terms and Conditions.")}</Text>
      </View>

      <View style={{ height: 16 }} />
    </>
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
