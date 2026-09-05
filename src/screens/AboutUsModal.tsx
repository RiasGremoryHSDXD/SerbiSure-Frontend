import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const logoSource = require('../../assets/serbisure-logo.png');

interface AboutUsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutUsModal({ visible, onClose }: AboutUsModalProps) {
  const handleOpenEmail = () => {
    Linking.openURL('mailto:support@serbisure.ph?subject=Serbisure Support Inquiry').catch(() => {});
  };

  const handleOpenWebsite = () => {
    Linking.openURL('https://serbisure.ph').catch(() => {});
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
                <Text style={styles.modalTitle}>About Us</Text>
                <Text style={styles.modalSubtitle}>Learn more about Serbisure</Text>
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
                Connecting Trusted Kasambahay & Filipino Homes
              </Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>Version 1.0.0 (Beta)</Text>
              </View>
            </View>

            {/* Mission Statement */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="heart-outline" size={18} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Our Mission</Text>
              </View>
              <Text style={styles.sectionParagraph}>
                Serbisure was created to bridge the gap between hardworking Filipino domestic workers
                and households seeking reliable, honest care. We empower Kasambahays through fair representation
                and provide Homeowners with the peace of mind they deserve through verified identification.
              </Text>
            </View>

            {/* Core Pillars */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="sparkles-outline" size={18} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Why Choose Serbisure?</Text>
              </View>

              <View style={styles.pillarItem}>
                <View style={styles.pillarIconBox}>
                  <Ionicons name="shield-checkmark" size={18} color="#27AE60" />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>Verified Credentials</Text>
                  <Text style={styles.pillarDesc}>
                    National ID screening, NBI & Police Clearances reviewed with state-of-the-art OCR & official verification.
                  </Text>
                </View>
              </View>

              <View style={styles.pillarItem}>
                <View style={styles.pillarIconBox}>
                  <Ionicons name="star" size={18} color="#F39C12" />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>Transparent Feedback</Text>
                  <Text style={styles.pillarDesc}>
                    AI sentiment-analyzed ratings and reviews ensure honest community insights for every booking.
                  </Text>
                </View>
              </View>

              <View style={styles.pillarItem}>
                <View style={styles.pillarIconBox}>
                  <Ionicons name="people" size={18} color="#8E44AD" />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>Community Centered</Text>
                  <Text style={styles.pillarDesc}>
                    Built with local Philippine communities in mind, starting right here in Cagayan de Oro City.
                  </Text>
                </View>
              </View>
            </View>

            {/* Contact & Support */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Get in Touch</Text>
              </View>

              <Pressable style={styles.contactRow} onPress={handleOpenEmail}>
                <View style={styles.contactIconCircle}>
                  <Ionicons name="mail-outline" size={18} color="#FFB43B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.contactLabel}>Email Support</Text>
                  <Text style={styles.contactValue}>support@serbisure.ph</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
              </Pressable>

              <Pressable style={styles.contactRow} onPress={handleOpenWebsite}>
                <View style={styles.contactIconCircle}>
                  <Ionicons name="globe-outline" size={18} color="#FFB43B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.contactLabel}>Official Website</Text>
                  <Text style={styles.contactValue}>https://serbisure.ph</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#BDBDBD" />
              </Pressable>

              <View style={[styles.contactRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.contactIconCircle}>
                  <Ionicons name="location-outline" size={18} color="#FFB43B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.contactLabel}>Headquarters</Text>
                  <Text style={styles.contactValue}>Cagayan de Oro, Misamis Oriental, PH</Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                © {new Date().getFullYear()} SerbiSure Technologies Inc. All rights reserved.
              </Text>
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
