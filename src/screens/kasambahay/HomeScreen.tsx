import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, Pressable, Modal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import THEME from '../../config/theme';
import { useJobsActivity } from '../../store/savedJobsStore';
import { NotificationBell } from '../../context/NotificationContext';

const logoSource = require('../../../assets/serbisure_new_clean.png');

interface JobOffer {
  id: number;
  employerName: string;
  avatar: string;
  time: string;
  location: string;
  roleTag: string;
  termTag: string;
  price: string;
  unit: string;
  aboutText: string;
}

const MOCK_JOBS: JobOffer[] = [
  {
    id: 1,
    employerName: 'Joshua Asucal',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    time: 'Posted 1h ago',
    location: 'Brgy. Pagatpat, CDO',
    roleTag: 'Cook',
    termTag: 'Long-term',
    price: '₱15,000',
    unit: '/ month',
    aboutText: 'Experienced cook for daily meal preparation — breakfast, lunch & dinner. Comfortable with Filipino and simple Western dishes. Available Mon–Sat.',
  },
  {
    id: 2,
    employerName: 'Camille Prats',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300',
    time: 'Posted 2h ago',
    location: 'Makati City',
    roleTag: 'Cleaner',
    termTag: 'Short-term',
    price: '₱2,500',
    unit: '/ service',
    aboutText: 'Deep cleaning needed for 2-bedroom condo unit. Includes vacuuming, scrubbing bathrooms, wiping down kitchen cabinets, and washing windows.',
  },
  {
    id: 3,
    employerName: 'Sabrina Reyes',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300',
    time: 'Posted 5h ago',
    location: 'Quezon City',
    roleTag: 'Yaya / Nanny',
    termTag: 'Long-term',
    price: '₱8,000',
    unit: '/ month',
    aboutText: 'Caring nanny for a 2-year-old child. Responsible for feeding, playing, bathing, and light nursery cleanup. Experience with toddlers preferred.',
  },
];

