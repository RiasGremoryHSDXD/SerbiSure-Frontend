import React from 'react';
import { Text, View, Image, ScrollView, Pressable, Alert, Modal, TextInput, ActivityIndicator, RefreshControl } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { updateUserAbout } from '../api/accountApi';

import { VerificationStatusModal } from '../../verification/components/VerificationStatusModal';
import { PasswordSecurityModal } from '../components/PasswordSecurityModal';
import { AboutUsModal } from '../components/AboutUsModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { MyBookingsModal } from '../../bookings/components/MyBookingsModal';
import { ManageTagsModal } from '../components/ManageTagsModal';
import { ManageSocialLinksModal } from '../components/ManageSocialLinksModal';
import { AllReviewsModal } from '../../reviews/components/AllReviewsModal';
import { NotificationBell } from '../../notifications/NotificationContext';
import { formatRegisteredLocation } from '../../../shared/services/locationService';

import { ROLE_CONFIG } from '../../../app/roleConfig';

import type { ProfileScreenProps } from '../types';

const logoSource = require('../../../../assets/serbisure-logo.png');

import { useProfile } from '../hooks/useProfile';
import { profileStyles as styles } from '../styles';
import { BioSection } from '../components/BioSection';
import { ResumeSection } from '../worker/ResumeSection';
import { ReputationSection } from '../worker/ReputationSection';
import { AvailabilitySection } from '../worker/AvailabilitySection';
import { SettingsSection } from '../components/SettingsSection';
import { PendingPostsSection } from '../components/PendingPostsSection';
import { ReviewsSection } from '../components/ReviewsSection';

