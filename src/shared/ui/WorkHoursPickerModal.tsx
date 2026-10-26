import React, { useEffect, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import THEME from '../theme/theme';

interface WorkHoursPickerModalProps {
  visible: boolean;
  currentValue?: string;
  onSelect: (workHours: string) => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 7;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 280
const WHEEL_PADDING = ITEM_HEIGHT * 3; // 120

const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

function getTextStyle(distance: number) {
  if (distance === 0) return styles.textDistance0;
  if (distance === 1) return styles.textDistance1;
  if (distance === 2) return styles.textDistance2;
  if (distance === 3) return styles.textDistance3;
  return styles.textDistanceFar;
}

function WheelColumn<T extends string>({
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
    if (Math.abs(velocityY) > 0.05) return;
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
        keyExtractor={item => String(item)}
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

function parseTimeParts(val?: string) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(val?.trim() || '');
  if (match) {
    return {
      startH: String(Number(match[1])),
      startM: match[2]!,
      startP: match[3]!.toUpperCase(),
      endH: String(Number(match[4])),
      endM: match[5]!,
      endP: match[6]!.toUpperCase(),
    };
  }
  return {
    startH: '8',
    startM: '00',
    startP: 'AM',
    endH: '5',
    endM: '00',
    endP: 'PM',
  };
}

function toMinutes(h: string, m: string, p: string) {
  let hour = Number(h) % 12;
  if (p === 'PM') hour += 12;
  return hour * 60 + Number(m);
}

export function WorkHoursPickerModal({
  visible,
  currentValue,
  onSelect,
  onClose,
}: WorkHoursPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');
  const [startHour, setStartHour] = useState('8');
  const [startMinute, setStartMinute] = useState('00');
  const [startPeriod, setStartPeriod] = useState('AM');
  const [endHour, setEndHour] = useState('5');
  const [endMinute, setEndMinute] = useState('00');
  const [endPeriod, setEndPeriod] = useState('PM');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!visible) return;
    const initial = parseTimeParts(currentValue);
    setStartHour(initial.startH);
    setStartMinute(initial.startM);
    setStartPeriod(initial.startP);
    setEndHour(initial.endH);
    setEndMinute(initial.endM);
    setEndPeriod(initial.endP);
    setActiveTab('start');
    setErrorMsg('');
  }, [visible, currentValue]);

  const handleNextOrDone = () => {
    if (activeTab === 'start') {
      setActiveTab('end');
      return;
    }

    const startTotal = toMinutes(startHour, startMinute, startPeriod);
    const endTotal = toMinutes(endHour, endMinute, endPeriod);
    if (startTotal >= endTotal) {
      setErrorMsg('End time must be after start time.');
      return;
    }

    const startFormatted = `${startHour.padStart(2, '0')}:${startMinute} ${startPeriod}`;
    const endFormatted = `${endHour.padStart(2, '0')}:${endMinute} ${endPeriod}`;
    onSelect(`${startFormatted} - ${endFormatted}`);
    onClose();
  };

  const curHour = activeTab === 'start' ? startHour : endHour;
  const curMinute = activeTab === 'start' ? startMinute : endMinute;
  const curPeriod = activeTab === 'start' ? startPeriod : endPeriod;

  const handleSelectHour = (h: string) => {
    setErrorMsg('');
    if (activeTab === 'start') setStartHour(h);
    else setEndHour(h);
  };

  const handleSelectMinute = (m: string) => {
    setErrorMsg('');
    if (activeTab === 'start') setStartMinute(m);
    else setEndMinute(m);
  };

  const handleSelectPeriod = (p: string) => {
    setErrorMsg('');
    if (activeTab === 'start') setStartPeriod(p);
    else setEndPeriod(p);
  };

  const startDisplay = `${startHour.padStart(2, '0')}:${startMinute} ${startPeriod}`;
  const endDisplay = `${endHour.padStart(2, '0')}:${endMinute} ${endPeriod}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 22, 36) }]}>
          {/* Toolbar */}
          <View style={styles.toolbar}>
            <Pressable onPress={handleNextOrDone} hitSlop={{ top: 12, bottom: 12, left: 18, right: 18 }}>
              <Text style={styles.actionBtn}>{activeTab === 'start' ? 'Next' : 'Done'}</Text>
            </Pressable>
          </View>

          {/* Start / End Tab Switcher */}
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabBtn, activeTab === 'start' && styles.tabBtnActive]}
              onPress={() => {
                setErrorMsg('');
                setActiveTab('start');
              }}
            >
              <Text style={[styles.tabLabel, activeTab === 'start' && styles.tabLabelActive]}>
                Start Time
              </Text>
              <Text style={[styles.tabValue, activeTab === 'start' && styles.tabValueActive]}>
                {startDisplay}
              </Text>
            </Pressable>

            <Ionicons name="arrow-forward" size={16} color="#8E8E93" />

            <Pressable
              style={[styles.tabBtn, activeTab === 'end' && styles.tabBtnActive]}
              onPress={() => {
                setErrorMsg('');
                setActiveTab('end');
              }}
            >
              <Text style={[styles.tabLabel, activeTab === 'end' && styles.tabLabelActive]}>
                End Time
              </Text>
              <Text style={[styles.tabValue, activeTab === 'end' && styles.tabValueActive]}>
                {endDisplay}
              </Text>
            </Pressable>
          </View>

          {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          {/* Wheels */}
          <View style={styles.wheels}>
            <View pointerEvents="none" style={styles.selectionBand} />
            <WheelColumn<string>
              data={HOURS}
              selected={curHour}
              onSelect={handleSelectHour}
              flex={1}
            />
            <WheelColumn<string>
              data={MINUTES}
              selected={curMinute}
              onSelect={handleSelectMinute}
              flex={1}
            />
            <WheelColumn<string>
              data={PERIODS}
              selected={curPeriod}
              onSelect={handleSelectPeriod}
              flex={1}
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#F0F2F5',
  },
  actionBtn: {
    color: '#FFB380',
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnActive: {
    backgroundColor: '#FFB380',
    borderWidth: 0,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: '#000000',
  },
  tabValue: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  tabValueActive: {
    color: '#000000',
    fontWeight: '800',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  wheels: {
    height: WHEEL_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
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
    fontSize: 20,
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontWeight: '700',
  },
  textDistance1: {
    color: '#8E8E93',
    fontSize: 17,
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