export function HomeScreen({ avatarUri, onAvatarPress, onViewProfile }: { avatarUri?: string | null; onAvatarPress?: () => void; onViewProfile?: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { getFirstNameOnly } = useUser();
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isSaved, isApplied, toggleSave, applyJob } = useJobsActivity();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApply = (job: JobOffer) => {
    applyJob({
      id: job.id,
      employerName: job.employerName,
      avatar: job.avatar,
      time: job.time,
      location: job.location,
      roleTag: job.roleTag,
      termTag: job.termTag,
      price: job.price,
      unit: job.unit,
      aboutText: job.aboutText,
    });
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

  return (
    <View style={styles.container}>
      {/* Top Status Bar Spacer */}
      <View style={{ height: insets.top, backgroundColor: '#F6F5F2', zIndex: 10 }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F6F5F2' }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#FFB43B']}
            tintColor="#FFB43B"
            progressViewOffset={0}
          />
        }
      >
        {/* Header Logo & Bell */}
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <NotificationBell />
          </View>
        </View>

        {/* Greeting Card */}
        <View style={styles.greetingCard}>
          <Pressable onPress={onAvatarPress}>
            <Image
              source={{ uri: avatarUri || 'https://i.pravatar.cc/150?u=serbisure' }}
              style={styles.avatar}
            />
          </Pressable>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.dateText}>{dateString}</Text>
            <Text style={styles.greetingText} numberOfLines={1} adjustsFontSizeToFit>{t.greeting}, {getFirstNameOnly()}!</Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit>{t.popularServices}</Text>
          <Text style={styles.seeAllText}>{t.viewAll}</Text>
        </View>

        {/* Job List */}
        <View style={styles.jobList}>
          {MOCK_JOBS.map((job) => {
            const applied = isApplied(job.id);
            const saved = isSaved(job.id);

            return (
              <Pressable key={job.id} style={styles.jobCard} onPress={() => setSelectedJob(job)}>
                <View style={styles.jobHeader}>
                  <Pressable onPress={onViewProfile}>
                    <Image source={{ uri: job.avatar }} style={styles.employerAvatar} />
                  </Pressable>
                  <View style={styles.jobEmployerInfo}>
                    <Pressable style={styles.nameRow} onPress={onViewProfile}>
                      <Text style={styles.employerName}>{job.employerName}</Text>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginLeft: 4 }} />
                    </Pressable>
                    <Text style={styles.postTime}>{job.time}</Text>

                    <View style={styles.tagsRow}>
                      <View style={[styles.tagBadge, styles.tagRole]}>
                        <Text style={styles.tagRoleText}>{job.roleTag}</Text>
                      </View>
                      <View style={[styles.tagBadge, styles.tagTerm]}>
                        <Text style={styles.tagTermText}>{job.termTag}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Bookmark Icon in Top Right Corner */}
                  <Pressable
                    style={styles.bookmarkBtn}
                    onPress={() => toggleSave({
                      id: job.id,
                      employerName: job.employerName,
                      avatar: job.avatar,
                      time: job.time,
                      location: job.location,
                      roleTag: job.roleTag,
                      termTag: job.termTag,
                      price: job.price,
                      unit: job.unit,
                      aboutText: job.aboutText,
                    })}
                    hitSlop={10}
                  >
                    <Ionicons
                      name={saved ? "bookmark" : "bookmark-outline"}
                      size={22}
                      color={THEME.colors.ink}
                    />
                  </Pressable>
                </View>

                <View style={styles.divider} />

                <View style={styles.jobFooter}>
                  <Text style={styles.priceText}>
                    {job.price} <Text style={styles.unitText}>{job.unit}</Text>
                  </Text>

                  <Pressable
                    style={[styles.seeDetailsBtn, applied && styles.seeDetailsBtnApplied]}
                    onPress={() => setSelectedJob(job)}
                  >
                    <Text style={[styles.seeDetailsText, applied && styles.seeDetailsTextApplied]}>
                      {applied ? 'Applied' : 'See Details'}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Job Details Modal Sheet */}
      <Modal visible={!!selectedJob} transparent animationType="slide" onRequestClose={() => setSelectedJob(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedJob(null)} />
          {selectedJob && (
            <View style={styles.sheetContent}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <Image source={{ uri: selectedJob.avatar }} style={styles.sheetAvatar} />
                <View style={styles.sheetTitleInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.sheetEmployerName}>{selectedJob.employerName}</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={styles.sheetLocation}>
                    <Ionicons name="location-sharp" size={12} color="#666" /> {selectedJob.location}
                  </Text>
                  <View style={styles.sheetTagRow}>
                    <View style={[styles.tagBadge, styles.tagRole]}>
                      <Text style={styles.tagRoleText}>{selectedJob.roleTag}</Text>
                    </View>
                    <Text style={styles.sheetPostTime}>{selectedJob.time}</Text>
                  </View>
                </View>
              </View>

              {/* Price & Term */}
              <View style={styles.sheetPriceRow}>
                <Text style={styles.sheetPrice}>
                  {selectedJob.price} <Text style={styles.sheetUnit}>{selectedJob.unit}</Text>
                </Text>
                <View style={[styles.tagBadge, styles.tagTerm]}>
                  <Text style={styles.tagTermText}>{selectedJob.termTag}</Text>
                </View>
              </View>

              {/* About this role */}
              <View style={styles.aboutBox}>
                <Text style={styles.aboutTitle}>ABOUT THIS ROLE</Text>
                <Text style={styles.aboutBody}>{selectedJob.aboutText}</Text>
              </View>

              {/* Feedback summary */}
              <Text style={styles.feedbackTitle}>Worker Feedback Summary</Text>
              <View style={styles.feedbackRow}>
                <View style={[styles.feedbackCard, styles.feedbackPositive]}>
                  <Text style={[styles.feedbackValue, { color: '#00875A' }]}>72%</Text>
                  <Text style={[styles.feedbackLabel, { color: '#00875A' }]}>Positive</Text>
                </View>
                <View style={[styles.feedbackCard, styles.feedbackNeutral]}>
                  <Text style={[styles.feedbackValue, { color: '#5E6C84' }]}>18%</Text>
                  <Text style={[styles.feedbackLabel, { color: '#5E6C84' }]}>Neutral</Text>
                </View>
                <View style={[styles.feedbackCard, styles.feedbackNegative]}>
                  <Text style={[styles.feedbackValue, { color: '#DE350B' }]}>10%</Text>
                  <Text style={[styles.feedbackLabel, { color: '#DE350B' }]}>Negative</Text>
                </View>
              </View>

              {/* Compliance banner */}
              <View style={styles.complianceBox}>
                <Ionicons name="information-circle" size={18} color="#7C3AED" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.complianceText}>
                  SerbiSure enforces fair wage compliance (₱9,000 meets RTWPB-10 minimum). Our Booking Frequency Cap prevents illegal misclassification of regular work as short-term gigs.
                </Text>
              </View>

              {/* Apply button */}
              <Pressable
                style={({ pressed }) => [
                  styles.applyNowBtn,
                  isApplied(selectedJob.id) && styles.applyNowBtnDone,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => handleApply(selectedJob)}
              >
                <Text style={styles.applyNowText}>
                  {isApplied(selectedJob.id) ? 'Application Submitted' : 'Apply Now'}
                </Text>
              </Pressable>
              <Text style={styles.applyNotice}>Your application goes directly to the employer</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    width: '100%',
  },
  headerSide: {
    width: 44,
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 44,
    height: 44,
  },
  greetingCard: {
    backgroundColor: THEME.colors.white,
    marginHorizontal: 20,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  greetingTextContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 10.5,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: THEME.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  greetingText: {
    fontSize: 19,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 14,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginRight: 12,
  },
  seeAllText: {
    flexShrink: 0,
    fontSize: 13,
    color: THEME.colors.brandDark,
    fontFamily: THEME.typography.fontFamily.secondarySemiBold,
  },
  jobList: {
    paddingHorizontal: 20,
  },
  jobCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.card,
    padding: 18,
    marginBottom: 14,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  employerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  jobEmployerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employerName: {
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  postTime: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.roundness.pill,
  },
  tagRole: {
    backgroundColor: THEME.colors.ink,
  },
  tagRoleText: {
    color: THEME.colors.white,
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
  },
  tagTerm: {
    backgroundColor: THEME.colors.brandLight,
  },
  tagTermText: {
    color: THEME.colors.brandDark,
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondarySemiBold,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.divider,
    marginVertical: 14,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 20,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  unitText: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
  },
  quickApplyBtn: {
    backgroundColor: THEME.colors.brand,
    borderRadius: THEME.roundness.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickApplyBtnDone: {
    backgroundColor: '#E8F8EE',
  },
  quickApplyText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.display,
  },
  quickApplyTextDone: {
    color: '#10B981',
  },
  // Modal Sheet
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  sheetTitleInfo: {
    flex: 1,
  },
  sheetEmployerName: {
    fontSize: 18,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  sheetLocation: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
    marginVertical: 2,
  },
  sheetTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetPostTime: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
  },
  sheetPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetPrice: {
    fontSize: 28,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  sheetUnit: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
  },
  aboutBox: {
    backgroundColor: THEME.colors.brandLight,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  aboutTitle: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.brandDark,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  aboutBody: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.ink,
    lineHeight: 20,
  },
  feedbackTitle: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginBottom: 8,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  feedbackCard: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 0,
  },
  feedbackPositive: {
    backgroundColor: '#E8F8EE',
  },
  feedbackNeutral: {
    backgroundColor: '#F4F5F7',
  },
  feedbackNegative: {
    backgroundColor: '#FEE2E2',
  },
  feedbackValue: {
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
  },
  feedbackLabel: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    marginTop: 2,
  },
  complianceBox: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.canvas,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  complianceText: {
    flex: 1,
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
    lineHeight: 15,
  },
  applyNowBtn: {
    backgroundColor: THEME.colors.ink,
    borderRadius: THEME.roundness.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  applyNowBtnDone: {
    backgroundColor: '#10B981',
  },
  applyNowText: {
    color: THEME.colors.white,
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.display,
  },
  bookmarkBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeDetailsBtn: {
    backgroundColor: THEME.colors.brand,
    borderRadius: THEME.roundness.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeDetailsBtnApplied: {
    backgroundColor: '#E8F8EE',
  },
  seeDetailsText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.display,
  },
  seeDetailsTextApplied: {
    color: '#10B981',
  },
  applyNotice: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
});