export function ProfileScreen(props: ProfileScreenProps) {
  const profile = useProfile(props);
  const {
    avatarUri,
    onLogout,
    insets,
    t,
    getFullName,
    user,
    updateUser,
    role,
    isWorker,
    copy,
    analyticsData,
    currentView,
    setCurrentView,
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
    showContactNumber,
    isUpdatingPrivacy,
    isRefreshing,
    pendingPosts,
    activeProfileTab,
    setActiveProfileTab,
    bookingsModalInitialTab,
    handleRefresh,
    loadVerificationStatus,
    effectiveVerificationStatus,
    isVerified,
    handleSaveTags,
    handleToggleContactPrivacy,
    positivePercentage,
    handlePickImage,
  } = profile;

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
            {/* Identity Hero Card (Clean Rounded Peach Neo-Pop Card) */}
            <View style={styles.personalHeroCard}>
              <Pressable style={styles.personalAvatarWrapper} onPress={handlePickImage}>
                <Image
                  source={{ uri: localAvatar || avatarUri || 'https://i.pravatar.cc/150?u=serbisure' }}
                  style={styles.personalAvatar}
                />
                <View style={[styles.cameraIconBadge, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
                </View>
              </Pressable>

              <View style={styles.personalNameRow}>
                <Text style={styles.personalName}>{getFullName()}</Text>
                {isVerified ? (
                  <Ionicons name="checkmark-circle" size={19} color="#10B981" style={{ marginLeft: 6 }} />
                ) : null}
              </View>

              <Text style={styles.heroSubRoleText}>
                {copy.name}
              </Text>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.locationText}>
                  {formatRegisteredLocation(user.street, user.city, user.province)}
                </Text>
              </View>

              {/* Email & Phone Contact Information */}
              {(user.email || user.contactNumber) ? (
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
              ) : null}

              {/* Separator Line */}
              <View style={styles.heroDividerLine} />

              {/* Worker / Client Sentiment Track */}
              <View style={styles.sentimentCard}>
                <Text style={styles.sentimentCardLabel}>{t[copy.sentimentKey]}</Text>
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
                <Text
                  style={[
                    styles.sentimentCardScore,
                    positivePercentage === null && { color: '#9CA3AF' },
                  ]}
                >
                  {positivePercentage !== null ? `${positivePercentage}% ${t.positive}` : t.noReviewsYet}
                </Text>
              </View>

              {/* Integrated Profile Tags within the Hero Card */}
              {tags && tags.length > 0 ? (
                <View style={styles.heroTagsWrap}>
                  {tags.map((tagItem, idx) => (
                    <View key={`${tagItem}-${idx}`} style={styles.heroTagPill}>
                      <Text style={styles.heroTagPillText}>{tagItem}</Text>
                    </View>
                  ))}
                  <Pressable
                    style={styles.heroTagEditBtn}
                    onPress={() => setIsManageTagsModalVisible(true)}
                    hitSlop={6}
                  >
                    <Ionicons name="pencil" size={11} color="#0D0D11" />
                    <Text style={styles.heroTagEditBtnText}>Edit</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.heroAddTagsRow}
                  onPress={() => setIsManageTagsModalVisible(true)}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#B45309" />
                  <Text style={styles.heroAddTagsText}>{copy.addTags}</Text>
                </Pressable>
              )}
            </View>

            <BioSection profile={profile} />
            {isWorker && <ResumeSection profile={profile} />}
            {isWorker && <ReputationSection profile={profile} />}
            {/* Segmented Tab Switcher (Option A) */}
            <View style={styles.segmentedTabContainer}>
              <Pressable
                style={[
                  styles.segmentedTabButton,
                  activeProfileTab === 'posts' && styles.segmentedTabButtonActive,
                ]}
                onPress={() => setActiveProfileTab('posts')}
              >
                <Ionicons
                  name="newspaper-outline"
                  size={14}
                  color={activeProfileTab === 'posts' ? '#C2410C' : '#6B7280'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.segmentedTabText,
                    activeProfileTab === 'posts' && styles.segmentedTabTextActive,
                  ]}
                >
                  My Pending Posts
                </Text>
                <View
                  style={[
                    styles.tabBadge,
                    activeProfileTab === 'posts' ? styles.tabBadgeActive : styles.tabBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      activeProfileTab === 'posts' ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive,
                    ]}
                  >
                    {pendingPosts.length}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.segmentedTabButton,
                  activeProfileTab === 'reviews' && styles.segmentedTabButtonActive,
                ]}
                onPress={() => setActiveProfileTab('reviews')}
              >
                <Ionicons
                  name="star-outline"
                  size={14}
                  color={activeProfileTab === 'reviews' ? '#C2410C' : '#6B7280'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.segmentedTabText,
                    activeProfileTab === 'reviews' && styles.segmentedTabTextActive,
                  ]}
                >
                  Reviews & Feedback
                </Text>
                <View
                  style={[
                    styles.tabBadge,
                    activeProfileTab === 'reviews' ? styles.tabBadgeActive : styles.tabBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      activeProfileTab === 'reviews' ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive,
                    ]}
                  >
                    {reviews.length}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Tab 1: Current Pending Posts */}
            {activeProfileTab === 'posts' ? <PendingPostsSection profile={profile} /> : <ReviewsSection profile={profile} />}

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
                  <View style={[styles.cameraIconBadge, { backgroundColor: '#10B981' }]}>
                    <Ionicons name="shield-checkmark" size={11} color="#FFF" />
                  </View>
                </Pressable>

                <View style={styles.heroDetails}>
                  <View style={styles.heroNameRow}>
                    <Text style={styles.heroName} numberOfLines={1}>{getFullName()}</Text>
                    {isVerified ? (
                      <Ionicons name="checkmark-circle" size={17} color="#4CAF50" style={{ marginLeft: 5, marginBottom: 2 }} />
                    ) : null}
                  </View>
                  <View style={styles.heroRolePillBadge}>
                    <Text style={styles.rolePillText}>{(user.accountType || ROLE_CONFIG[role].accountType).toUpperCase()}</Text>
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

              {isWorker && <AvailabilitySection profile={profile} />}
            </View>

            {/* Verification Notice Banner */}
            {(isWorker ? verificationData?.overall_status : effectiveVerificationStatus) === 'Pending' ? (
              <Pressable
                style={styles.verificationNoticeBanner}
                onPress={() => setIsVerificationModalVisible(true)}
              >
                <View style={styles.verificationNoticeIconBox}>
                  <Ionicons name="time" size={18} color="#B45309" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.verificationNoticeTitle}>{copy.pendingTitle}</Text>
                  <Text style={styles.verificationNoticeSub}>
                    {copy.pendingDescription}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#B45309" />
              </Pressable>
            ) : (isWorker ? verificationData?.overall_status : effectiveVerificationStatus) === 'Rejected' ? (
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

            <SettingsSection profile={profile} />
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
              {copy.bioHelp}
            </Text>

            <TextInput
              style={styles.bioTextInput}
              multiline
              maxLength={500}
              placeholder={copy.bioPlaceholder}
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
        role={role}
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
        accountType={ROLE_CONFIG[role].accountType}
        initialTab={bookingsModalInitialTab}
      />

      {/* Manage Tags Modal */}
      <ManageTagsModal
        visible={isManageTagsModalVisible}
        onClose={() => setIsManageTagsModalVisible(false)}
        currentTags={tags}
        onSave={handleSaveTags}
        accountType={user.accountType}
      />

      {/* Manage Social Links Modal */}
      <ManageSocialLinksModal
        visible={isManageSocialLinksModalVisible}
        onClose={() => setIsManageSocialLinksModalVisible(false)}
        token={user.token}
      />

      {/* All Reviews Modal */}
      <AllReviewsModal
        visible={isAllReviewsModalVisible}
        onClose={() => setIsAllReviewsModalVisible(false)}
        reviews={reviews}
        averageRating={analyticsData?.average_rating ?? summary?.average_rating}
        positivePercentage={positivePercentage}
        title={copy.reviewTitle}
      />
    </View>
  );
}

