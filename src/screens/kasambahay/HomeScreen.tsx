import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, Pressable, Modal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import THEME from '../../config/theme';
import { useJobsActivity } from '../../store/savedJobsStore';
import { NotificationBell } from '../../context/NotificationContext';
import { JobDetailSheet } from '../../components/JobDetailSheet';
import { API_BASE_URL, fetchWithTimeout } from '../../config/api';
import { formatBookingAddress, formatBookingLocationShort } from '../../api/bookingApi';
import { ChatDetailScreen } from '../ChatDetailScreen';

const logoSource = require('../../../assets/serbisure_new_clean.png');

interface JobOffer {
  id: string | number;
  partnerId?: string | number;
  employerName: string;
  avatar: string;
  time: string;
  location: string;
  roleTag: string;
  termTag: string;
  setupTag?: string;
  tags?: string[];
  price: string;
  unit: string;
  aboutText: string;
}

function formatTimeAgo(dateString?: string) {
  if (!dateString) return 'Recently';
  const now = new Date().getTime();
  const created = new Date(dateString).getTime();
  const diffMs = Math.max(0, now - created);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `Posted ${Math.max(1, diffMins)}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Posted ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Posted ${diffDays}d ago`;
}

interface HomeScreenProps {
  avatarUri?: string | null;
  onAvatarPress?: () => void;
  onViewProfile?: () => void;
  onViewAll?: () => void;
  token?: string | null;
}

export function HomeScreen({ avatarUri, onAvatarPress, onViewProfile, onViewAll, token }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, getFirstNameOnly } = useUser();
  const effectiveToken = token || user?.token;
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isSaved, isApplied, toggleSave, applyJob } = useJobsActivity();
  const [activeChat, setActiveChat] = useState<{
    visible: boolean;
    partnerId?: string | number;
    name: string;
    role: string;
    avatar: string;
    initialMessage?: string;
    initialReplyTo?: { author: string; text: string };
  }>({
    visible: false,
    name: '',
    role: '',
    avatar: '',
  });

  const fetchJobs = async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/feed/`, {
        headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        const liveJobs: JobOffer[] = data.map((item: any) => {
          const rawCategories = Array.isArray(item.service_category)
            ? item.service_category
            : item.service_category
            ? [item.service_category]
            : ['Household'];

          const categoryMap: Record<string, string> = {
            Cleaning: 'Cleaning',
            Child_care: 'Child Care',
            Cooking: 'Cook',
            Caregiver: 'Caregiver',
            Laundry: 'Laundry',
            'All-around': 'All-around',
          };
          const categories = rawCategories.map((c: string) => categoryMap[c] || c.replace(/_/g, ' '));
          const avatarUrl =
            item.profile_link ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Homeowner')}&background=FFB43B&color=fff`;

          const isLongTerm = item.booking_type === 'long_term';
          const termTag = isLongTerm ? 'Long-term' : 'Part-time';
          const unit = isLongTerm ? '/ month' : '/ day';

          const locShort = formatBookingLocationShort(item, 'Cagayan de Oro');
          const locForDesc = formatBookingAddress(item, 'residence');

          let description = item.special_instruction && item.special_instruction.trim()
            ? item.special_instruction.trim()
            : (isLongTerm
                ? `I am looking for ${categories.join(' & ')} at ${locForDesc}, capable of working on a stay-in setup.`
                : `I am looking for ${categories.join(' & ')} at ${locForDesc}, capable of working on a stay-out setup.`);

          const descLower = description.toLowerCase();
          const setupTag = descLower.includes('stay-in') ? 'Stay-in' : descLower.includes('stay-out') ? 'Stay-out' : (isLongTerm ? 'Stay-in' : 'Stay-out');

          return {
            id: item.booking_id,
            partnerId: item.poster_id,
            employerName: item.name || 'Homeowner',
            avatar: avatarUrl,
            time: formatTimeAgo(item.createdAt),
            location: locShort,
            roleTag: categories[0] || 'Household Service',
            termTag,
            setupTag,
            tags: ['Verified Employer', termTag, setupTag, ...categories].filter((v, i, a) => a.indexOf(v) === i),
            price: `₱${item.daily_rate || '0'}`,
            unit,
            aboutText: description,
          };
        });
        setJobs(liveJobs);
      }
    } catch (error) {
      console.warn('[HomeScreen] Failed to fetch feed', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (effectiveToken) {
      fetchJobs();
    }
  }, [effectiveToken]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchJobs();
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

    const jobRole = job.roleTag || 'Household Service';
    const jobRate = `${job.price} ${job.unit}`.trim();
    const jobLocation = job.location || 'Cagayan de Oro';
    const jobTerm = job.termTag || '';
    const replySnippet = `${jobRole} • ${jobRate} • ${jobLocation}${jobTerm ? ` • ${jobTerm}` : ''}`;

    if (job.partnerId) {
      setSelectedJob(null);
      setActiveChat({
        visible: true,
        partnerId: job.partnerId,
        name: job.employerName || 'Homeowner',
        role: 'Homeowner',
        avatar: job.avatar,
        initialMessage: 'I am interested in this job position',
        initialReplyTo: {
          author: 'Job Post',
          text: replySnippet,
        },
      });
    }
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
          <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit>Recent Posts</Text>
          <Pressable onPress={onViewAll} hitSlop={10}>
            <Text style={styles.seeAllText}>View All</Text>
          </Pressable>
        </View>

        {/* Job List */}
        <View style={styles.jobList}>
          {jobs.length === 0 && !isLoading ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="newspaper-outline" size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyStateTitle}>No Recent Posts</Text>
              <Text style={styles.emptyStateSubtitle}>
                There are no open job requests at the moment. Check back soon!
              </Text>
            </View>
          ) : (
            jobs.map((job) => {
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
          }))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Job Details Modal Sheet */}
      <JobDetailSheet
        visible={!!selectedJob}
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onApply={() => selectedJob && handleApply(selectedJob)}
        isApplied={selectedJob ? isApplied(selectedJob.id) : false}
        isSaved={selectedJob ? isSaved(selectedJob.id) : false}
        onToggleSave={() => selectedJob && toggleSave(selectedJob)}
      />

      {/* Messenger-style Chat Detail Modal */}
      <ChatDetailScreen
        visible={activeChat.visible}
        onClose={() => setActiveChat((prev) => ({ ...prev, visible: false }))}
        partnerId={activeChat.partnerId ? String(activeChat.partnerId) : undefined}
        token={effectiveToken}
        contactName={activeChat.name}
        contactRole={activeChat.role}
        contactAvatar={activeChat.avatar}
        initialMessage={activeChat.initialMessage}
        initialReplyTo={activeChat.initialReplyTo}
        userRole="kasambahay"
      />
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
  emptyStateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D0D11',
    marginBottom: 4,
    fontFamily: THEME.typography.fontFamily.display,
  },
  emptyStateSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
  },
});
