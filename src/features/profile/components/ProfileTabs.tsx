import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { profileStyles as styles } from '../styles';

export function ProfileTabs({ activeTab, onChange, postsCount, reviewsCount, own = false }: Readonly<{
  activeTab: 'posts' | 'reviews'; onChange: (tab: 'posts' | 'reviews') => void;
  postsCount: number; reviewsCount: number; own?: boolean;
}>) {
  const { tr: uiText } = useUiLanguage();
  return <View style={styles.segmentedTabContainer}>
    {(['posts', 'reviews'] as const).map(tab => {
      const active = activeTab === tab;
      return <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: active }}
        style={[styles.segmentedTabButton, active && styles.segmentedTabButtonActive]} onPress={() => onChange(tab)}>
        <Text style={[styles.segmentedTabText, active && styles.segmentedTabTextActive]}>
          {tab === 'posts' ? uiText(own ? 'My Pending Posts' : 'Pending Posts') : uiText("Reviews & Feedback")}
        </Text>
        <Text style={[styles.tabBadgeText, active ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive]}>
          {tab === 'posts' ? postsCount : reviewsCount}
        </Text>
      </Pressable>;
    })}
  </View>;
}
