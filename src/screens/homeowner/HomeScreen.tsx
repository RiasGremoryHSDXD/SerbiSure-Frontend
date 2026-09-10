import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TextInput, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import THEME from '../../config/theme';
import { NotificationBell } from '../../context/NotificationContext';

const logoSource = require('../../../assets/serbisure_new_clean.png');

export function HomeScreen({ avatarUri, onAvatarPress, onViewProfile }: { avatarUri?: string | null, onAvatarPress?: () => void, onViewProfile?: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { getFirstNameOnly } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
    } finally {
      setIsRefreshing(false);
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

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={THEME.colors.textMuted} style={styles.searchIcon} />
          <TextInput 
            placeholder={t.searchPlaceholder}
            placeholderTextColor={THEME.colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        {/* Categories Grid */}
        <View style={styles.categoriesContainer}>
          <CategoryItem icon="face-woman-outline" label="Child Care" />
          <CategoryItem icon="silverware-fork-knife" label="Cook" />
          <CategoryItem icon="broom" label="Cleaner" />
          <CategoryItem icon="washing-machine" label="Laundry" />
        </View>

        {/* Top Rated Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit>{t.popularServices}</Text>
          <Text style={styles.seeAllText}>{t.viewAll}</Text>
        </View>

        <View style={styles.workerList}>
          <WorkerCard 
            name="Liza Soriano"
            role="Baby Sitter"
            years="5 years"
            rating="4.9"
            reviews="(159 reviews)"
            time="Posted 3h ago"
            avatar="https://i.pravatar.cc/150?u=liza"
            onViewProfile={onViewProfile}
          />
          <WorkerCard 
            name="Bald Seki"
            role="Cook"
            years="3 years"
            rating="4.7"
            reviews="(121 reviews)"
            time="Posted 10h ago"
            avatar="https://i.pravatar.cc/150?u=bald"
            onViewProfile={onViewProfile}
          />
        </View>

        {/* Bottom padding to account for floating tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// Subcomponents

function CategoryItem({ icon, label }: { icon: any, label: string }) {
  return (
    <View style={styles.categoryItem}>
      <MaterialCommunityIcons name={icon} size={28} color="#0D0D11" />
      <Text style={styles.categoryLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </View>
  );
}

function WorkerCard({ name, role, years, rating, reviews, time, avatar, onViewProfile }: any) {
  return (
    <View style={styles.workerCard}>
      <Pressable style={styles.workerHeader} onPress={onViewProfile}>
        <Image source={{ uri: avatar }} style={styles.workerAvatar} />
        <View style={styles.workerInfo}>
          <View style={styles.workerNameRow}>
            <Text style={styles.workerName}>{name}</Text>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginLeft: 4 }} />
          </View>
          <Text style={styles.workerRole}>{role} • {years}</Text>
          <View style={styles.workerRatingRow}>
            <Ionicons name="star" size={12} color="#FFB43B" />
            <Text style={styles.workerRating}>{rating} <Text style={styles.workerReviews}>{reviews}</Text></Text>
          </View>
        </View>
        <Text style={styles.workerTime}>{time}</Text>
      </Pressable>
      <Pressable style={styles.viewProfileBtn} onPress={onViewProfile}>
        <Text style={styles.viewProfileText}>View Profile</Text>
      </Pressable>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.pill,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 18,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.bodyMedium,
    color: THEME.colors.ink,
  },
  categoriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  categoryItem: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: 22,
    padding: 6,
  },
  categoryLabel: {
    marginTop: 6,
    fontSize: 10.5,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: THEME.colors.ink,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
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
  workerList: {
    paddingHorizontal: 20,
  },
  workerCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.card,
    padding: 18,
    marginBottom: 14,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  workerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  workerInfo: {
    flex: 1,
  },
  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  workerName: {
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  workerRole: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  workerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerRating: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginLeft: 4,
  },
  workerReviews: {
    color: THEME.colors.textMuted,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
  },
  workerTime: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  viewProfileBtn: {
    backgroundColor: '#E5E7EB',
    borderRadius: THEME.roundness.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewProfileText: {
    color: '#0D0D11',
    fontFamily: THEME.typography.fontFamily.display,
    fontSize: 13,
  },
});
