import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
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
  readonly filtersVisible: boolean;
  readonly onFiltersToggle: () => void;
}

export function BrowseHeader({ title, name, avatarUri, tab, savedCount, appliedCount, onTabChange, onProfilePress, filtersVisible, onFiltersToggle }: HeaderProps) {
  const { tr: uiText } = useUiLanguage();
  const tabs: { key: BrowseTab; label: string; count?: number }[] = [{ key: 'explore', label: 'Explore' }, { key: 'saved', label: 'Saved', count: savedCount }];
  if (appliedCount !== undefined) tabs.push({ key: 'applied', label: 'Applied', count: appliedCount });
  const isKasambahay = appliedCount !== undefined;
  return (
    <View style={styles.card}>
      <View style={[styles.tabs, isKasambahay && styles.tabsKasambahay]} accessibilityRole="tablist">
        {tabs.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.key }}
            onPress={() => onTabChange(item.key)}
            style={[styles.tab, isKasambahay && styles.tabKasambahay, tab === item.key && styles.selectedTab]}
          >
            <Text
              style={[
                styles.tabLabel,
                isKasambahay && styles.tabLabelKasambahay,
                tab === item.key && styles.selectedTabLabel,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {uiText(item.label)}{item.count && item.count > 0 ? ` (${item.count})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.headingRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={uiText("Open your profile")} onPress={onProfilePress} disabled={!onProfilePress}>
          <ProfileAvatar uri={avatarUri} name={name} size={48} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{uiText(title)}</Text>
        </View>
        {tab === 'explore' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText(filtersVisible ? "Hide quick filters" : "Show quick filters")}
            accessibilityState={{ expanded: filtersVisible }}
            onPress={onFiltersToggle}
            style={styles.filterButton}
            hitSlop={8}
          >
            <Ionicons name="options-outline" size={24} color={THEME.colors.ink} />
          </Pressable>
        ) : (
          <View style={styles.filterButtonPlaceholder} />
        )}
      </View>
    </View>
  );
}

export function BrowseFilters({ activeChip, filterCount, onChipPress, onFilterPress }: Readonly<{ activeChip: string; filterCount: number; onChipPress: (label: string) => void; onFilterPress: () => void }>) {
  const { tr: uiText } = useUiLanguage();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open filters, ${filterCount} active`} onPress={onFilterPress} style={[styles.chip, styles.advancedChip]}>
        <Ionicons name="funnel-outline" size={16} color={THEME.colors.ink} />
        <Text style={styles.advancedLabel}>{uiText("Filters")}{filterCount > 0 ? ` (${filterCount})` : ''}</Text>
      </Pressable>
      {BROWSE_QUICK_FILTERS.map((label) => (
        <Pressable key={label} accessibilityRole="button" accessibilityLabel={`Filter: ${label}`} accessibilityState={{ selected: activeChip === label }} onPress={() => onChipPress(label)} style={[styles.chip, activeChip === label ? styles.selectedChip : styles.unselectedChip]}>
          <Text style={[styles.chipLabel, activeChip === label && styles.selectedChipLabel]}>{uiText(label)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: THEME.colors.white, marginHorizontal: 20, marginBottom: 8, borderRadius: 28, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14 },
  tabs: { flexDirection: 'row', backgroundColor: '#ECECEE', borderRadius: 24, padding: 4, marginHorizontal: 8, marginBottom: 10 },
  tabsKasambahay: { marginHorizontal: 2 },
  tab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 20, paddingHorizontal: 6 },
  tabKasambahay: { paddingHorizontal: 2 },
  selectedTab: { backgroundColor: '#0D0D11' },
  tabLabel: { fontSize: 14, fontFamily: THEME.typography.fontFamily.display, color: '#71717A' },
  tabLabelKasambahay: { fontSize: 12 },
  selectedTabLabel: { color: THEME.colors.white },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 18, lineHeight: 22, fontFamily: THEME.typography.fontFamily.display, color: '#0D0D11' },
  filterButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  filterButtonPlaceholder: { width: 40, height: 40 },
  chipScroll: { marginBottom: 4, flexGrow: 0 },
  chips: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  chip: { minHeight: 38, paddingHorizontal: 16, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  unselectedChip: { backgroundColor: THEME.colors.white },
  selectedChip: { backgroundColor: '#FFAA77' },
  advancedChip: { backgroundColor: '#FFAA77' },
  advancedLabel: { fontSize: 13, fontFamily: THEME.typography.fontFamily.secondarySemiBold, color: '#0D0D11' },
  chipLabel: { fontSize: 13, fontFamily: THEME.typography.fontFamily.secondaryMedium, color: '#0D0D11' },
  selectedChipLabel: { fontFamily: THEME.typography.fontFamily.secondarySemiBold, color: '#0D0D11' },
});
