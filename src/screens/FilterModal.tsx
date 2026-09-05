import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface FeedFilters {
  categories: string[];
  bookingType: string | null; // 'short_term' | 'long_term' | null
  maxRate: number | null;
  location: string;
  sortBy: 'newest' | 'rate_asc' | 'rate_desc';
}

export const DEFAULT_FILTERS: FeedFilters = {
  categories: [],
  bookingType: null,
  maxRate: null,
  location: '',
  sortBy: 'newest',
};

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FeedFilters) => void;
  initialFilters?: FeedFilters;
  mode: 'homeowner' | 'kasambahay';
}

const CATEGORY_OPTIONS = [
  'Cleaning',
  'Cooking',
  'Child Care',
  'Caregiver',
  'Laundry',
  'All-around',
];

const BOOKING_TYPES = [
  { label: 'All Types', value: null },
  { label: 'Part-time', value: 'short_term' },
  { label: 'Stay-in', value: 'long_term' },
];

const RATE_PRESETS = [500, 800, 1200, 2000];

const SORT_OPTIONS: { label: string; value: 'newest' | 'rate_asc' | 'rate_desc'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Newest First', value: 'newest', icon: 'time-outline' },
  { label: 'Lowest Rate', value: 'rate_asc', icon: 'arrow-down-outline' },
  { label: 'Highest Rate', value: 'rate_desc', icon: 'arrow-up-outline' },
];

