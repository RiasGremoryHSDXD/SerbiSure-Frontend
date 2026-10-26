import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import THEME from '../theme/theme';

interface DateOfBirthPickerModalProps {
  visible: boolean;
  currentValue?: string;
  onSelect: (isoDate: string, calculatedAge: number) => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 7;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 280
const WHEEL_PADDING = ITEM_HEIGHT * 3; // 120

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getTextStyle(distance: number) {
  if (distance === 0) {
    return styles.textDistance0;
  }
  if (distance === 1) {
    return styles.textDistance1;
  }
  if (distance === 2) {
    return styles.textDistance2;
  }
  if (distance === 3) {
    return styles.textDistance3;
  }
  return styles.textDistanceFar;
}

function WheelColumn<T extends string | number>({
  data,
  selected,
  onSelect,
  flex = 1,
}: Readonly<{
  data: T[];
  selected: T;
  onSelect: (value: T) => void;
  flex?: number;
}>) {
  const listRef = useRef<FlatList<T>>(null);
  const selectedIndex = Math.max(0, data.indexOf(selected));
  const [scrollIndex, setScrollIndex] = useState(selectedIndex);
  const isInteractingRef = useRef(false);
  const isMomentumRef = useRef(false);
  const ignoreNextSyncRef = useRef(false);

  useEffect(() => {
    setScrollIndex(selectedIndex);
    if (ignoreNextSyncRef.current) {
      ignoreNextSyncRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
    }, 40);
    return () => clearTimeout(timer);
  }, [selectedIndex]);

  const commitSelection = (offsetY: number) => {
    const index = Math.max(0, Math.min(data.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
    const targetItem = data[index];
    if (targetItem !== undefined) {
      setScrollIndex(index);
      if (targetItem !== selected) {
        ignoreNextSyncRef.current = true;
        onSelect(targetItem);
      }
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(data.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
    if (index !== scrollIndex) {
      setScrollIndex(index);
    }
  };

  const handleScrollBeginDrag = () => {
    isInteractingRef.current = true;
    isMomentumRef.current = false;
  };

  const handleMomentumScrollBegin = () => {
    isMomentumRef.current = true;
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isMomentumRef.current = false;
    isInteractingRef.current = false;
    commitSelection(event.nativeEvent.contentOffset.y);
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const velocityY = event.nativeEvent.velocity?.y ?? 0;
    if (Math.abs(velocityY) > 0.05) {
      return;
    }
    setTimeout(() => {
      if (!isMomentumRef.current) {
        isInteractingRef.current = false;
        commitSelection(event.nativeEvent.contentOffset.y);
      }
    }, 50);
  };

  return (
    <View style={[styles.wheelContainer, { flex }]}>
      <FlatList
        ref={listRef}
        data={data}
        style={styles.wheel}
        contentContainerStyle={styles.wheelContent}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        initialScrollIndex={selectedIndex}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        onScrollToIndexFailed={() => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
          }, 50);
        }}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollBegin={handleMomentumScrollBegin}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const distance = Math.abs(index - scrollIndex);
          return (
            <Pressable
              style={styles.wheelItem}
              onPress={() => {
                setScrollIndex(index);
                ignoreNextSyncRef.current = true;
                onSelect(item);
                listRef.current?.scrollToIndex({ index, animated: true });
              }}
            >
              <Text style={[styles.wheelTextBase, getTextStyle(distance)]} numberOfLines={1}>
                {item}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

export function DateOfBirthPickerModal({ visible, currentValue, onSelect, onClose }: DateOfBirthPickerModalProps) {
  const insets = useSafeAreaInsets();
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 18;
  const minYear = currentYear - 85;
  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index),
    [maxYear, minYear]
  );

  const parsed = currentValue?.split('-').map(Number) ?? [];
  const initialYear = parsed[0] && parsed[0] <= maxYear && parsed[0] >= minYear ? parsed[0] : currentYear - 24;
  const initialMonth = parsed[1] && parsed[1] >= 1 && parsed[1] <= 12 ? parsed[1] : 1;
  const initialDay = parsed[2] && parsed[2] >= 1 && parsed[2] <= 31 ? parsed[2] : 1;

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(initialDay);

  const daysInMonth = useMemo(() => new Date(selectedYear, selectedMonth, 0).getDate(), [selectedYear, selectedMonth]);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, index) => index + 1), [daysInMonth]);

  useEffect(() => {
    if (!visible) return;
    const parts = currentValue?.split('-').map(Number) ?? [];
    setSelectedYear(parts[0] && parts[0] <= maxYear && parts[0] >= minYear ? parts[0] : currentYear - 24);
    setSelectedMonth(parts[1] && parts[1] >= 1 && parts[1] <= 12 ? parts[1] : 1);
    setSelectedDay(parts[2] && parts[2] >= 1 && parts[2] <= 31 ? parts[2] : 1);
  }, [visible, currentValue, currentYear, maxYear, minYear]);

  useEffect(() => {
    if (selectedDay > daysInMonth) setSelectedDay(daysInMonth);
  }, [daysInMonth, selectedDay]);

  const confirm = () => {
    const isoDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const today = new Date();
    let age = today.getFullYear() - selectedYear;
    const monthDifference = today.getMonth() + 1 - selectedMonth;
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < selectedDay)) age -= 1;
    onSelect(isoDate, age);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={confirm}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={confirm} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 22, 36) }]}>
          <View style={styles.toolbar}>
            <Pressable onPress={confirm} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}>
              <Text style={styles.next}>Next</Text>
            </Pressable>
          </View>

          <View style={styles.wheels}>
            <View pointerEvents="none" style={styles.selectionBand} />
            <WheelColumn<string>
              data={MONTHS}
              selected={MONTHS[selectedMonth - 1] ?? 'January'}
              onSelect={(month) => setSelectedMonth(MONTHS.indexOf(month) + 1)}
              flex={1.15}
            />
            <WheelColumn<number>
              data={days}
              selected={selectedDay}
              onSelect={setSelectedDay}
              flex={0.75}
            />
            <WheelColumn<number>
              data={years}
              selected={selectedYear}
              onSelect={setSelectedYear}
              flex={1.0}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    backgroundColor: '#F0F2F5',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  toolbar: {
    height: 48,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#F0F2F5',
  },
  next: {
    color: '#FFB380',
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.mainBold,
    letterSpacing: -0.2,
  },
  wheels: {
    height: WHEEL_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    position: 'relative',
    marginTop: 4,
  },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WHEEL_PADDING,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#C6C6C8',
    zIndex: 10,
  },
  wheelContainer: {
    height: WHEEL_HEIGHT,
  },
  wheel: {
    flex: 1,
    height: WHEEL_HEIGHT,
  },
  wheelContent: {
    paddingVertical: WHEEL_PADDING,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelTextBase: {
    textAlign: 'center',
    includeFontPadding: false,
    fontFamily: THEME.typography.fontFamily.mainRegular,
  },
  textDistance0: {
    color: '#000000',
    fontSize: 18,
    fontFamily: THEME.typography.fontFamily.mainBold,
  },
  textDistance1: {
    color: '#8E8E93',
    fontSize: 16.5,
    fontFamily: THEME.typography.fontFamily.mainMedium,
  },
  textDistance2: {
    color: '#AEAEB2',
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.mainRegular,
  },
  textDistance3: {
    color: '#C7C7CC',
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.mainRegular,
  },
  textDistanceFar: {
    color: '#D1D1D6',
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.mainRegular,
    opacity: 0.25,
  },
});
