import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileAvatar } from '../../../shared/ui/ProfileAvatar';
import THEME from '../../../shared/theme/theme';
import { BROWSE_QUICK_FILTERS, type BrowseTab } from '../browsePresentation';

interface HeaderProps {
  readonly title: string;
  readonly subtitle: string;
  readonly name: string;
  readonly avatarUri?: string | null;
  readonly tab: BrowseTab;
  readonly savedCount: number;
  readonly appliedCount?: number;
  readonly onTabChange: (tab: BrowseTab) => void;
  readonly onProfilePress?: () => void;
  readonly onFilterPress: () => void;
}

export function BrowseHeader({ title, subtitle, name, avatarUri, tab, savedCount, appliedCount, onTabChange, onProfilePress, onFilterPress }: HeaderProps) {
  const tabs: { key: BrowseTab; label: string; count?: number }[] = [{ key: 'explore', label: 'Explore' }, { key: 'saved', label: 'Saved', count: savedCount }];
  if (appliedCount !== undefined) tabs.push({ key: 'applied', label: 'Applied', count: appliedCount });
  return (
    <View style={styles.card}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {tabs.map((item) => (
          <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => onTabChange(item.key)} style={[styles.tab, tab === item.key && styles.selectedTab]}>
            <Text style={[styles.tabLabel, tab === item.key && styles.selectedTabLabel]}>{item.label}{item.count === undefined ? '' : ` (${item.count})`}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.headingRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={onProfilePress} disabled={!onProfilePress}>
          <ProfileAvatar uri={avatarUri} name={name} size={48} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {tab === 'explore' && <Pressable accessibilityRole="button" accessibilityLabel="Open filters and sorting" onPress={onFilterPress} style={styles.filterButton}><Ionicons name="options-outline" size={22} color={THEME.colors.ink} /></Pressable>}
      </View>
    </View>
  );
}

export function BrowseFilters({ activeChip, filterCount, onChipPress, onFilterPress }: Readonly<{ activeChip: string; filterCount: number; onChipPress: (label: string) => void; onFilterPress: () => void }>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open filters, ${filterCount} active`} onPress={onFilterPress} style={[styles.chip, styles.advancedChip]}>
        <Ionicons name="funnel-outline" size={16} color={THEME.colors.brandDark} />
        <Text style={styles.advancedLabel}>Filters{filterCount > 0 ? ` (${filterCount})` : ''}</Text>
      </Pressable>
      {BROWSE_QUICK_FILTERS.map((label) => (
        <Pressable key={label} accessibilityRole="button" accessibilityLabel={`Filter: ${label}`} accessibilityState={{ selected: activeChip === label }} onPress={() => onChipPress(label)} style={[styles.chip, activeChip === label && styles.selectedChip]}>
          <Text style={styles.chipLabel}>{label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: THEME.colors.white, marginHorizontal: 20, marginBottom: 16, borderRadius: THEME.roundness.card, padding: 16 },
  tabs: { flexDirection: 'row', backgroundColor: THEME.colors.canvas, borderRadius: THEME.roundness.pill, padding: 4, marginBottom: 16 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: THEME.roundness.pill, paddingHorizontal: 4 },
  selectedTab: { backgroundColor: THEME.colors.ink },
  tabLabel: { fontSize: 12, fontFamily: THEME.typography.fontFamily.display, color: THEME.colors.textSecondary },
  selectedTabLabel: { color: THEME.colors.white },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: { flex: 1 },
  title: { fontSize: 20, fontFamily: THEME.typography.fontFamily.display, color: THEME.colors.ink },
  subtitle: { fontSize: 12, lineHeight: 18, fontFamily: THEME.typography.fontFamily.secondaryRegular, color: THEME.colors.textSecondary, marginTop: 3 },
  filterButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: THEME.colors.canvas, alignItems: 'center', justifyContent: 'center' },
  chipScroll: { marginBottom: 8, flexGrow: 0 },
  chips: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: THEME.roundness.pill, backgroundColor: THEME.colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  selectedChip: { backgroundColor: THEME.colors.brand },
  advancedChip: { backgroundColor: THEME.colors.brandLight },
  advancedLabel: { fontSize: 13, fontFamily: THEME.typography.fontFamily.secondarySemiBold, color: THEME.colors.brandDark },
  chipLabel: { fontSize: 13, fontFamily: THEME.typography.fontFamily.secondaryMedium, color: THEME.colors.ink },
});