export function FilterModal({
  visible,
  onClose,
  onApply,
  initialFilters = DEFAULT_FILTERS,
  mode,
}: FilterModalProps) {
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<string[]>(initialFilters.categories || []);
  const [bookingType, setBookingType] = useState<string | null>(initialFilters.bookingType || null);
  const [maxRate, setMaxRate] = useState<number | null>(initialFilters.maxRate || null);
  const [customRateText, setCustomRateText] = useState<string>(
    initialFilters.maxRate ? String(initialFilters.maxRate) : ''
  );
  const [location, setLocation] = useState<string>(initialFilters.location || '');
  const [sortBy, setSortBy] = useState<'newest' | 'rate_asc' | 'rate_desc'>(
    initialFilters.sortBy || 'newest'
  );

  // Sync state when modal is opened with new initialFilters
  useEffect(() => {
    if (visible) {
      setCategories(initialFilters.categories || []);
      setBookingType(initialFilters.bookingType || null);
      setMaxRate(initialFilters.maxRate || null);
      setCustomRateText(initialFilters.maxRate ? String(initialFilters.maxRate) : '');
      setLocation(initialFilters.location || '');
      setSortBy(initialFilters.sortBy || 'newest');
    }
  }, [visible, initialFilters]);

  const toggleCategory = (cat: string) => {
    setCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  const handleRatePreset = (rate: number) => {
    if (maxRate === rate) {
      setMaxRate(null);
      setCustomRateText('');
    } else {
      setMaxRate(rate);
      setCustomRateText(String(rate));
    }
  };

  const handleCustomRateChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomRateText(cleaned);
    if (cleaned === '') {
      setMaxRate(null);
    } else {
      setMaxRate(parseInt(cleaned, 10));
    }
  };

  const handleReset = () => {
    setCategories([]);
    setBookingType(null);
    setMaxRate(null);
    setCustomRateText('');
    setLocation('');
    setSortBy('newest');
  };

  const activeFilterCount =
    categories.length +
    (bookingType !== null ? 1 : 0) +
    (maxRate !== null ? 1 : 0) +
    (location.trim() !== '' ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0);

  const handleApply = () => {
    onApply({
      categories,
      bookingType,
      maxRate,
      location: location.trim(),
      sortBy,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Drag Bar Indicator */}
            <View style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="funnel" size={20} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.title}>Filter & Sort</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color="#666" />
              </Pressable>
            </View>

            {/* Subtitle / context */}
            <Text style={styles.subtitle}>
              {mode === 'homeowner'
                ? 'Filter available Kasambahay workers to match your household needs.'
                : 'Filter available job posts and service requests from homeowners.'}
            </Text>

            {/* Scrollable Filter Body */}
            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* SECTION: Service Category */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>SERVICE CATEGORY</Text>
                  {categories.length > 0 && (
                    <Pressable onPress={() => setCategories([])}>
                      <Text style={styles.clearSectionText}>Clear</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.chipGrid}>
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = categories.includes(cat);
                    return (
                      <Pressable
                        key={cat}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => toggleCategory(cat)}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark' : 'add'}
                          size={14}
                          color={isSelected ? '#FFFFFF' : '#666666'}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* SECTION: Booking Type */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>BOOKING TYPE</Text>
                <View style={styles.toggleRow}>
                  {BOOKING_TYPES.map((bt) => {
                    const isSelected = bookingType === bt.value;
                    return (
                      <Pressable
                        key={String(bt.value)}
                        style={[styles.toggleBtn, isSelected && styles.toggleBtnActive]}
                        onPress={() => setBookingType(bt.value)}
                      >
                        <Text
                          style={[styles.toggleBtnText, isSelected && styles.toggleBtnTextActive]}
                        >
                          {bt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* SECTION: Maximum Daily Rate */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>MAXIMUM RATE (PER DAY)</Text>
                  {maxRate !== null && (
                    <Pressable
                      onPress={() => {
                        setMaxRate(null);
                        setCustomRateText('');
                      }}
                    >
                      <Text style={styles.clearSectionText}>Any Rate</Text>
                    </Pressable>
                  )}
                </View>

                {/* Quick Presets */}
                <View style={styles.ratePresetsRow}>
                  {RATE_PRESETS.map((rate) => {
                    const isSelected = maxRate === rate;
                    return (
                      <Pressable
                        key={rate}
                        style={[styles.rateChip, isSelected && styles.rateChipActive]}
                        onPress={() => handleRatePreset(rate)}
                      >
                        <Text style={[styles.rateChipText, isSelected && styles.rateChipTextActive]}>
                          ≤ ₱{rate}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Custom Rate Input */}
                <View style={styles.inputBox}>
                  <Text style={styles.currencyPrefix}>₱</Text>
                  <TextInput
                    style={styles.rateInput}
                    placeholder="Enter custom max budget"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={customRateText}
                    onChangeText={handleCustomRateChange}
                  />
                  {customRateText !== '' && (
                    <Pressable
                      onPress={() => {
                        setCustomRateText('');
                        setMaxRate(null);
                      }}
                    >
                      <Ionicons name="close-circle" size={18} color="#999" />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* SECTION: Location Search */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>LOCATION / BARANGAY</Text>
                  {location.trim() !== '' && (
                    <Pressable onPress={() => setLocation('')}>
                      <Text style={styles.clearSectionText}>Clear</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.inputBox}>
                  <Ionicons name="location-outline" size={18} color="#FFB43B" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.locationInput}
                    placeholder="e.g. Carmen, Nazareth, Macasandig..."
                    placeholderTextColor="#999"
                    value={location}
                    onChangeText={setLocation}
                    returnKeyType="done"
                  />
                  {location !== '' && (
                    <Pressable onPress={() => setLocation('')}>
                      <Ionicons name="close-circle" size={18} color="#999" />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* SECTION: Sort By */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SORT RESULTS BY</Text>
                <View style={styles.sortContainer}>
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = sortBy === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[styles.sortRow, isSelected && styles.sortRowActive]}
                        onPress={() => setSortBy(opt.value)}
                      >
                        <View style={styles.sortRowLeft}>
                          <Ionicons
                            name={opt.icon}
                            size={18}
                            color={isSelected ? '#FFB43B' : '#666'}
                            style={{ marginRight: 10 }}
                          />
                          <Text style={[styles.sortLabel, isSelected && styles.sortLabelActive]}>
                            {opt.label}
                          </Text>
                        </View>
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={isSelected ? '#FFB43B' : '#CCC'}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Sticky Action Footer */}
            <View style={styles.footer}>
              <Pressable style={styles.resetButton} onPress={handleReset}>
                <Ionicons name="refresh-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                <Text style={styles.resetButtonText}>Reset All</Text>
              </Pressable>

              <Pressable style={styles.applyButton} onPress={handleApply}>
                <Text style={styles.applyButtonText}>
                  Apply Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetWrapper: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.88,
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2A2925',
  },
  badge: {
    backgroundColor: '#FFB43B',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#F2F2F2',
  },
  subtitle: {
    fontSize: 13,
    color: '#777777',
    marginBottom: 14,
    lineHeight: 18,
  },
  scrollBody: {
    maxHeight: SCREEN_HEIGHT * 0.58,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
  },
  clearSectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFB43B',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7F6F2',
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  chipActive: {
    backgroundColor: '#FFB43B',
    borderColor: '#FFB43B',
  },
  chipText: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F2EE',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777777',
  },
  toggleBtnTextActive: {
    color: '#2A2925',
    fontWeight: '700',
  },
  ratePresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  rateChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F7F6F2',
    borderWidth: 1,
    borderColor: '#E8E6DF',
    alignItems: 'center',
  },
  rateChipActive: {
    backgroundColor: '#FFF7EB',
    borderColor: '#FFB43B',
  },
  rateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  rateChipTextActive: {
    color: '#FFB43B',
    fontWeight: '700',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    paddingHorizontal: 14,
    height: 46,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
    marginRight: 6,
  },
  rateInput: {
    flex: 1,
    fontSize: 14,
    color: '#2A2925',
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: '#2A2925',
  },
  sortContainer: {
    backgroundColor: '#FBFBFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEFEA',
    overflow: 'hidden',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFEA',
  },
  sortRowActive: {
    backgroundColor: '#FFFBF5',
  },
  sortRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },
  sortLabelActive: {
    color: '#2A2925',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F3F2EE',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#FFB43B',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB43B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
