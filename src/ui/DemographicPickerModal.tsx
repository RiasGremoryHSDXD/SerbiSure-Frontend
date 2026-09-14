import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../config/theme';

export interface DemographicOption {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface DemographicPickerModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: DemographicOption[];
  selectedValue?: string | null;
  searchPlaceholder?: string;
  allowCustomInput?: boolean;
  onSelect: (val: string) => void;
  onClose: () => void;
}

export function DemographicPickerModal({
  visible,
  title,
  subtitle,
  options,
  selectedValue,
  searchPlaceholder = 'Search...',
  allowCustomInput = false,
  onSelect,
  onClose,
}: DemographicPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [isTypingCustom, setIsTypingCustom] = useState(false);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const handleSelect = (id: string) => {
    if (id === 'OTHER_CUSTOM' && allowCustomInput) {
      setIsTypingCustom(true);
      return;
    }
    onSelect(id);
    onClose();
    setSearchQuery('');
    setIsTypingCustom(false);
  };

  const handleConfirmCustom = () => {
    if (customValue.trim()) {
      onSelect(customValue.trim());
      setCustomValue('');
      setIsTypingCustom(false);
      onClose();
    }
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
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={22} color="#4A4945" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* Custom input drawer if "Other" was clicked */}
        {isTypingCustom ? (
          <View style={styles.customInputCard}>
            <Text style={styles.customInputLabel}>Please specify:</Text>
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                placeholder="Enter custom value..."
                placeholderTextColor="#9CA3AF"
                value={customValue}
                onChangeText={setCustomValue}
                autoFocus
              />
              <Pressable
                style={[styles.customConfirmBtn, !customValue.trim() && { opacity: 0.5 }]}
                disabled={!customValue.trim()}
                onPress={handleConfirmCustom}
              >
                <Text style={styles.customConfirmBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Options List */}
        <FlatList
          data={filteredOptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedValue || item.label === selectedValue;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.optionRow,
                  isSelected && styles.optionRowSelected,
                  pressed && styles.optionRowPressed,
                ]}
                onPress={() => handleSelect(item.id)}
              >
                <View style={styles.optionLeft}>
                  <Text
                    style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {item.sublabel ? (
                    <Text style={styles.optionSublabel} numberOfLines={1}>
                      {item.sublabel}
                    </Text>
                  ) : null}
                </View>

                {item.badge ? (
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}

                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color="#0D0D11" style={styles.checkIcon} />
                )}
              </Pressable>
            );
          }}
        />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F4',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEFEA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.mainRegular,
    color: '#0D0D11',
  },
  customInputCard: {
    backgroundColor: '#F9F9F6',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEFEA',
  },
  customInputLabel: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#4A4945',
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.mainRegular,
    color: '#0D0D11',
    borderWidth: 1,
    borderColor: '#E0E0D8',
  },
  customConfirmBtn: {
    height: 42,
    paddingHorizontal: 16,
    backgroundColor: '#0D0D11',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customConfirmBtnText: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginVertical: 3,
    backgroundColor: '#FFFFFF',
  },
  optionRowSelected: {
    backgroundColor: '#F5F5F0',
  },
  optionRowPressed: {
    backgroundColor: '#F9F9F6',
  },
  optionLeft: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.mainRegular,
    color: '#2A2925',
  },
  optionLabelSelected: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#0D0D11',
  },
  optionSublabel: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.mainRegular,
    color: '#8A8985',
    marginTop: 2,
  },
  badgeWrap: {
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#E28B50',
  },
  checkIcon: {
    marginLeft: 6,
  },
});
