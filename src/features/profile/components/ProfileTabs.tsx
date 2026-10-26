import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import THEME from '../../../shared/theme/theme';

export function ProfileTabs({
  activeTab,
  onChange,
  postsCount,
  reviewsCount,
  own = false,
}: Readonly<{
  activeTab: 'posts' | 'reviews';
  onChange: (tab: 'posts' | 'reviews') => void;
  postsCount?: number;
  reviewsCount?: number;
  own?: boolean;
}>) {
  const { tr: uiText } = useUiLanguage();

  return (
    <View style={styles.tabContainer}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'posts' }}
        style={styles.tabButton}
        onPress={() => onChange('posts')}
      >
        <Text style={[styles.tabText, activeTab === 'posts' ? styles.tabTextActive : styles.tabTextInactive]}>
          {uiText(own ? 'My Recent Posts' : 'Recent Posts')}
        </Text>
        {activeTab === 'posts' && <View style={styles.activeIndicator} />}
      </Pressable>

      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'reviews' }}
        style={styles.tabButton}
        onPress={() => onChange('reviews')}
      >
        <Text style={[styles.tabText, activeTab === 'reviews' ? styles.tabTextActive : styles.tabTextInactive]}>
          {uiText("Reviews & Feedbacks")}
        </Text>
        {activeTab === 'reviews' && <View style={styles.activeIndicator} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabText: {
    fontSize: 14.5,
    fontFamily: THEME.typography.fontFamily.mainBold,
  },
  tabTextActive: {
    color: '#0D0D11',
    fontWeight: '700',
  },
  tabTextInactive: {
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1.5,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FF8A48',
    borderRadius: 2,
  },
});
