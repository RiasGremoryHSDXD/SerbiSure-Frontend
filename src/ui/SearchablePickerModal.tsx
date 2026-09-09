import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LocationItem } from '../services/locationService';

interface SearchablePickerModalProps {
  visible: boolean;
  title: string;
  items: LocationItem[];
  selectedCode?: string;
  loading?: boolean;
  searchPlaceholder?: string;
  onSelect: (item: LocationItem) => void;
  onClose: () => void;
}

export function SearchablePickerModal({
  visible,
  title,
  items,
  selectedCode,
  loading = false,
  searchPlaceholder = 'Search...',
  onSelect,
  onClose,
}: SearchablePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items using name, displayName, and aliases (e.g. 'cdo')
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      if (item.name.toLowerCase().includes(query)) return true;
      if (item.displayName && item.displayName.toLowerCase().includes(query)) return true;
      if (item.aliases && item.aliases.some((alias) => alias.includes(query) || query.includes(alias))) {
        return true;
      }
      return false;
    });
  }, [items, searchQuery]);

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const handleSelect = (item: LocationItem) => {
    setSearchQuery('');
    onSelect(item);
    onClose();
  };

  const renderItem = ({ item }: { item: LocationItem }) => {
    const isSelected = item.code === selectedCode;
    const label = item.displayName || item.name;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.itemRow,
          isSelected && styles.itemRowSelected,
          pressed && styles.itemRowPressed,
        ]}
        onPress={() => handleSelect(item)}
      >
        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]} numberOfLines={1}>
          {label}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color="#FFB43B" style={styles.checkIcon} />
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Modal Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={12}>
            <Ionicons name="close" size={24} color="#333333" />
          </Pressable>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#888888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && Platform.OS !== 'ios' && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#999999" />
            </Pressable>
          )}
        </View>

        {/* Content Body */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FFB43B" />
            <Text style={styles.loadingText}>Loading options...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="location-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? `Nothing matches "${searchQuery}"` : 'No available options'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.code}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={30}
          />
        )}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  itemRowSelected: {
    backgroundColor: '#FFF8EC',
  },
  itemRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  itemText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  itemTextSelected: {
    fontWeight: '700',
    color: '#D97706',
  },
  checkIcon: {
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
