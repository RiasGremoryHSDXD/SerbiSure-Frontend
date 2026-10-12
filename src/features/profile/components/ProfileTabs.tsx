import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profileStyles as styles } from '../styles';

export function ProfileTabs({ activeTab, onChange, postsCount, reviewsCount, own = false }: Readonly<{
  activeTab: 'posts' | 'reviews'; onChange: (tab: 'posts' | 'reviews') => void;
  postsCount: number; reviewsCount: number; own?: boolean;
}>) {
  return <View style={styles.segmentedTabContainer}>
    {(['posts', 'reviews'] as const).map(tab => {
      const active = activeTab === tab;
      return <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: active }}
        style={[styles.segmentedTabButton, active && styles.segmentedTabButtonActive]} onPress={() => onChange(tab)}>
        <Ionicons name={tab === 'posts' ? 'newspaper-outline' : 'star-outline'} size={14} color={active ? '#C2410C' : '#6B7280'} style={{ marginRight: 6 }} />
        <Text style={[styles.segmentedTabText, active && styles.segmentedTabTextActive]}>
          {tab === 'posts' ? `${own ? 'My ' : ''}Pending Posts` : 'Reviews & Feedback'}
        </Text>
        <View style={[styles.tabBadge, active ? styles.tabBadgeActive : styles.tabBadgeInactive]}>
          <Text style={[styles.tabBadgeText, active ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive]}>{tab === 'posts' ? postsCount : reviewsCount}</Text>
        </View>
      </Pressable>;
    })}
  </View>;
}
