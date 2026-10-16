import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../../../shared/localization/LanguageContext';
import { useUser } from '../../auth/session/UserContext';
import { fetchReceivedReviews, fetchReviewSummary, ReviewItem, ReviewSummaryData } from '../../reviews/api/reviewApi';
import { fetchUserAbout, fetchUserTags, updateUserTags, fetchContactPrivacy, updateContactPrivacy } from '../api/accountApi';
import { fetchVerificationStatus, type VerificationStatusResponse } from '../../verification/api/verificationApi';
import { fetchNotifications } from '../../notifications/api/notificationsApi';

import { BookingItem, fetchMyBookings, cancelBooking } from '../../bookings/api/bookingApi';

import { resolveRole, ROLE_CONFIG } from '../../../app/roleConfig';
import { localizeProfileCopy } from '../profileConfig';
import type { ProfileScreenProps } from '../types';
import { useWorkerProfile } from '../worker/useWorkerProfile';

export function useProfile({ role: requestedRole, avatarUri, initialView = 'main', onUpdateAvatar, onBack, onLogout }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t, tr } = useLanguage();
  const { getFullName, getFirstNameOnly, user, updateUser } = useUser();
  const role = requestedRole || resolveRole(user.accountType);
  const isWorker = ROLE_CONFIG[role].workerProfile;
  const requiredDocuments = ROLE_CONFIG[role].requiredDocuments;
  const copy = localizeProfileCopy(role, tr);
  const worker = useWorkerProfile(isWorker);
  const { isOnJob, analyticsData, isLoadingAnalytics, refreshWorkerProfile, handleToggleJobStatus } = worker;
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
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isNotificationsModalVisible, setIsNotificationsModalVisible] = useState(false);
  const [isAboutUsModalVisible, setIsAboutUsModalVisible] = useState(false);
  const [isPrivacyPolicyModalVisible, setIsPrivacyPolicyModalVisible] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [isMyBookingsModalVisible, setIsMyBookingsModalVisible] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [verificationData, setVerificationData] = useState<VerificationStatusResponse | null>(null);
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);

  const [tags, setTags] = useState<string[]>(user.userTags || []);
  const [isManageTagsModalVisible, setIsManageTagsModalVisible] = useState(false);
  const [isManageSocialLinksModalVisible, setIsManageSocialLinksModalVisible] = useState(false);
  const [isAllReviewsModalVisible, setIsAllReviewsModalVisible] = useState(false);
  const [isReviewsExpanded, setIsReviewsExpanded] = useState(false);
  const [showContactNumber, setShowContactNumber] = useState<boolean>(user.showContactNumber ?? false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [pendingPosts, setPendingPosts] = useState<BookingItem[]>([]);
  const [isLoadingPendingPosts, setIsLoadingPendingPosts] = useState(false);
  const [pendingPostsError, setPendingPostsError] = useState<string | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'posts' | 'reviews'>('posts');
  const [isCancellingPostId, setIsCancellingPostId] = useState<string | null>(null);
  const [bookingsModalInitialTab, setBookingsModalInitialTab] = useState<'active' | 'pending' | 'completed' | 'cancelled'>('active');

  const openMyBookings = (initialTab: 'active' | 'pending' | 'completed' | 'cancelled' = 'active') => {
    setBookingsModalInitialTab(initialTab);
    setIsMyBookingsModalVisible(true);
  };

  const loadPendingPosts = async (silent = false) => {
    if (!user.token) return;
    if (!silent) setIsLoadingPendingPosts(true);
    setPendingPostsError(null);
    try {
      const data = await fetchMyBookings(user.token, 'pending');
      setPendingPosts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('[KasambahayProfile] fetchMyBookings error:', err);
      setPendingPostsError(err?.message || 'Failed to load pending posts');
    } finally {
      if (!silent) setIsLoadingPendingPosts(false);
    }
  };

  const handleCancelPendingPost = (bookingId: string) => {
    if (!user.token || isCancellingPostId) return;
    Alert.alert(
      'Cancel Pending Post',
      'Are you sure you want to cancel this pending post? This action cannot be undone.',
      [
        { text: 'Keep Post', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancellingPostId(bookingId);
            try {
              const res = await cancelBooking(user.token!, bookingId, { reason: 'Cancelled by poster from profile' });
              if (res.success) {
                setPendingPosts((prev) => prev.filter((p) => p.booking_id !== bookingId));
                Alert.alert('Post Cancelled', 'Your pending post has been cancelled successfully.');
              } else {
                Alert.alert('Error', res.error || 'Failed to cancel post. Please try again.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'An error occurred while cancelling.');
            } finally {
              setIsCancellingPostId(null);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const promises: Promise<any>[] = [];
      promises.push(refreshWorkerProfile());
      if (user.token) {
        promises.push(
          fetchVerificationStatus(user.token).then((data) => {
            setVerificationData(data);
            if (data?.overall_status) {
              updateUser({ verificationStatus: data.overall_status });
            }
          }).catch(() => { })
        );
        promises.push(
          fetchUserAbout(user.token).then((about) => {
            setBio(about);
            updateUser({ userAbout: about });
          }).catch(() => { })
        );
        promises.push(
          fetchReceivedReviews(user.token).then((items) => {
            setReviews(items || []);
          }).catch(() => { })
        );
        if (user.id) {
          promises.push(
            fetchReviewSummary(user.token, user.id).then((sum) => {
              if (sum) setSummary(sum);
            }).catch(() => { })
          );
        }
        promises.push(
          fetchNotifications(user.token).then((res) => {
            setUnreadNotifCount(res?.unread_count ?? 0);
          }).catch(() => { })
        );
        promises.push(
          fetchUserTags(user.token).then((userTags) => {
            setTags(userTags);
            updateUser({ userTags });
          }).catch(() => { })
        );
        promises.push(
          fetchContactPrivacy(user.token).then((show) => {
            setShowContactNumber(show);
            updateUser({ showContactNumber: show });
          }).catch(() => { })
        );
        promises.push(loadPendingPosts(true));
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
              if (requiredDocuments.every((type) => verifiedTypes.has(type))) {
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
      if (requiredDocuments.every((type) => verifiedTypes.has(type))) {
        return 'Verified';
      }
      const docStatuses = new Set(verificationData.documents.map((d) => d.verification_status));
      if (docStatuses.has('Rejected')) return 'Rejected';
      if (docStatuses.has('Pending') || verifiedTypes.size > 0) return 'Pending';
    }
    return verificationData?.overall_status || user.verificationStatus || 'Unverified';
  }, [verificationData, user.verificationStatus, role]);

  const isVerified = effectiveVerificationStatus === 'Verified' || (isWorker && user.verificationStatus === 'Verified');

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
        .catch(() => { });

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

      loadVerificationStatus();
      loadPendingPosts(false);
    }
  }, [user.token, user.id]);

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

  const handlePickImage = () => {
    Alert.alert(
      'Biometrically Verified Photo',
      'Your profile photo is verified via camera biometric liveness detection during onboarding. It cannot be altered manually from your photo gallery to maintain platform safety and trust.'
    );
  };

  return {
    avatarUri,
    onLogout,
    insets,
    language,
    setLanguage,
    t,
    getFullName,
    user,
    updateUser,
    role,
    isWorker,
    copy,
    isOnJob,
    analyticsData,
    handleToggleJobStatus,
    currentView,
    setCurrentView,
    isLanguageExpanded,
    setIsLanguageExpanded,
    localAvatar,
    reviews,
    summary,
    bio,
    setBio,
    isEditingBio,
    setIsEditingBio,
    editBioText,
    setEditBioText,
    isSavingBio,
    setIsSavingBio,
    isVerificationModalVisible,
    setIsVerificationModalVisible,
    isPasswordModalVisible,
    setIsPasswordModalVisible,
    isAboutUsModalVisible,
    setIsAboutUsModalVisible,
    isPrivacyPolicyModalVisible,
    setIsPrivacyPolicyModalVisible,
    isTermsModalVisible,
    setIsTermsModalVisible,
    isMyBookingsModalVisible,
    setIsMyBookingsModalVisible,
    verificationData,
    isLoadingVerification,
    tags,
    isManageTagsModalVisible,
    setIsManageTagsModalVisible,
    isManageSocialLinksModalVisible,
    setIsManageSocialLinksModalVisible,
    isAllReviewsModalVisible,
    setIsAllReviewsModalVisible,
    isReviewsExpanded,
    setIsReviewsExpanded,
    showContactNumber,
    isUpdatingPrivacy,
    isRefreshing,
    pendingPosts,
    isLoadingPendingPosts,
    pendingPostsError,
    activeProfileTab,
    setActiveProfileTab,
    isCancellingPostId,
    bookingsModalInitialTab,
    openMyBookings,
    loadPendingPosts,
    handleCancelPendingPost,
    handleRefresh,
    loadVerificationStatus,
    effectiveVerificationStatus,
    isVerified,
    handleSaveTags,
    handleToggleContactPrivacy,
    totalReviews,
    positivePercentage,
    handlePickImage,
  };
}

export type ProfileController = ReturnType<typeof useProfile>;
