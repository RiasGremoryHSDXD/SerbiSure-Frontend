import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, Pressable, Switch, Alert, Modal, TextInput, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { fetchReceivedReviews, fetchReviewSummary, ReviewItem, ReviewSummaryData } from '../../api/reviewApi';
import { fetchUserAbout, updateUserAbout, fetchKasambahayResume, uploadKasambahayResume } from '../../api/accountApi';
import { fetchVerificationStatus, type VerificationStatusResponse } from '../../api/verificationApi';
import { VerificationStatusModal } from '../VerificationStatusModal';
import { PasswordSecurityModal } from '../PasswordSecurityModal';
import { NotificationsModal } from '../NotificationsModal';
import { AboutUsModal } from '../AboutUsModal';
import { PrivacyPolicyModal } from '../PrivacyPolicyModal';

// Safely require expo-document-picker to avoid crashing if native module is not yet compiled in APK
let DocumentPicker: typeof import('expo-document-picker') | null = null;
try {
  DocumentPicker = require('expo-document-picker');
} catch {
  DocumentPicker = null;
}

const logoSource = require('../../../assets/serbisure-logo.png');

export function ProfileScreen({
  avatarUri,
  initialView = 'main',
  onUpdateAvatar,
  onBack,
  onLogout,
}: {
  avatarUri?: string | null;
  initialView?: 'main' | 'personal_info';
  onUpdateAvatar?: (uri: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
  const { getFullName, getFirstNameOnly, user, updateUser } = useUser();
  const [currentView, setCurrentView] = useState<'main' | 'personal_info'>(initialView);
  const [isOnJob, setIsOnJob] = useState(false);
  const [isLanguageExpanded, setIsLanguageExpanded] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(avatarUri || null);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<ReviewSummaryData | null>(null);

  const [bio, setBio] = useState<string>(user.userAbout || '');
  const [isLoadingBio, setIsLoadingBio] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBioText, setEditBioText] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);

  const [resumeUrl, setResumeUrl] = useState<string | null>(user.resumeUrl || null);
  const [resumeUploadedAt, setResumeUploadedAt] = useState<string | null>(user.resumeUploadedAt || null);
  const [isLoadingResume, setIsLoadingResume] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isNotificationsModalVisible, setIsNotificationsModalVisible] = useState(false);
  const [isAboutUsModalVisible, setIsAboutUsModalVisible] = useState(false);
  const [isPrivacyPolicyModalVisible, setIsPrivacyPolicyModalVisible] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationStatusResponse | null>(null);
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);

  const loadVerificationStatus = () => {
    if (user.token) {
      setIsLoadingVerification(true);
      fetchVerificationStatus(user.token)
        .then((data) => {
          setVerificationData(data);
          if (data) {
            let derivedStatus = data.overall_status;
            if (data.documents && data.documents.length > 0) {
              const verifiedTypes = new Set(
                data.documents.filter((d) => d.verification_status === 'Verified').map((d) => d.document_type)
              );
              if (verifiedTypes.has('nbi_clearance') && verifiedTypes.has('police_clearance')) {
                derivedStatus = 'Verified';
              }
            }
            if (derivedStatus) {
              updateUser({ verificationStatus: derivedStatus });
            }
          }
        })
        .catch((err) => console.warn('[KasambahayProfile] verification status error:', err))
        .finally(() => setIsLoadingVerification(false));
    }
  };

  const effectiveVerificationStatus = React.useMemo(() => {
    if (verificationData?.documents && verificationData.documents.length > 0) {
      const verifiedTypes = new Set(
        verificationData.documents
          .filter((d) => d.verification_status === 'Verified')
          .map((d) => d.document_type)
      );
      if (verifiedTypes.has('nbi_clearance') && verifiedTypes.has('police_clearance')) {
        return 'Verified';
      }
      const docStatuses = new Set(verificationData.documents.map((d) => d.verification_status));
      if (docStatuses.has('Rejected')) return 'Rejected';
      if (docStatuses.has('Pending') || verifiedTypes.size > 0) return 'Pending';
    }
    return verificationData?.overall_status || user.verificationStatus || 'Unverified';
  }, [verificationData, user.verificationStatus]);


  React.useEffect(() => {
    if (avatarUri) {
      setLocalAvatar(avatarUri);
    }
  }, [avatarUri]);

  React.useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialView]);

  React.useEffect(() => {
    if (user.token) {
      setIsLoadingBio(true);
      fetchUserAbout(user.token)
        .then((about) => {
          setBio(about);
          updateUser({ userAbout: about });
        })
        .catch((err) => console.warn('[KasambahayProfile] fetch bio error:', err))
        .finally(() => setIsLoadingBio(false));

      setIsLoadingResume(true);
      fetchKasambahayResume(user.token)
        .then((res) => {
          if (res) {
            setResumeUrl(res.resume_url);
            setResumeUploadedAt(res.resume_uploaded_at);
            updateUser({ resumeUrl: res.resume_url, resumeUploadedAt: res.resume_uploaded_at });
          }
        })
        .catch((err) => console.warn('[KasambahayProfile] fetch resume error:', err))
        .finally(() => setIsLoadingResume(false));

      fetchReceivedReviews(user.token)
        .then((items) => {
          setReviews(items || []);
        })
        .catch((err) => console.warn('[KasambahayProfile] Received reviews error:', err));

      if (user.id) {
        fetchReviewSummary(user.token, user.id)
          .then((sum) => {
            if (sum) setSummary(sum);
          })
          .catch((err) => console.warn('[KasambahayProfile] Review summary error:', err));
      }

      loadVerificationStatus();
    }
  }, [user.token, user.id]);

  const totalReviews = summary?.total_reviews ?? reviews.length;
  const positivePercentage =
    summary && summary.total_reviews > 0
      ? Math.round((summary.sentiment_breakdown.Positive / summary.total_reviews) * 100)
      : reviews.length > 0
      ? Math.round((reviews.filter((r) => r.nlp_sentiment === 'Positive').length / reviews.length) * 100)
      : null;

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access photo gallery is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0]?.uri;
        if (uri) {
          setLocalAvatar(uri);
          onUpdateAvatar?.(uri);
        }
      }
    } catch (e) {
      console.log('Error picking profile picture:', e);
    }
  };

  const handlePickAndUploadResume = async () => {
    if (!user.token) {
      Alert.alert('Authentication Required', 'Please log in to upload your resume.');
      return;
    }

    if (!DocumentPicker || typeof DocumentPicker.getDocumentAsync !== 'function') {
      Alert.alert(
        'Rebuild Required',
        'ExpoDocumentPicker requires a new app build to link native code. Please run "npm run android:build" (or "npm run android") to install the updated APK on your device.'
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      if (!file) {
        return;
      }
      const fileName = file.name || 'resume.pdf';
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        Alert.alert('Invalid File Type', 'Only PDF files are accepted.');
        return;
      }

      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Resume file must be under 10MB.');
        return;
      }

      setIsUploadingResume(true);
      const idempotencyKey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

      const data = await uploadKasambahayResume(user.token, file.uri, fileName, idempotencyKey);
      setResumeUrl(data.resume_url);
      setResumeUploadedAt(data.resume_uploaded_at);
      updateUser({ resumeUrl: data.resume_url, resumeUploadedAt: data.resume_uploaded_at });
      Alert.alert('Success', 'Your resume was uploaded successfully!');
    } catch (err: any) {
      console.warn('[KasambahayProfile] upload resume error:', err);
      Alert.alert('Upload Failed', err.message || 'Failed to upload resume.');
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleViewResume = () => {
    if (!resumeUrl) {
      Alert.alert('No Resume', 'No resume has been uploaded yet.');
      return;
    }
    Linking.openURL(resumeUrl).catch(() => {
      Alert.alert('Preview Failed', 'Could not open resume in browser or PDF viewer.');
    });
  };

  return (
    <View style={[styles.container, currentView === 'personal_info' && { backgroundColor: '#F9F8F6' }]}>
      {/* Top Status Bar Spacer */}
      <View style={{ height: insets.top, backgroundColor: currentView === 'personal_info' ? 'transparent' : '#FFF0DB', zIndex: 10 }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 0 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Backgrounds */}
        {currentView === 'personal_info' ? (
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800' }}
            style={{ width: '100%', height: 220, position: 'absolute', top: 0 }}
          />
        ) : (
          <View style={[styles.headerBg, { height: 160 }]} />
        )}

        {/* Header Row */}
        <View style={[styles.headerRow, { marginTop: 10, marginBottom: 16 }]}>
          <Pressable onPress={() => (currentView === 'personal_info' ? setCurrentView('main') : onBack?.())}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={currentView === 'personal_info' ? '#FFB43B' : '#333'}
            />
          </Pressable>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <View style={{ width: 24 }} />
        </View>

        {currentView === 'personal_info' ? (
          <React.Fragment>
            {/* Beige Info Card */}
            <View style={styles.personalInfoCard}>
              <Pressable style={styles.personalAvatarWrapper} onPress={handlePickImage}>
                <Image
                  source={{ uri: localAvatar || avatarUri || 'https://i.pravatar.cc/150?u=serbisure' }}
                  style={styles.personalAvatar}
                />
                <View style={styles.editIconBadge}>
                  <Ionicons name="camera" size={12} color="#FFF" />
                </View>
              </Pressable>

              <View style={styles.personalNameRow}>
                <Text style={styles.personalName}>{getFullName()}</Text>
                {verificationData?.overall_status === 'Verified' ? (
                  <Ionicons name="shield-checkmark" size={17} color="#27AE60" style={{ marginLeft: 6 }} />
                ) : verificationData?.overall_status === 'Pending' ? (
                  <Pressable
                    style={styles.pendingInlineBadge}
                    onPress={() => setIsVerificationModalVisible(true)}
                  >
                    <Ionicons name="time" size={12} color="#D68910" />
                    <Text style={styles.pendingInlineBadgeText}>Pending Review</Text>
                  </Pressable>
                ) : verificationData?.overall_status === 'Rejected' ? (
                  <Pressable
                    style={styles.rejectedInlineBadge}
                    onPress={() => setIsVerificationModalVisible(true)}
                  >
                    <Ionicons name="alert-circle" size={12} color="#C0392B" />
                    <Text style={styles.rejectedInlineBadgeText}>Action Needed</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.personalRole}>{user.accountType || 'Housekeeper & Cook'}</Text>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#555" />
                <Text style={styles.locationText}>Cagayan de Oro, Misamis Oriental</Text>
              </View>

              <View style={styles.sentimentDivider} />

              <View style={styles.sentimentRow}>
                <Text style={styles.sentimentLabel}>{t.clientSentiment}</Text>
                <View style={styles.sentimentBarBg}>
                  <View
                    style={[
                      styles.sentimentBarFill,
                      {
                        width: positivePercentage !== null ? `${Math.min(100, Math.max(10, positivePercentage))}%` : '0%',
                        backgroundColor: positivePercentage !== null ? '#4CAF50' : '#E0E0E0',
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.sentimentScore,
                    positivePercentage === null && { color: '#9CA3AF', fontSize: 11, fontWeight: '500' },
                  ]}
                >
                  {positivePercentage !== null ? `${positivePercentage}% ${t.positive}` : t.noReviewsYet}
                </Text>
              </View>

              <View style={styles.tagsContainer}>
                <View style={styles.pillTag}><Text style={styles.pillTagText}>Cleaning</Text></View>
                <View style={styles.pillTag}><Text style={styles.pillTagText}>Cook</Text></View>
                <View style={styles.pillTag}><Text style={styles.pillTagText}>Childcare</Text></View>
                <View style={styles.pillTag}><Text style={styles.pillTagText}>Meal Prep</Text></View>
                <View style={styles.pillTag}><Text style={styles.pillTagText}>Pet Friendly</Text></View>
              </View>
            </View>

            {/* Resume Section — Placed directly above "About Kasambahay" */}
            <View style={styles.resumeSection}>
              <View style={styles.resumeHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="document-text" size={17} color="#FFB43B" style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Resume / CV (PDF)</Text>
                </View>
                {resumeUrl ? (
                  <View style={styles.resumeStatusBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#27AE60" />
                    <Text style={styles.resumeStatusBadgeText}>Uploaded</Text>
                  </View>
                ) : (
                  <View style={[styles.resumeStatusBadge, { backgroundColor: '#F0F0F0' }]}>
                    <Text style={[styles.resumeStatusBadgeText, { color: '#888' }]}>Optional</Text>
                  </View>
                )}
              </View>

              {isLoadingResume ? (
                <View style={styles.resumeLoadingBox}>
                  <ActivityIndicator size="small" color="#FFB43B" />
                  <Text style={styles.resumeLoadingText}>Loading resume status...</Text>
                </View>
              ) : isUploadingResume ? (
                <View style={styles.resumeUploadingBox}>
                  <ActivityIndicator size="small" color="#FFB43B" />
                  <Text style={styles.resumeUploadingText}>Uploading resume to secure storage...</Text>
                </View>
              ) : resumeUrl ? (
                <View style={styles.resumeCardUploaded}>
                  <View style={styles.resumeIconBox}>
                    <Ionicons name="document-text" size={24} color="#FFB43B" />
                  </View>
                  <View style={styles.resumeInfoCol}>
                    <Text style={styles.resumeFileName} numberOfLines={1}>
                      Kasambahay_Resume.pdf
                    </Text>
                    <Text style={styles.resumeDateText}>
                      {resumeUploadedAt
                        ? `Uploaded on ${new Date(resumeUploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : 'PDF Document attached'}
                    </Text>
                  </View>
                  <View style={styles.resumeActionsRow}>
                    <Pressable style={styles.resumeViewBtn} onPress={handleViewResume}>
                      <Ionicons name="eye-outline" size={13} color="#333" />
                      <Text style={styles.resumeViewBtnText}>View</Text>
                    </Pressable>
                    <Pressable style={styles.resumeReplaceBtn} onPress={handlePickAndUploadResume}>
                      <Ionicons name="cloud-upload-outline" size={13} color="#FFB43B" />
                      <Text style={styles.resumeReplaceBtnText}>Replace</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={styles.emptyResumeContainer} onPress={handlePickAndUploadResume}>
                  <View style={styles.emptyResumeIconCircle}>
                    <Ionicons name="document-attach-outline" size={20} color="#FFB43B" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.emptyResumeTitle}>Upload your resume</Text>
                    <Text style={styles.emptyResumeSubtitle}>Submit your CV or bio document in PDF (max 10MB)</Text>
                  </View>
                  <Ionicons name="cloud-upload-outline" size={20} color="#FFB43B" />
                </Pressable>
              )}
            </View>

            {/* About Section */}
            <View style={styles.aboutSection}>
              <View style={styles.aboutHeaderRow}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t.aboutTitle} Kasambahay</Text>
                {bio && bio !== 'No Bio' && bio.trim() !== '' ? (
                  <Pressable
                    style={styles.editBioBtn}
                    onPress={() => {
                      setEditBioText(bio);
                      setIsEditingBio(true);
                    }}
                  >
                    <Ionicons name="pencil" size={13} color="#FFB43B" />
                    <Text style={styles.editBioBtnText}>Edit</Text>
                  </Pressable>
                ) : null}
              </View>

              {!bio || bio === 'No Bio' || bio.trim() === '' ? (
                <Pressable
                  style={styles.emptyBioContainer}
                  onPress={() => {
                    setEditBioText('');
                    setIsEditingBio(true);
                  }}
                >
                  <View style={styles.emptyBioIconCircle}>
                    <Ionicons name="create-outline" size={18} color="#FFB43B" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.emptyBioTitle}>Add your bio</Text>
                    <Text style={styles.emptyBioSubtitle}>Tell homeowners about your background and skills...</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
                </Pressable>
              ) : (
                <Text style={styles.aboutText}>{bio}</Text>
              )}
            </View>

            {/* Reviews Section */}
            <View style={styles.reviewsSection}>
              <View style={styles.reviewsHeader}>
                <Text style={[styles.sectionTitle, { flex: 1, marginRight: 12, marginBottom: 0 }]} numberOfLines={1} adjustsFontSizeToFit>{t.recentReviews}</Text>
                <Text style={[styles.viewAllText, { flexShrink: 0 }]}>{t.viewAll} {totalReviews}</Text>
              </View>

              {reviews.length > 0 ? (
                reviews.slice(0, 3).map((r) => (
                  <View key={r.review_id} style={[styles.reviewCard, { marginBottom: 12 }]}>
                    <View style={styles.reviewCardHeader}>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons
                            key={i}
                            name={i <= r.rating ? 'star' : 'star-outline'}
                            size={14}
                            color="#FFB43B"
                            style={{ marginRight: 2 }}
                          />
                        ))}
                      </View>
                      <View style={styles.positiveBadge}>
                        <Text style={styles.positiveBadgeText}>{r.nlp_sentiment || 'Positive'}</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewText}>"{r.unstructured_feedback}"</Text>
                    <Text style={styles.reviewAuthor}>
                      — {r.reviewer_name || 'Verified Client'}
                      {r.createdAt ? `, ${new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={[styles.reviewCard, styles.emptyReviewsCard]}>
                  <Ionicons name="chatbubbles-outline" size={32} color="#D1D5DB" />
                  <Text style={styles.emptyReviewsTitle}>{t.noReviewsYet}</Text>
                  <Text style={styles.emptyReviewsSubtitle}>
                    {t.noReviewsSubtitle}
                  </Text>
                </View>
              )}
            </View>

            {/* Bottom padding */}
            <View style={{ height: 90 }} />
          </React.Fragment>
        ) : (
          <React.Fragment>
            {/* Same Row Layout as Homeowner */}
            <View style={styles.profileInfoContainer}>
              <Pressable style={styles.avatarWrapper} onPress={handlePickImage}>
                <Image
                  source={{ uri: localAvatar || avatarUri || 'https://i.pravatar.cc/150?u=serbisure' }}
                  style={styles.avatar}
                />
                <View style={styles.editIconBadge}>
                  <Ionicons name="camera" size={12} color="#FFF" />
                </View>
              </Pressable>

              <View style={styles.profileDetails}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{getFullName()}</Text>
                </View>
                <Text style={styles.profilePhone}>+63 951 885 9238</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>KASAMBAHAY</Text>
                </View>
              </View>
            </View>

            {/* Verification Notice Banner */}
            {verificationData?.overall_status === 'Pending' ? (
              <Pressable
                style={styles.verificationNoticeBanner}
                onPress={() => setIsVerificationModalVisible(true)}
              >
                <View style={styles.verificationNoticeIconBox}>
                  <Ionicons name="time" size={18} color="#D68910" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.verificationNoticeTitle}>Document Verification Pending</Text>
                  <Text style={styles.verificationNoticeSub}>
                    Your uploaded clearances are under review by officials. Tap to check status.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D68910" />
              </Pressable>
            ) : verificationData?.overall_status === 'Rejected' ? (
              <Pressable
                style={[styles.verificationNoticeBanner, styles.verificationNoticeBannerRejected]}
                onPress={() => setIsVerificationModalVisible(true)}
              >
                <View style={[styles.verificationNoticeIconBox, styles.verificationNoticeIconBoxRejected]}>
                  <Ionicons name="alert-circle" size={18} color="#C0392B" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.verificationNoticeTitle, { color: '#C0392B' }]}>Verification Needs Attention</Text>
                  <Text style={styles.verificationNoticeSub}>
                    A document was rejected. Tap to review official feedback and re-upload.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C0392B" />
              </Pressable>
            ) : null}

            {/* Settings Card (White Rounded Sheet like Homeowner) */}
            <View style={styles.settingsCard}>
              {/* Set Status Row */}
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="toggle-outline" size={20} color="#FFB43B" />
                  </View>
                  <Text style={styles.statusLabel} numberOfLines={1} adjustsFontSizeToFit>{t.setStatus}</Text>
                </View>

                {/* Figma Segmented Pill Control */}
                <Pressable
                  style={styles.pillTrack}
                  onPress={() => setIsOnJob(!isOnJob)}
                >
                  <View style={[styles.pillSegment, !isOnJob && styles.pillSegmentActive]}>
                    <Text style={[styles.pillSegmentText, !isOnJob && styles.pillSegmentTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                      {t.available}
                    </Text>
                  </View>
                  <View style={[styles.pillSegment, isOnJob && styles.pillSegmentActive]}>
                    <Text style={[styles.pillSegmentText, isOnJob && styles.pillSegmentTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                      {t.onJob}
                    </Text>
                  </View>
                </Pressable>
              </View>

              <View style={styles.divider} />

              <SettingsItem
                icon="person-outline"
                label={t.personalInfo}
                onPress={() => setCurrentView('personal_info')}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="lock-closed-outline"
                label={t.passwordsSecurity}
                onPress={() => setIsPasswordModalVisible(true)}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="checkmark-circle-outline"
                label={t.getVerified}
                iconColor={
                  effectiveVerificationStatus === 'Verified'
                    ? '#27AE60'
                    : effectiveVerificationStatus === 'Rejected'
                    ? '#E74C3C'
                    : effectiveVerificationStatus === 'Pending'
                    ? '#F39C12'
                    : '#4CAF50'
                }
                rightComponent={
                  effectiveVerificationStatus ? (
                    <View
                      style={[
                        styles.verificationStatusBadge,
                        effectiveVerificationStatus === 'Verified' && styles.verificationBadgeVerified,
                        effectiveVerificationStatus === 'Pending' && styles.verificationBadgePending,
                        effectiveVerificationStatus === 'Rejected' && styles.verificationBadgeRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.verificationStatusBadgeText,
                          effectiveVerificationStatus === 'Verified' && styles.verificationBadgeTextVerified,
                          effectiveVerificationStatus === 'Pending' && styles.verificationBadgeTextPending,
                          effectiveVerificationStatus === 'Rejected' && styles.verificationBadgeTextRejected,
                        ]}
                      >
                        {effectiveVerificationStatus === 'Pending'
                          ? '⏳ Under Review'
                          : effectiveVerificationStatus === 'Verified'
                          ? 'Verified'
                          : effectiveVerificationStatus === 'Rejected'
                          ? 'Action Needed'
                          : 'Get Verified'}
                      </Text>
                    </View>
                  ) : undefined
                }
                onPress={() => setIsVerificationModalVisible(true)}
              />

              <View style={styles.sectionSpacing} />

              <SettingsItem
                icon="notifications-outline"
                label={t.notifications}
                onPress={() => setIsNotificationsModalVisible(true)}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="globe-outline"
                label={t.language}
                zIndex={1000}
                rightComponent={
                  <View style={{ position: 'relative', zIndex: 9999 }}>
                    <Pressable 
                      style={styles.languageSelector} 
                      onPress={() => setIsLanguageExpanded(!isLanguageExpanded)}
                    >
                      <Text style={styles.languageText}>{language}</Text>
                      <Ionicons name={isLanguageExpanded ? "chevron-up" : "chevron-down"} size={14} color="#888" />
                    </Pressable>

                    {isLanguageExpanded && (
                      <View style={styles.floatingPillDropdown}>
                        {(['English', 'Tagalog', 'Cebuano'] as Language[]).map((lang) => (
                          <Pressable
                            key={lang}
                            style={[
                              styles.floatingPillRow,
                              language === lang && styles.floatingPillRowActive
                            ]}
                            onPress={() => {
                              setLanguage(lang);
                              setIsLanguageExpanded(false);
                            }}
                          >
                            <Text style={[
                              styles.floatingPillText,
                              language === lang && styles.floatingPillTextActive
                            ]}>
                              {lang}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                }
                onPress={() => setIsLanguageExpanded(!isLanguageExpanded)}
              />

              <View style={styles.sectionSpacing} />

              <SettingsItem
                icon="help-circle-outline"
                label={t.aboutUs}
                onPress={() => setIsAboutUsModalVisible(true)}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="shield-checkmark-outline"
                label={t.privacyPolicy}
                onPress={() => setIsPrivacyPolicyModalVisible(true)}
              />

              <View style={styles.sectionSpacing} />

              <Pressable
                style={({ pressed }) => [
                  styles.settingsItem,
                  pressed && { backgroundColor: '#FFF0F0', borderRadius: 8, paddingHorizontal: 16, marginHorizontal: -16 },
                ]}
                onPress={onLogout}
              >
                {({ pressed }) => (
                  <>
                    <Ionicons
                      name="log-out-outline"
                      size={24}
                      color={pressed ? '#E74C3C' : '#FFB43B'}
                      style={styles.settingsIcon}
                    />
                    <Text style={[styles.settingsLabel, { color: pressed ? '#E74C3C' : '#333' }]}>{t.logout}</Text>
                  </>
                )}
              </Pressable>

              {/* Bottom padding for tab bar */}
              <View style={{ height: 85 }} />
            </View>
          </React.Fragment>
        )}
      </ScrollView>

      {/* Edit Bio Modal */}
      <Modal
        visible={isEditingBio}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSavingBio) setIsEditingBio(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit About Me</Text>
              <Pressable
                disabled={isSavingBio}
                onPress={() => setIsEditingBio(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color="#777" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Write a short bio describing your background, skills, or experience (up to 500 characters).
            </Text>

            <TextInput
              style={styles.bioTextInput}
              multiline
              maxLength={500}
              placeholder="e.g. Hi! I have 5 years of housekeeping and cooking experience in Cagayan de Oro..."
              placeholderTextColor="#999"
              value={editBioText}
              onChangeText={setEditBioText}
              textAlignVertical="top"
            />

            <View style={styles.charCountRow}>
              <Text style={styles.charCountText}>{editBioText.length}/500</Text>
            </View>

            <View style={styles.modalActionButtons}>
              <Pressable
                style={styles.cancelModalBtn}
                disabled={isSavingBio}
                onPress={() => setIsEditingBio(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.saveModalBtn, isSavingBio && { opacity: 0.7 }]}
                disabled={isSavingBio}
                onPress={async () => {
                  if (!user.token) {
                    Alert.alert('Error', 'You must be logged in to update your bio.');
                    return;
                  }
                  setIsSavingBio(true);
                  try {
                    const updated = await updateUserAbout(user.token, editBioText.trim());
                    setBio(updated);
                    updateUser({ userAbout: updated });
                    setIsEditingBio(false);
                  } catch (err: any) {
                    Alert.alert('Unable to Save Bio', err.message || 'Failed to update bio.');
                  } finally {
                    setIsSavingBio(false);
                  }
                }}
              >
                {isSavingBio ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveModalBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verification Status Modal */}
      <VerificationStatusModal
        visible={isVerificationModalVisible}
        onClose={() => setIsVerificationModalVisible(false)}
        statusData={verificationData}
        loading={isLoadingVerification}
        token={user.token}
        onRefresh={loadVerificationStatus}
        role="kasambahay"
      />

      {/* Password & Security Modal */}
      <PasswordSecurityModal
        visible={isPasswordModalVisible}
        onClose={() => setIsPasswordModalVisible(false)}
        token={user.token}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        visible={isNotificationsModalVisible}
        onClose={() => setIsNotificationsModalVisible(false)}
        token={user.token}
      />

      {/* About Us Modal */}
      <AboutUsModal
        visible={isAboutUsModalVisible}
        onClose={() => setIsAboutUsModalVisible(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        visible={isPrivacyPolicyModalVisible}
        onClose={() => setIsPrivacyPolicyModalVisible(false)}
      />
    </View>
  );
}

function SettingsItem({ icon, label, iconColor = '#FFB43B', hideChevron = false, rightComponent, onPress, zIndex }: any) {
  return (
    <Pressable style={[styles.settingsItem, zIndex ? { zIndex, elevation: zIndex } : undefined]} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.settingsLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
      {rightComponent ? rightComponent : !hideChevron && <Ionicons name="chevron-forward" size={16} color="#FFB43B" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF0DB',
  },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF0DB',
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  logo: {
    width: 44,
    height: 44,
  },
  profileInfoContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFB43B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFECCB',
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  profilePhone: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: '#9F7AEA',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
  },
  settingsCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    width: '100%',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  statusLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '400',
    color: '#2A2A2A',
  },
  pillTrack: {
    flexDirection: 'row',
    backgroundColor: '#E5E5E5',
    borderRadius: 20,
    padding: 2,
    alignItems: 'center',
    overflow: 'hidden',
  },
  pillSegment: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pillSegmentActive: {
    backgroundColor: '#2EBE03',
    borderRadius: 16,
  },
  pillSegmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  pillSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  settingsIcon: {
    marginRight: 14,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '400',
    color: '#2A2A2A',
    marginRight: 10,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FFB43B',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFF',
    minWidth: 95,
  },
  languageText: {
    fontSize: 12,
    color: '#333',
    marginRight: 6,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#EFECE6',
    marginLeft: 34,
  },
  sectionSpacing: {
    height: 16,
  },
  floatingPillDropdown: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB43B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 25,
    zIndex: 9999,
    overflow: 'hidden',
  },
  floatingPillRow: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  floatingPillRowActive: {
    backgroundColor: '#FFF4E5',
  },
  floatingPillText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  floatingPillTextActive: {
    color: '#FFB43B',
    fontWeight: '700',
  },
  // Personal Info Card
  personalInfoCard: {
    backgroundColor: '#FFECCB',
    borderRadius: 24,
    marginHorizontal: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
    marginTop: 20,
    position: 'relative',
  },
  personalAvatarWrapper: {
    alignSelf: 'flex-start',
    marginTop: -35,
    marginBottom: 12,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFECCB',
  },
  personalAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  personalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  personalName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  personalRole: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 12,
    color: '#555',
  },
  sentimentDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    width: '100%',
    marginVertical: 16,
  },
  sentimentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  sentimentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sentimentBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#FFF',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  sentimentBarFill: {
    width: '86%',
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  sentimentScore: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4CAF50',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillTag: {
    backgroundColor: '#FFB43B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillTagText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  resumeSection: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  resumeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resumeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  resumeStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#27AE60',
    marginLeft: 3,
  },
  resumeLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFDF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE8C8',
  },
  resumeLoadingText: {
    marginLeft: 10,
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  resumeUploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFF8ED',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE2B8',
  },
  resumeUploadingText: {
    marginLeft: 10,
    fontSize: 12,
    color: '#FFB43B',
    fontWeight: '600',
  },
  resumeCardUploaded: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE8C8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  resumeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF2DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeInfoCol: {
    marginLeft: 12,
    flex: 1,
  },
  resumeFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  resumeDateText: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  resumeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resumeViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resumeViewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
    marginLeft: 3,
  },
  resumeReplaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE2B8',
  },
  resumeReplaceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFB43B',
    marginLeft: 3,
  },
  emptyResumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFE8C8',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  emptyResumeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF2DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyResumeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  emptyResumeSubtitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  aboutSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  aboutHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editBioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE2B8',
  },
  editBioBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB43B',
    marginLeft: 4,
  },
  emptyBioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFE8C8',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  emptyBioIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF2DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBioTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  emptyBioSubtitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#777',
    lineHeight: 17,
    marginBottom: 14,
  },
  bioTextInput: {
    minHeight: 110,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: 6,
    marginBottom: 16,
  },
  charCountText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  saveModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFB43B',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  saveModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  reviewsSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    color: '#FFB43B',
    fontWeight: '700',
  },
  reviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
  },
  positiveBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  positiveBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  reviewText: {
    fontSize: 12,
    color: '#444',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  reviewAuthor: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
  emptyReviewsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyReviewsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  emptyReviewsSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
    lineHeight: 18,
  },
  pendingInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  pendingInlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  rejectedInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  rejectedInlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  verificationNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  verificationNoticeBannerRejected: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
    shadowColor: '#DC2626',
  },
  verificationNoticeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationNoticeIconBoxRejected: {
    backgroundColor: '#FEE2E2',
  },
  verificationNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  verificationNoticeSub: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 14,
  },
  verificationStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  verificationBadgeVerified: {
    backgroundColor: '#DCFCE7',
  },
  verificationBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  verificationBadgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  verificationStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  verificationBadgeTextVerified: {
    color: '#15803D',
  },
  verificationBadgeTextPending: {
    color: '#B45309',
  },
  verificationBadgeTextRejected: {
    color: '#B91C1C',
  },
});
