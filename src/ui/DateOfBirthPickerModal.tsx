import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../config/theme';

interface DateOfBirthPickerModalProps {
  visible: boolean;
  currentValue?: string; // YYYY-MM-DD
  onSelect: (isoDate: string, calculatedAge: number) => void;
  onClose: () => void;
}

const MONTHS = [
  { value: 1, name: 'January', short: 'Jan' },
  { value: 2, name: 'February', short: 'Feb' },
  { value: 3, name: 'March', short: 'Mar' },
  { value: 4, name: 'April', short: 'Apr' },
  { value: 5, name: 'May', short: 'May' },
  { value: 6, name: 'June', short: 'Jun' },
  { value: 7, name: 'July', short: 'Jul' },
  { value: 8, name: 'August', short: 'Aug' },
  { value: 9, name: 'September', short: 'Sep' },
  { value: 10, name: 'October', short: 'Oct' },
  { value: 11, name: 'November', short: 'Nov' },
  { value: 12, name: 'December', short: 'Dec' },
];

export function DateOfBirthPickerModal({
  visible,
  currentValue,
  onSelect,
  onClose,
}: DateOfBirthPickerModalProps) {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 18; // Strict legal working age (min 18 years old)
  const minYear = currentYear - 85;

  // Generate Year list from maxYear down to minYear
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [maxYear, minYear]);

  // Initial State Setup
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (currentValue) {
      const parts = currentValue.split('-');
      const y = parseInt(parts[0] ?? '', 10);
      if (!isNaN(y) && y <= maxYear && y >= minYear) return y;
    }
    return currentYear - 24; // Default to ~24 years old
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (currentValue) {
      const parts = currentValue.split('-');
      const m = parseInt(parts[1] ?? '', 10);
      if (!isNaN(m) && m >= 1 && m <= 12) return m;
    }
    return 1;
  });

  const [selectedDay, setSelectedDay] = useState<number>(() => {
    if (currentValue) {
      const parts = currentValue.split('-');
      const d = parseInt(parts[2] ?? '', 10);
      if (!isNaN(d) && d >= 1 && d <= 31) return d;
    }
    return 1;
  });

  useEffect(() => {
    if (currentValue) {
      const parts = currentValue.split('-');
      const y = parseInt(parts[0] ?? '', 10);
      const m = parseInt(parts[1] ?? '', 10);
      const d = parseInt(parts[2] ?? '', 10);
      if (!isNaN(y) && y <= maxYear && y >= minYear) setSelectedYear(y);
      if (!isNaN(m) && m >= 1 && m <= 12) setSelectedMonth(m);
      if (!isNaN(d) && d >= 1 && d <= 31) setSelectedDay(d);
    }
  }, [currentValue, maxYear, minYear]);

  // Calculate days in selected month and year
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Dynamic Day list for the current month/year
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Idiot-proof auto-clamping (e.g. Feb 30 -> Feb 28/29)
  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [daysInMonth, selectedDay]);

  // Live Age Calculation
  const liveAge = useMemo(() => {
    const today = new Date();
    let age = today.getFullYear() - selectedYear;
    const m = today.getMonth() + 1 - selectedMonth;
    if (m < 0 || (m === 0 && today.getDate() < selectedDay)) {
      age--;
    }
    return age;
  }, [selectedYear, selectedMonth, selectedDay]);

  const monthName = useMemo(() => {
    return MONTHS.find((m) => m.value === selectedMonth)?.name || 'January';
  }, [selectedMonth]);

  const handleConfirm = () => {
    const formattedMonth = String(selectedMonth).padStart(2, '0');
    const formattedDay = String(selectedDay).padStart(2, '0');
    const isoDate = `${selectedYear}-${formattedMonth}-${formattedDay}`;
    onSelect(isoDate, liveAge);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Select Date of Birth</Text>
            <Text style={styles.headerSubtitle}>Must be at least 18 years old</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={22} color="#4A4945" />
          </Pressable>
        </View>

        {/* Live Selection Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>Selected Birth Date</Text>
            <Text style={styles.summaryDateText}>
              {monthName} {selectedDay}, {selectedYear}
            </Text>
          </View>
          <View style={styles.ageBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.ageBadgeText}>{liveAge} yrs old</Text>
          </View>
        </View>

        {/* 3-Column Wheel Selectors */}
        <View style={styles.selectorContainer}>
          {/* Column 1: Month */}
          <View style={styles.columnWrapper}>
            <Text style={styles.columnHeader}>Month</Text>
            <FlatList
              data={MONTHS}
              keyExtractor={(item) => `m-${item.value}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedMonth;
                return (
                  <Pressable
                    style={[styles.itemPill, isSelected && styles.itemPillSelected]}
                    onPress={() => setSelectedMonth(item.value)}
                  >
                    <Text style={[styles.itemText, isSelected && styles.itemTextSelected]} numberOfLines={1}>
                      {item.short}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>

          {/* Column 2: Day */}
          <View style={styles.columnWrapper}>
            <Text style={styles.columnHeader}>Day</Text>
            <FlatList
              data={days}
              keyExtractor={(item) => `d-${item}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item === selectedDay;
                return (
                  <Pressable
                    style={[styles.itemPill, isSelected && styles.itemPillSelected]}
                    onPress={() => setSelectedDay(item)}
                  >
                    <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>

          {/* Column 3: Year */}
          <View style={[styles.columnWrapper, { flex: 1.2 }]}>
            <Text style={styles.columnHeader}>Year</Text>
            <FlatList
              data={years}
              keyExtractor={(item) => `y-${item}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item === selectedYear;
                return (
                  <Pressable
                    style={[styles.itemPill, isSelected && styles.itemPillSelected]}
                    onPress={() => setSelectedYear(item)}
                  >
                    <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Set Date of Birth</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0EC',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#0D0D11',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.mainRegular,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F6',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEA',
  },
  summaryLeft: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.mainMedium,
    color: '#8A8985',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryDateText: {
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#0D0D11',
    marginTop: 2,
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
  },
  ageBadgeText: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#059669',
  },
  selectorContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  columnWrapper: {
    flex: 1,
    backgroundColor: '#F9F9F6',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#EFEFEA',
  },
  columnHeader: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#4A4945',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  listContent: {
    paddingVertical: 4,
  },
  itemPill: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 3,
    backgroundColor: 'transparent',
  },
  itemPillSelected: {
    backgroundColor: '#0D0D11',
  },
  itemText: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.mainRegular,
    color: '#2A2925',
  },
  itemTextSelected: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0EC',
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#4A4945',
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0D0D11',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#FFFFFF',
  },
});
