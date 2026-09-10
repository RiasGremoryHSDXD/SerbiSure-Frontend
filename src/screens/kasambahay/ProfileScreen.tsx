import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, Pressable, Switch, Alert, Modal, TextInput, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { fetchReceivedReviews, fetchReviewSummary, fetchReviewAnalytics, ReviewItem, ReviewSummaryData, ReviewAnalyticsData } from '../../api/reviewApi';
import {
  fetchUserAbout,
  updateUserAbout,
  fetchKasambahayResume,
  uploadKasambahayResume,
  fetchUserTags,
  updateUserTags,
  fetchContactPrivacy,
  updateContactPrivacy,
  fetchJobStatus,
  updateJobStatus,
} from '../../api/accountApi';
import { fetchVerificationStatus, type VerificationStatusResponse } from '../../api/verificationApi';
import { fetchNotifications } from '../../api/notificationsApi';
import { VerificationStatusModal } from '../VerificationStatusModal';
import { PasswordSecurityModal } from '../PasswordSecurityModal';
import { AboutUsModal } from '../AboutUsModal';
import { PrivacyPolicyModal } from '../PrivacyPolicyModal';
import { MyBookingsModal } from '../MyBookingsModal';
import { ManageTagsModal } from '../ManageTagsModal';
import { NotificationBell } from '../../context/NotificationContext';

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
  const [isMyBookingsModalVisible, setIsMyBookingsModalVisible] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [analyticsData, setAnalyticsData] = useState<ReviewAnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationStatusResponse | null>(null);
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);

  const [tags, setTags] = useState<string[]>(user.userTags || []);
  const [isManageTagsModalVisible, setIsManageTagsModalVisible] = useState(false);
  const [showContactNumber, setShowContactNumber] = useState<boolean>(user.showContactNumber ?? false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const promises: Promise<any>[] = [];
      if (user.token) {
        promises.push(
          fetchVerificationStatus(user.token).then((data) => {
            setVerificationData(data);
            if (data?.overall_status) {
              updateUser({ verificationStatus: data.overall_status });
            }
          }).catch(() => {})
        );
        promises.push(
          fetchUserAbout(user.token).then((about) => {
            setBio(about);
            updateUser({ userAbout: about });
          }).catch(() => {})
        );
        promises.push(
          fetchKasambahayResume(user.token).then((res) => {
            if (res) {
              setResumeUrl(res.resume_url);
              setResumeUploadedAt(res.resume_uploaded_at);
              updateUser({ resumeUrl: res.resume_url, resumeUploadedAt: res.resume_uploaded_at });
            }
          }).catch(() => {})
        );
        promises.push(
          fetchReceivedReviews(user.token).then((items) => {
            setReviews(items || []);
          }).catch(() => {})
        );
        if (user.id) {
          promises.push(
            fetchReviewSummary(user.token, user.id).then((sum) => {
              if (sum) setSummary(sum);
            }).catch(() => {})
          );
        }
        promises.push(
          fetchNotifications(user.token).then((res) => {
            setUnreadNotifCount(res?.unread_count ?? 0);
          }).catch(() => {})
        );
        promises.push(
          fetchReviewAnalytics(user.token).then((analytics) => {
            if (analytics) setAnalyticsData(analytics);
          }).catch(() => {})
        );
        promises.push(
          fetchUserTags(user.token).then((userTags) => {
            setTags(userTags);
            updateUser({ userTags });
          }).catch(() => {})
        );
        promises.push(
          fetchContactPrivacy(user.token).then((show) => {
            setShowContactNumber(show);
            updateUser({ showContactNumber: show });
          }).catch(() => {})
        );
        promises.push(
          fetchJobStatus(user.token).then((onJob) => {
            setIsOnJob(onJob);
          }).catch(() => {})
        );
      }
      await Promise.allSettled(promises);
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setIsRefreshing(false);
    }
  };

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

      fetchNotifications(user.token)
        .then((res) => {
          setUnreadNotifCount(res?.unread_count ?? 0);
        })
        .catch(() => {});

      setIsLoadingAnalytics(true);
      fetchReviewAnalytics(user.token)
        .then((analytics) => {
          if (analytics) setAnalyticsData(analytics);
        })
        .catch((err) => console.warn('[KasambahayProfile] Analytics error:', err))
        .finally(() => setIsLoadingAnalytics(false));

      fetchUserTags(user.token)
        .then((userTags) => {
          setTags(userTags);
          updateUser({ userTags });
        })
        .catch((err) => console.warn('[KasambahayProfile] fetch tags error:', err));

      fetchContactPrivacy(user.token)
        .then((show) => {
          setShowContactNumber(show);
          updateUser({ showContactNumber: show });
        })
        .catch((err) => console.warn('[KasambahayProfile] fetch contact privacy error:', err));

      fetchJobStatus(user.token)
        .then((onJob) => {
          setIsOnJob(onJob);
        })
        .catch((err) => console.warn('[KasambahayProfile] fetch job status error:', err));

      loadVerificationStatus();
    }
  }, [user.token, user.id]);

  const handleToggleJobStatus = async (newStatus: boolean) => {
    setIsOnJob(newStatus);
    if (!user.token) return;
    try {
      const updated = await updateJobStatus(user.token, newStatus);
      setIsOnJob(updated);
    } catch (err: any) {
      setIsOnJob(!newStatus);
      console.warn('[KasambahayProfile] toggle job status error:', err);
    }
  };

  const handleSaveTags = async (newTags: string[]) => {
    if (!user.token) return;
    const saved = await updateUserTags(user.token, newTags);
    setTags(saved);
    updateUser({ userTags: saved });
  };

  const handleToggleContactPrivacy = async (value: boolean) => {
    if (!user.token || isUpdatingPrivacy) return;
    setShowContactNumber(value);
    setIsUpdatingPrivacy(true);
    try {
      const updated = await updateContactPrivacy(user.token, value);
      setShowContactNumber(updated);
      updateUser({ showContactNumber: updated });
    } catch (err: any) {
      setShowContactNumber(!value);
      Alert.alert('Error', err?.message || 'Failed to update contact privacy setting.');
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

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
    <View style={styles.container}>
      {/* Top Status Bar Spacer */}
      <View style={{ height: insets.top, backgroundColor: '#F6F5F2', zIndex: 10 }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 0 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#FFB43B']}
            tintColor="#FFB43B"
          />
        }
      >
        {/* Header Row */}
        <View style={styles.headerTop}>
          <View style={styles.headerSide}>
            {currentView === 'personal_info' ? (
              <Pressable
                style={styles.backCircleButton}
                onPress={() => setCurrentView('main')}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={20} color="#0D0D11" />
              </Pressable>
            ) : null}
          </View>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <NotificationBell />
          </View>
        </View>

        {currentView === 'personal_info' ? (
          <React.Fragment>
            {/* Identity Hero Squircle Card */}
            <View style={styles.personalHeroCard}>
              <Pressable style={styles.personalAvatarWrapper} onPress={handlePickImage}>
                <Image
                  source={{ uri: localAvatar || avatarUri || 'https://i.pravatar.cc/150?u=serbisure' }}
                  style={styles.personalAvatar}
                />
                <View style={styles.cameraIconBadge}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              </Pressable>

              <View style={styles.personalNameRow}>
                <Text style={styles.personalName}>{getFullName()}</Text>
                {effectiveVerificationStatus === 'Verified' ? (
                  <Ionicons name="shield-checkmark" size={18} color="#10B981" style={{ marginLeft: 6 }} />
                ) : null}
              </View>

              <View style={styles.rolePillBadge}>
                <Text style={styles.rolePillText}>{(user.accountType || 'KASAMBAHAY').toUpperCase()}</Text>
              </View>

              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color="#FFB380" />
                <Text style={styles.locationText}>
                  {[user.city, user.province].filter(Boolean).join(', ') || 'Cagayan de Oro, Misamis Oriental'}
                </Text>
              </View>

              {/* Email & Phone Contact Information */}
              <View style={styles.contactDetailsContainer}>
                {user.email ? (
                  <View style={styles.contactItemRow}>
                    <Ionicons name="mail" size={13} color="#9CA3AF" />
                    <Text style={styles.contactItemText}>{user.email}</Text>
                  </View>
                ) : null}
                {user.contactNumber ? (
                  <View style={styles.contactItemRow}>
                    <Ionicons name="call" size={13} color="#9CA3AF" />
                    <Text style={styles.contactItemText}>{user.contactNumber}</Text>
                    <Pressable
                      style={[
                        styles.privacyPill,
                        showContactNumber ? styles.privacyPillPublic : styles.privacyPillPrivate,
                      ]}
                      onPress={() => handleToggleContactPrivacy(!showContactNumber)}
                      disabled={isUpdatingPrivacy}
                    >
                      <Ionicons
                        name={showContactNumber ? 'eye' : 'eye-off'}
                        size={11}
                        color={showContactNumber ? '#065F46' : '#6B7280'}
                      />
                      <Text
                        style={[
                          styles.privacyPillText,
                          showContactNumber ? styles.privacyPillTextPublic : styles.privacyPillTextPrivate,
                        ]}
                      >
                        {showContactNumber ? 'Public' : 'Private'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {/* Client Sentiment Track */}
              <View style={styles.sentimentCard}>
                <View style={styles.sentimentTopRow}>
                  <Text style={styles.sentimentCardLabel}>{t.clientSentiment}</Text>
                  <Text
                    style={[
                      styles.sentimentCardScore,
                      positivePercentage === null && { color: '#9CA3AF' },
                    ]}
                  >
                    {positivePercentage !== null ? `${positivePercentage}% ${t.positive}` : t.noReviewsYet}
                  </Text>
                </View>
                <View style={styles.sentimentTrack}>
                  <View
                    style={[
                      styles.sentimentFill,
                      {
                        width: positivePercentage !== null ? `${Math.min(100, Math.max(8, positivePercentage))}%` : '0%',
                        backgroundColor: positivePercentage !== null ? '#10B981' : '#E5E7EB',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Profile Tags Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View>
                  <Text style={styles.sectionCardTitle}>Profile Tags</Text>
                  <Text style={styles.sectionCardSubtitle}>Skills & job preferences</Text>
                </View>
                <Pressable
                  style={styles.actionPillButton}
                  onPress={() => setIsManageTagsModalVisible(true)}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={13} color="#FFFFFF" />
                  <Text style={styles.actionPillButtonText}>
                    {tags && tags.length > 0 ? 'Edit Tags' : 'Add Tags'}
                  </Text>
                </Pressable>
              </View>

              {tags && tags.length > 0 ? (
                <View style={styles.tagsFlexWrap}>
                  {tags.map((tagItem, idx) => (
                    <View key={`${tagItem}-${idx}`} style={styles.cleanPillTag}>
                      <Text style={styles.cleanPillTagText}>{tagItem}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Pressable
                  style={styles.emptyActionTile}
                  onPress={() => setIsManageTagsModalVisible(true)}
                >
                  <View style={styles.emptyActionIconCircle}>
                    <Ionicons name="pricetag" size={18} color="#0D0D11" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.emptyActionTitle}>Showcase your skills</Text>
                    <Text style={styles.emptyActionSubtitle}>Add tags like Cooking, Babysitting, Cleaning...</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </Pressable>
              )}
            </View>

            {/* Resume / CV Section */}
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

            {/* About Kasambahay Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View>
                  <Text style={styles.sectionCardTitle}>{t.aboutTitle} Kasambahay</Text>
                  <Text style={styles.sectionCardSubtitle}>Tell clients about yourself</Text>
                </View>
                {bio && bio !== 'No Bio' && bio.trim() !== '' ? (
                  <Pressable
                    style={styles.actionPillButton}
                    onPress={() => {
                      setEditBioText(bio);
                      setIsEditingBio(true);
                    }}
                  >
                    <Ionicons name="pencil" size={12} color="#FFFFFF" />
                    <Text style={styles.actionPillButtonText}>Edit</Text>
                  </Pressable>
                ) : null}
              </View>

              {!bio || bio === 'No Bio' || bio.trim() === '' ? (
                <Pressable
                  style={styles.emptyActionTile}
                  onPress={() => {
                    setEditBioText('');
                    setIsEditingBio(true);
                  }}
                >
                  <View style={styles.emptyActionIconCircle}>
                    <Ionicons name="create" size={18} color="#0D0D11" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.emptyActionTitle}>Write your bio</Text>
                    <Text style={styles.emptyActionSubtitle}>Share your experience, work ethic, and background...</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </Pressable>
              ) : (
                <View style={styles.bioTextContainer}>
                  <Text style={styles.bioBodyText}>{bio}</Text>
                </View>
              )}
            </View>

            {/* Reputation & Performance Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View>
                  <Text style={styles.sectionCardTitle}>Reputation & Stats</Text>
                  <Text style={styles.sectionCardSubtitle}>Verified client history</Text>
                </View>
                <View style={styles.statusBadgeSuccess}>
                  <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                  <Text style={styles.statusBadgeSuccessText}>Trusted</Text>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricTile}>
                  <Text style={styles.metricVal}>
                    {analyticsData ? analyticsData.average_rating.toFixed(1) : (summary?.average_rating ? summary.average_rating.toFixed(1) : '5.0')}
                  </Text>
                  <View style={styles.metricLabelRow}>
                    <Ionicons name="star" size={12} color="#FFB380" />
                    <Text style={styles.metricLabel}> Rating</Text>
                  </View>
                </View>

                <View style={styles.metricTile}>
                  <Text style={styles.metricVal}>
                    {analyticsData ? analyticsData.total_jobs_completed : '0'}
                  </Text>
                  <Text style={styles.metricLabel}>Jobs Done</Text>
                </View>

                <View style={styles.metricTile}>
                  <Text style={styles.metricVal}>
                    {analyticsData ? `${analyticsData.positive_percentage}%` : (positivePercentage !== null ? `${positivePercentage}%` : '100%')}
                  </Text>
                  <Text style={styles.metricLabel}>Positive</Text>
                </View>

                <View style={styles.metricTile}>
                  <Text style={styles.metricVal}>
                    {summary?.total_reviews ? '0%' : '0%'}
                  </Text>
                  <Text style={styles.metricLabel}>Cancel Rate</Text>
                </View>
              </View>
            </View>

            {/* Reviews Section */}
            <View style={styles.reviewsSection}>
              <View style={styles.reviewsHeader}>
                <Text style={styles.reviewsSectionTitle}>{t.recentReviews}</Text>
                {totalReviews >= 2 ? (
                  <Text style={styles.viewAllPill}>{t.viewAll} ({totalReviews})</Text>
                ) : null}
              </View>

              {reviews.length > 0 ? (
                reviews.slice(0, 3).map((r) => (
                  <View key={r.review_id} style={styles.reviewCard}>
                    <View style={styles.reviewCardHeader}>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons
                            key={i}
                            name={i <= r.rating ? 'star' : 'star-outline'}
                            size={14}
                            color="#FFB380"
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
                <View style={styles.emptyReviewsCard}>
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
            {/* Settings Profile Hero Card */}
            <View style={styles.settingsHeroCard}>
              <View style={styles.settingsHeroTopRow}>
                <Pressable style={styles.avatarWrapper} onPress={handlePickImage}>
                  <Image
                    source={{ uri: localAvatar || avatarUri || 'https://i.pravatar.cc/150?u=serbisure' }}
                    style={styles.avatar}
                  />
                  <View style={styles.cameraIconBadge}>
                    <Ionicons name="camera" size={11} color="#FFF" />
                  </View>
                </Pressable>

                <View style={styles.heroDetails}>
                  <Text style={styles.heroName} numberOfLines={1}>{getFullName()}</Text>
                  <View style={styles.heroRolePillBadge}>
                    <Text style={styles.rolePillText}>{(user.accountType || 'KASAMBAHAY').toUpperCase()}</Text>
                  </View>
                  {user.email ? (
                    <View style={styles.heroContactRow}>
                      <Ionicons name="mail" size={12} color="#9CA3AF" />
                      <Text style={styles.heroContactText} numberOfLines={1}>{user.email}</Text>
                    </View>
                  ) : null}
                  <View style={styles.heroContactRow}>
                    <Ionicons name="call" size={12} color="#9CA3AF" />
                    <Text style={styles.heroContactText}>{user.contactNumber || 'No phone registered'}</Text>
                    <View
                      style={[
                        styles.privacyPill,
                        showContactNumber ? styles.privacyPillPublic : styles.privacyPillPrivate,
                      ]}
                    >
                      <Text
                        style={[
                          styles.privacyPillText,
                          showContactNumber ? styles.privacyPillTextPublic : styles.privacyPillTextPrivate,
                        ]}
                      >
                        {showContactNumber ? 'Public' : 'Private'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Kasambahay Availability Status Pill Track */}
              <View style={styles.heroAvailabilityContainer}>
                <View style={styles.availabilityLabelRow}>
                  <Ionicons name="radio-button-on" size={13} color={isOnJob ? "#F59E0B" : "#10B981"} />
                  <Text style={styles.availabilityLabel}>{t.setStatus}</Text>
                </View>
                <Pressable
                  style={styles.pillTrack}
                  onPress={() => handleToggleJobStatus(!isOnJob)}
                >
                  <View style={[styles.pillSegment, !isOnJob && styles.pillSegmentAvailable]}>
                    <Text style={[styles.pillSegmentText, !isOnJob && styles.pillSegmentTextActive]}>
                      {t.available}
                    </Text>
                  </View>
                  <View style={[styles.pillSegment, isOnJob && styles.pillSegmentOnJob]}>
                    <Text style={[styles.pillSegmentText, isOnJob && styles.pillSegmentTextActive]}>
                      {t.onJob}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Verification Notice Banner */}
            {verificationData?.overall_status === 'Pending' ? (
              <Pressable
                style={styles.verificationNoticeBanner}
                onPress={() => setIsVerificationModalVisible(true)}
              >
                <View style={styles.verificationNoticeIconBox}>
                  <Ionicons name="time" size={18} color="#B45309" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.verificationNoticeTitle}>Document Verification Pending</Text>
                  <Text style={styles.verificationNoticeSub}>
                    Your uploaded clearances are under review. Tap to check status.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#B45309" />
              </Pressable>
            ) : verificationData?.overall_status === 'Rejected' ? (
              <Pressable
                style={[styles.verificationNoticeBanner, styles.verificationNoticeBannerRejected]}
                onPress={() => setIsVerificationModalVisible(true)}
              >
                <View style={[styles.verificationNoticeIconBox, styles.verificationNoticeIconBoxRejected]}>
                  <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.verificationNoticeTitle, { color: '#B91C1C' }]}>Verification Needs Attention</Text>
                  <Text style={styles.verificationNoticeSub}>
                    A document was rejected. Tap to review feedback and re-upload.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#B91C1C" />
              </Pressable>
            ) : null}

            {/* Group 1: ACCOUNT */}
            <Text style={styles.groupHeaderLabel}>ACCOUNT</Text>
            <View style={styles.groupCard}>
              <SettingsRow
                icon="person"
                title={t.personalInfo}
                onPress={() => setCurrentView('personal_info')}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="shield-checkmark"
                title={t.getVerified}
                rightComponent={
                  <View
                    style={[
                      styles.verificationStatusPill,
                      effectiveVerificationStatus === 'Verified' && styles.verificationPillVerified,
                      effectiveVerificationStatus === 'Pending' && styles.verificationPillPending,
                      effectiveVerificationStatus === 'Rejected' && styles.verificationPillRejected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.verificationStatusPillText,
                        effectiveVerificationStatus === 'Verified' && styles.verificationPillTextVerified,
                        effectiveVerificationStatus === 'Pending' && styles.verificationPillTextPending,
                        effectiveVerificationStatus === 'Rejected' && styles.verificationPillTextRejected,
                      ]}
                    >
                      {effectiveVerificationStatus === 'Pending'
                        ? 'Under Review'
                        : effectiveVerificationStatus === 'Verified'
                        ? 'Verified'
                        : effectiveVerificationStatus === 'Rejected'
                        ? 'Action Needed'
                        : 'Get Verified'}
                    </Text>
                  </View>
                }
                onPress={() => setIsVerificationModalVisible(true)}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="lock-closed"
                title={t.passwordsSecurity}
                onPress={() => setIsPasswordModalVisible(true)}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="briefcase"
                title="My Jobs & Contracts"
                onPress={() => setIsMyBookingsModalVisible(true)}
              />
            </View>

            {/* Group 2: PREFERENCES */}
            <Text style={styles.groupHeaderLabel}>PREFERENCES</Text>
            <View style={[styles.groupCard, isLanguageExpanded ? { zIndex: 9999, elevation: 9999 } : { zIndex: 2, elevation: 0 }]}>
              <SettingsRow
                icon={showContactNumber ? 'eye' : 'eye-off'}
                title="Show Contact Number"
                rightComponent={
                  <Switch
                    value={showContactNumber}
                    onValueChange={handleToggleContactPrivacy}
                    trackColor={{ false: '#E5E7EB', true: '#FFB380' }}
                    thumbColor={showContactNumber ? '#0D0D11' : '#9CA3AF'}
                    disabled={isUpdatingPrivacy}
                  />
                }
                onPress={() => handleToggleContactPrivacy(!showContactNumber)}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="globe"
                title={t.language}
                zIndex={isLanguageExpanded ? 9999 : 1}
                rightComponent={
                  <View style={{ position: 'relative', zIndex: 9999 }}>
                    <Pressable
                      style={styles.languagePillSelector}
                      onPress={() => setIsLanguageExpanded(!isLanguageExpanded)}
                    >
                      <Text style={styles.languagePillText}>{language === 'Cebuano' ? 'Bisaya' : language}</Text>
                      <Ionicons name={isLanguageExpanded ? 'chevron-up' : 'chevron-down'} size={13} color="#0D0D11" />
                    </Pressable>

                    {isLanguageExpanded && (
                      <View style={styles.floatingPillDropdown}>
                        {(['English', 'Tagalog', 'Bisaya'] as Language[]).map((lang) => (
                          <Pressable
                            key={lang}
                            style={[
                              styles.floatingPillRow,
                              (language === lang || (lang === 'Bisaya' && language === 'Cebuano')) && styles.floatingPillRowActive,
                            ]}
                            onPress={() => {
                              setLanguage(lang);
                              setIsLanguageExpanded(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.floatingPillText,
                                (language === lang || (lang === 'Bisaya' && language === 'Cebuano')) && styles.floatingPillTextActive,
                              ]}
                            >
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
            </View>

            {/* Group 3: SUPPORT & LEGAL */}
            <Text style={styles.groupHeaderLabel}>SUPPORT & LEGAL</Text>
            <View style={[styles.groupCard, { zIndex: 1, elevation: 0 }]}>
              <SettingsRow
                icon="information-circle"
                title={t.aboutUs}
                onPress={() => setIsAboutUsModalVisible(true)}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="document-text"
                title={t.privacyPolicy}
                onPress={() => setIsPrivacyPolicyModalVisible(true)}
              />
            </View>

            {/* Log Out Pill Button */}
            <Pressable
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && { opacity: 0.8 },
              ]}
              onPress={onLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.logoutButtonText}>{t.logout}</Text>
            </Pressable>

            {/* Bottom padding for tab bar */}
            <View style={{ height: 85 }} />
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

      {/* My Bookings / Jobs Modal */}
      <MyBookingsModal
        visible={isMyBookingsModalVisible}
        onClose={() => setIsMyBookingsModalVisible(false)}
        token={user.token || ''}
        accountType="Kasambahay"
      />

      {/* Manage Tags Modal */}
      <ManageTagsModal
        visible={isManageTagsModalVisible}
        onClose={() => setIsManageTagsModalVisible(false)}
        currentTags={tags}
        onSave={handleSaveTags}
        accountType={user.accountType}
      />
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  iconColor = '#FFB380',
  rightComponent,
  onPress,
  zIndex,
}: {
  icon: any;
  title: string;
  iconColor?: string;
  rightComponent?: React.ReactNode;
  onPress?: () => void;
  zIndex?: number;
}) {
  return (
    <Pressable
      style={[styles.settingsRow, zIndex ? { zIndex, elevation: zIndex } : undefined]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.rowTitle}>{title}</Text>
      {rightComponent ? rightComponent : <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5F2',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 12,
    width: '100%',
  },
  headerSide: {
    width: 44,
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  backCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 44,
    height: 44,
  },
  // Personal Info Detailed View
  personalHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    marginHorizontal: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  personalAvatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  personalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0D0D11',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  personalName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0D0D11',
  },
  rolePillBadge: {
    backgroundColor: '#FFB380',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'center',
    marginBottom: 8,
  },
  heroRolePillBadge: {
    backgroundColor: '#FFB380',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
  rolePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0D0D11',
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  locationText: {
    fontSize: 12.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  contactDetailsContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  contactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactItemText: {
    fontSize: 12.5,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  privacyPillPublic: {
    backgroundColor: '#ECFDF5',
  },
  privacyPillPrivate: {
    backgroundColor: '#F3F4F6',
  },
  privacyPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  privacyPillTextPublic: {
    color: '#065F46',
  },
  privacyPillTextPrivate: {
    color: '#6B7280',
  },
  sentimentCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 14,
  },
  sentimentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sentimentCardLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0D0D11',
  },
  sentimentCardScore: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#10B981',
  },
  sentimentTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  sentimentFill: {
    height: '100%',
    borderRadius: 9999,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D0D11',
  },
  sectionCardSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 1,
  },
  actionPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0D0D11',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  actionPillButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tagsFlexWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cleanPillTag: {
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  cleanPillTagText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyActionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 14,
  },
  emptyActionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D0D11',
  },
  emptyActionSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  statusBadgeSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  statusBadgeNeutral: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  statusBadgeNeutralText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  inlineLoadingTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 16,
  },
  inlineLoadingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 8,
  },
  resumeAttachedTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 12,
  },
  resumeDocIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D0D11',
  },
  resumeDateSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  resumeButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resumeSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F0EC',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  resumeSmallBtnAccent: {
    backgroundColor: '#FFF4ED',
  },
  resumeSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D0D11',
  },
  bioTextContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 14,
  },
  bioBodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D0D11',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  reviewsSection: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  reviewsSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D0D11',
  },
  viewAllPill: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFB380',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 10,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
  },
  positiveBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  positiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  reviewText: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  reviewAuthor: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  emptyReviewsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  emptyReviewsTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 8,
  },
  emptyReviewsSubtitle: {
    fontSize: 11.5,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },

  // Main Settings View
  settingsHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  settingsHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  heroDetails: {
    flex: 1,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D0D11',
    marginBottom: 2,
  },
  heroContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  heroContactText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  heroAvailabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 14,
  },
  availabilityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0D0D11',
  },
  pillTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 9999,
    padding: 3,
    overflow: 'hidden',
  },
  pillSegment: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pillSegmentAvailable: {
    backgroundColor: '#10B981',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  pillSegmentOnJob: {
    backgroundColor: '#F59E0B',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  pillSegmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  pillSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  verificationNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  verificationNoticeBannerRejected: {
    backgroundColor: '#FEE2E2',
  },
  verificationNoticeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationNoticeIconBoxRejected: {
    backgroundColor: '#FFFFFF',
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
    lineHeight: 15,
  },

  groupHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginLeft: 24,
    marginBottom: 6,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'visible',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    overflow: 'visible',
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0D0D11',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F6F5F2',
    marginLeft: 40,
  },
  verificationStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
  },
  verificationPillVerified: {
    backgroundColor: '#ECFDF5',
  },
  verificationPillPending: {
    backgroundColor: '#FEF3C7',
  },
  verificationPillRejected: {
    backgroundColor: '#FEE2E2',
  },
  verificationStatusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  verificationPillTextVerified: {
    color: '#065F46',
  },
  verificationPillTextPending: {
    color: '#B45309',
  },
  verificationPillTextRejected: {
    color: '#B91C1C',
  },

  languagePillSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  languagePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0D0D11',
  },
  floatingPillDropdown: {
    position: 'absolute',
    top: 34,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 6,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    zIndex: 99999,
    minWidth: 120,
  },
  floatingPillRow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  floatingPillRowActive: {
    backgroundColor: '#FFF4ED',
  },
  floatingPillText: {
    fontSize: 11.5,
    color: '#374151',
    fontWeight: '600',
  },
  floatingPillTextActive: {
    color: '#0D0D11',
    fontWeight: '800',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 9999,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 85,
  },
  logoutButtonText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#EF4444',
  },

  // Modals
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
    borderRadius: 28,
    padding: 22,
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
    color: '#0D0D11',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    marginBottom: 14,
  },
  bioTextInput: {
    minHeight: 110,
    maxHeight: 180,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 14,
    fontSize: 13,
    color: '#0D0D11',
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: 6,
    marginBottom: 16,
  },
  charCountText: {
    fontSize: 11,
    color: '#9CA3AF',
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
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  saveModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: '#0D0D11',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  saveModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
