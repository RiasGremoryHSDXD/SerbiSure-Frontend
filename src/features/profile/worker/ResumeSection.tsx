import React from 'react';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';

export function ResumeSection({ profile }: { profile: ProfileController }) {
  const {
    resumeUrl,
    resumeUploadedAt,
    isLoadingResume,
    isUploadingResume,
    handlePickAndUploadResume,
    handleViewResume,
    bio,
  } = profile;
  return (<>
    {/* Resume / CV Section (Second) */}
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <View>
          <Text style={styles.sectionCardTitle}>Resume / CV (PDF)</Text>
          <Text style={styles.sectionCardSubtitle}>Official credentials for employers</Text>
        </View>
        {resumeUrl ? (
          <View style={styles.statusBadgeSuccess}>
            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            <Text style={styles.statusBadgeSuccessText}>Uploaded</Text>
          </View>
        ) : (
          <View style={styles.statusBadgeNeutral}>
            <Text style={styles.statusBadgeNeutralText}>Optional</Text>
          </View>
        )}
      </View>

      {isLoadingResume ? (
        <View style={styles.inlineLoadingTile}>
          <ActivityIndicator size="small" color="#FFB380" />
          <Text style={styles.inlineLoadingText}>Loading resume status...</Text>
        </View>
      ) : isUploadingResume ? (
        <View style={styles.inlineLoadingTile}>
          <ActivityIndicator size="small" color="#FFB380" />
          <Text style={styles.inlineLoadingText}>Uploading resume securely...</Text>
        </View>
      ) : resumeUrl ? (
        <View style={styles.resumeAttachedTile}>
          <View style={styles.resumeDocIconCircle}>
            <Ionicons name="document-text" size={22} color="#0D0D11" />
          </View>
          <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
            <Text style={styles.resumeFileName} numberOfLines={1}>
              Kasambahay_Resume.pdf
            </Text>
            <Text style={styles.resumeDateSub}>
              {resumeUploadedAt
                ? `Uploaded ${new Date(resumeUploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : 'PDF document attached'}
            </Text>
          </View>
          <View style={styles.resumeButtonsRow}>
            <Pressable style={styles.resumeSmallBtn} onPress={handleViewResume}>
              <Ionicons name="eye-outline" size={13} color="#0D0D11" />
              <Text style={styles.resumeSmallBtnText}>View</Text>
            </Pressable>
            <Pressable style={[styles.resumeSmallBtn, styles.resumeSmallBtnAccent]} onPress={handlePickAndUploadResume}>
              <Ionicons name="cloud-upload-outline" size={13} color="#0D0D11" />
              <Text style={styles.resumeSmallBtnText}>Replace</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.emptyActionTile} onPress={handlePickAndUploadResume}>
          <View style={styles.emptyActionIconCircle}>
            <Ionicons name="document-attach" size={18} color="#0D0D11" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.emptyActionTitle}>Upload your resume</Text>
            <Text style={styles.emptyActionSubtitle}>Submit your CV or bio document in PDF (max 10MB)</Text>
          </View>
          <Ionicons name="cloud-upload" size={18} color="#0D0D11" />
        </Pressable>
      )}
    </View>
  </>);
}
