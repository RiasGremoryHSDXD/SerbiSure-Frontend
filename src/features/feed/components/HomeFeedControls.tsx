import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import THEME from '../../../shared/theme/theme';
import { useLanguage } from '../../../shared/localization/LanguageContext';
import { HOME_FEED_CATEGORIES, HomeFeedCategory } from '../feedFilters';

interface HomeFeedFiltersProps {
  placeholder: string;
  searchQuery: string;
  selectedCategory: HomeFeedCategory | null;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: HomeFeedCategory | null) => void;
}

export function HomeFeedFilters({ placeholder, searchQuery, selectedCategory, onSearchChange, onCategoryChange }: HomeFeedFiltersProps) {
  const hasActiveFilters = !!selectedCategory || !!searchQuery.trim();

  return (
    <View>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={THEME.colors.textMuted} />
        <TextInput
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          placeholderTextColor={THEME.colors.textMuted}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!searchQuery && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onSearchChange('')} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={THEME.colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories} keyboardShouldPersistTaps="handled">
        {HOME_FEED_CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.key;
          return (
            <Pressable
              key={category.label}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${category.label}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onCategoryChange(isSelected ? null : category.key)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <MaterialCommunityIcons name={category.icon} size={18} color={THEME.colors.ink} />
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>{category.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {hasActiveFilters && (
        <View style={styles.filterSummary}>
          <Text style={styles.filterSummaryText} numberOfLines={1}>
            {[selectedCategory, searchQuery.trim() ? `“${searchQuery.trim()}”` : null].filter(Boolean).join(' · ')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            hitSlop={10}
            onPress={() => { onCategoryChange(null); onSearchChange(''); }}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function HomeFeedHeader({ onViewAll }: { onViewAll?: () => void }) {
  const { t } = useLanguage();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit>Recent Posts</Text>
      {onViewAll && (
        <Pressable accessibilityRole="button" onPress={onViewAll} hitSlop={10}>
          <Text style={styles.viewAll}>{t.viewAll}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function HomeFeedLoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={THEME.colors.brandDark} />
      <Text style={styles.loadingText}>Loading recent posts...</Text>
    </View>
  );
}

export function HomeFeedEmptyState({ role, hasActiveFilters, onResetFilters }: {
  role: 'homeowner' | 'kasambahay';
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}) {
  const description = hasActiveFilters
    ? role === 'homeowner'
      ? 'No workers match your search or category. Try another search or clear your filters.'
      : 'No job requests match your search or category. Try another search or clear your filters.'
    : role === 'homeowner'
      ? 'There are no worker postings at the moment. Check back soon!'
      : 'There are no open job requests at the moment. Check back soon!';

  return (
    <View style={styles.emptyState}>
      <Ionicons name={hasActiveFilters ? 'search-outline' : 'newspaper-outline'} size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
      <Text style={styles.emptyTitle}>{hasActiveFilters ? 'No posts found' : 'No Recent Posts'}</Text>
      <Text style={styles.emptySubtitle}>{description}</Text>
      {hasActiveFilters && (
        <Pressable accessibilityRole="button" onPress={onResetFilters} style={styles.resetButton}>
          <Text style={styles.resetText}>Reset Filters</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.pill, marginHorizontal: 20, marginTop: 14,
    paddingHorizontal: 18, minHeight: 48, gap: 10,
  },
  searchInput: {
    flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 14,
    fontFamily: THEME.typography.fontFamily.bodyMedium, color: THEME.colors.ink,
  },
  categories: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 44, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: THEME.colors.white, borderRadius: THEME.roundness.pill,
  },
  chipSelected: { backgroundColor: THEME.colors.brand },
  chipLabel: { fontSize: 12.5, fontFamily: THEME.typography.fontFamily.secondaryMedium, color: THEME.colors.ink },
  chipLabelSelected: { fontFamily: THEME.typography.fontFamily.secondarySemiBold },
  filterSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 8 },
  filterSummaryText: { flex: 1, fontSize: 12, fontFamily: THEME.typography.fontFamily.secondaryMedium, color: THEME.colors.textSecondary },
  clearText: { fontSize: 12, fontFamily: THEME.typography.fontFamily.secondarySemiBold, color: THEME.colors.brandDark },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 18, marginBottom: 14 },
  sectionTitle: { flex: 1, marginRight: 12, fontSize: 22, fontFamily: THEME.typography.fontFamily.display, color: THEME.colors.ink },
  viewAll: { fontSize: 13, color: THEME.colors.brandDark, fontFamily: THEME.typography.fontFamily.secondarySemiBold },
  loading: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, color: THEME.colors.textMuted, fontFamily: THEME.typography.fontFamily.secondaryMedium },
  emptyState: { backgroundColor: THEME.colors.white, borderRadius: 24, padding: 32, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  emptyTitle: { fontSize: 16, fontFamily: THEME.typography.fontFamily.display, color: THEME.colors.ink, marginBottom: 4 },
  emptySubtitle: { fontSize: 12.5, color: '#64748B', textAlign: 'center', lineHeight: 18, fontFamily: THEME.typography.fontFamily.secondaryRegular },
  resetButton: { marginTop: 16, minHeight: 44, paddingHorizontal: 20, paddingVertical: 12, borderRadius: THEME.roundness.pill, backgroundColor: THEME.colors.brand },
  resetText: { color: THEME.colors.ink, fontSize: 12.5, fontFamily: THEME.typography.fontFamily.display },
});
