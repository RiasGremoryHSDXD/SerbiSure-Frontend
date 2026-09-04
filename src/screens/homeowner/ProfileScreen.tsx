import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, Pressable, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { fetchReceivedReviews, fetchReviewSummary, ReviewItem, ReviewSummaryData } from '../../api/reviewApi';
import { fetchUserAbout, updateUserAbout } from '../../api/accountApi';
import { fetchVerificationStatus, type VerificationStatusResponse } from '../../api/verificationApi';
import { VerificationStatusModal } from '../VerificationStatusModal';

const logoSource = require('../../../assets/serbisure-logo.png');

type ProfileScreenProps = Readonly<{
  avatarUri?: string | null;
  initialView?: 'main' | 'personal_info';
  onUpdateAvatar?: (uri: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
}>;

export function ProfileScreen({ avatarUri, initialView = 'main', onUpdateAvatar, onBack, onLogout }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
  const { getFullName, getFirstNameOnly, user, updateUser } = useUser();
  const [currentView, setCurrentView] = useState<'main' | 'personal_info'>(initialView);
  const [isLanguageExpanded, setIsLanguageExpanded] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(avatarUri || null);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<ReviewSummaryData | null>(null);

  const [bio, setBio] = useState<string>(user.userAbout || '');
  const [isLoadingBio, setIsLoadingBio] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBioText, setEditBioText] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);

  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationStatusResponse | null>(null);
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);

  const loadVerificationStatus = () => {
    if (user.token) {
      setIsLoadingVerification(true);
      fetchVerificationStatus(user.token)
        .then((data) => {
          setVerificationData(data);
          if (data?.overall_status) {
            updateUser({ verificationStatus: data.overall_status });
          }
        })
        .catch((err) => console.warn('[HomeownerProfile] verification status error:', err))
        .finally(() => setIsLoadingVerification(false));
    }
  };

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
        .catch((err) => console.warn('[HomeownerProfile] fetch bio error:', err))
        .finally(() => setIsLoadingBio(false));

      fetchReceivedReviews(user.token)
        .then((items) => {
          if (items && items.length > 0) {
            setReviews(items);
          }
        })
        .catch((err) => console.warn('[ProfileScreen] Received reviews error:', err));

      if (user.id) {
        fetchReviewSummary(user.token, user.id)
          .then((sum) => {
            if (sum) setSummary(sum);
          })
          .catch((err) => console.warn('[ProfileScreen] Review summary error:', err));
      }

      loadVerificationStatus();
    }
  }, [user.token, user.id]);

  const positivePercentage =
    summary && summary.total_reviews > 0
      ? Math.round((summary.sentiment_breakdown.Positive / summary.total_reviews) * 100)
      : 86;

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
            source={{ uri: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800' }}
            style={{ width: '100%', height: 220, position: 'absolute', top: 0 }}
          />
        ) : (
          <View style={[styles.headerBg, { height: 160 }]} />
        )}

        {/* Header Row (Scrolls with content) */}
        <View style={[styles.headerRow, { marginTop: 10, marginBottom: 16 }]}>
          <Pressable onPress={() => (currentView === 'personal_info' ? setCurrentView('main') : onBack?.())}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={currentView === 'personal_info' ? "#FFB43B" : "#333"}
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
              <Text style={styles.personalRole}>{user.accountType || 'Homeowner'}</Text>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#555" />
                <Text style={styles.locationText}>Cagayan de Oro, Misamis Oriental</Text>
              </View>

              <View style={styles.sentimentDivider} />

              <View style={styles.sentimentRow}>
                <Text style={styles.sentimentLabel}>{t.workerSentiment}</Text>
                <View style={styles.sentimentBarBg}>
                  <View style={[styles.sentimentBarFill, { width: `${Math.min(100, Math.max(10, positivePercentage))}%` }]} />
                </View>
                <Text style={styles.sentimentScore}>{positivePercentage}% {t.positive}</Text>
              </View>

              <View style={styles.tagsContainer}>
                <View style={styles.pillTag}><Text style={styles.pillTagText}>Non-Smoker</Text></View>
                <View style={styles.pillTag}><Text style={styles.pillTagText}>Respectful</Text></View>
                <View style={styles.pillTag}><Text style={styles.pillTagText}>Pet Owner</Text></View>
                <View style={styles.pillTag}><Text style={styles.pillTagText}>Family-Oriented</Text></View>
              </View>
            </View>

            {/* About Section */}
            <View style={styles.aboutSection}>
              <View style={styles.aboutHeaderRow}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t.aboutTitle} Homeowner</Text>
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
                    <Text style={styles.emptyBioSubtitle}>Tell workers about your household, preferences, and requirements...</Text>
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
                <Text style={[styles.viewAllText, { flexShrink: 0 }]}>{t.viewAll} {summary?.total_reviews ?? (reviews.length || 3)}</Text>
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
                      — {r.reviewer_name || 'Verified User'}
                      {r.createdAt ? `, ${new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.reviewCard}>
                  <View style={styles.reviewCardHeader}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map(i => <Ionicons key={i} name="star" size={14} color="#FFB43B" style={{ marginRight: 2 }} />)}
                    </View>
                    <View style={styles.positiveBadge}>
                      <Text style={styles.positiveBadgeText}>{t.positive}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewText}>
                    "The homeowner is kind and supportive. As an employer, they are respectful, organized, and clear with instructions. Working in their home with their two kids and pet has been a positive experience, and they create a safe and comfortable environment for staff. They are highly recommended as an employer."
                  </Text>
                  <Text style={styles.reviewAuthor}>— Clara A., D., Oct 2026</Text>
                </View>
              )}
            </View>

            {/* Bottom padding for tab bar */}
            <View style={{ height: 90 }} />
          </React.Fragment>
        ) : (
          <React.Fragment>
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
                  <Text style={styles.roleText}>{(user.accountType || 'HOMEOWNER').toUpperCase()}</Text>
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
                  <Text style={styles.verificationNoticeTitle}>ID Verification Pending</Text>
                  <Text style={styles.verificationNoticeSub}>
                    Your National ID is under review by officials. Tap to check status.
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

            <View style={styles.settingsCard}>
              <SettingsItem
                icon="person-outline"
                label={t.personalInfo}
                onPress={() => setCurrentView('personal_info')}
              />
              <View style={styles.divider} />
              <SettingsItem icon="lock-closed-outline" label={t.passwordsSecurity} />
              <View style={styles.divider} />
              <SettingsItem
                icon="checkmark-circle-outline"
                label={t.getVerified}
                iconColor={
                  verificationData?.overall_status === 'Verified'
                    ? '#27AE60'
                    : verificationData?.overall_status === 'Rejected'
                    ? '#E74C3C'
                    : verificationData?.overall_status === 'Pending'
                    ? '#F39C12'
                    : '#4CAF50'
                }
                rightComponent={
                  verificationData?.overall_status ? (
                    <View
                      style={[
                        styles.verificationStatusBadge,
                        verificationData.overall_status === 'Verified' && styles.verificationBadgeVerified,
                        verificationData.overall_status === 'Pending' && styles.verificationBadgePending,
                        verificationData.overall_status === 'Rejected' && styles.verificationBadgeRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.verificationStatusBadgeText,
                          verificationData.overall_status === 'Verified' && styles.verificationBadgeTextVerified,
                          verificationData.overall_status === 'Pending' && styles.verificationBadgeTextPending,
                          verificationData.overall_status === 'Rejected' && styles.verificationBadgeTextRejected,
                        ]}
                      >
                        {verificationData.overall_status === 'Pending'
                          ? '⏳ Under Review'
                          : verificationData.overall_status === 'Verified'
                          ? 'Verified'
                          : verificationData.overall_status === 'Rejected'
                          ? 'Action Needed'
                          : 'Get Verified'}
                      </Text>
                    </View>
                  ) : undefined
                }
                onPress={() => setIsVerificationModalVisible(true)}
              />

              <View style={styles.sectionSpacing} />

              <SettingsItem icon="notifications-outline" label={t.notifications} />
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

              <SettingsItem icon="help-circle-outline" label={t.aboutUs} />
              <View style={styles.divider} />
              <SettingsItem icon="shield-checkmark-outline" label={t.privacyPolicy} />

              <View style={styles.sectionSpacing} />

              <Pressable
                style={({ pressed }) => [
                  styles.settingsItem,
                  pressed && { backgroundColor: '#FFF0F0', borderRadius: 8, paddingHorizontal: 16, marginHorizontal: -16 }
                ]}
                onPress={onLogout}
              >
                {({ pressed }) => (
                  <>
                    <Ionicons name="log-out-outline" size={24} color={pressed ? "#E74C3C" : "#FFB43B"} style={styles.settingsIcon} />
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
              Write a short bio describing your household, preferences, or what you're looking for in a Kasambahay (up to 500 characters).
            </Text>

            <TextInput
              style={styles.bioTextInput}
              multiline
              maxLength={500}
              placeholder="e.g. I am a homeowner looking for a reliable, honest helper who can assist with daily housekeeping..."
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
      />
    </View>
  );
}

function SettingsItem({ icon, label, iconColor = "#FFB43B", hideChevron = false, rightComponent, onPress, zIndex }: any) {
  return (
    <Pressable style={[styles.settingsItem, zIndex ? { zIndex, elevation: zIndex } : undefined]} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.settingsLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
      {rightComponent || (!hideChevron && <Ionicons name="chevron-forward" size={16} color="#FFB43B" />)}
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
    backgroundColor: '#9F7AEA', // purple
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
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
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
  divider: {
    height: 1,
    backgroundColor: '#EFECE6',
    marginLeft: 34,
  },
  sectionSpacing: {
    height: 16,
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
  // Personal Info Styles
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
  },
  locationText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
  },
  sentimentDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 16,
  },
  sentimentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sentimentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginRight: 12,
  },
  sentimentBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#FFF',
    borderRadius: 4,
    marginRight: 12,
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
    fontWeight: '600',
  },
  aboutSection: {
    paddingHorizontal: 24,
    marginTop: 30,
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
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
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
    marginTop: 30,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 12,
    color: '#FFB43B',
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
  },
  positiveBadge: {
    backgroundColor: '#14A11C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  positiveBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  reviewText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  reviewAuthor: {
    fontSize: 12,
    color: '#888',
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
