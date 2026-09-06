import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ManageTagsModalProps {
  visible: boolean;
  onClose: () => void;
  currentTags: string[];
  onSave: (newTags: string[]) => Promise<void>;
  accountType?: string;
}

const SUGGESTIONS = [
  'Non-Smoker',
  'Respectful',
  'Pet Owner',
  'Pet Friendly',
  'Family-Oriented',
  'Organized',
  'Punctual',
  'Child Friendly',
  'Trustworthy',
  'Experienced',
  'Reliable',
  'Early Riser',
];

export function ManageTagsModal({
  visible,
  onClose,
  currentTags,
  onSave,
  accountType,
}: ManageTagsModalProps) {
  const insets = useSafeAreaInsets();
  const [tags, setTags] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTags([...(currentTags || [])]);
      setInputVal('');
      setErrorMessage(null);
    }
  }, [visible, currentTags]);

  const handleAddTag = (textToAdd?: string) => {
    setErrorMessage(null);
    const rawTag = (textToAdd !== undefined ? textToAdd : inputVal).trim();
    if (!rawTag) return;

    if (tags.length >= 10) {
      setErrorMessage('You can add up to 10 tags only.');
      return;
    }

    if (rawTag.length > 15) {
      setErrorMessage('Each tag must be 15 characters or fewer.');
      return;
    }

    // Case-insensitive duplicate check
    const isDuplicate = tags.some((t) => t.toLowerCase() === rawTag.toLowerCase());
    if (isDuplicate) {
      setErrorMessage(`"${rawTag}" is already added.`);
      return;
    }

    setTags((prev) => [...prev, rawTag]);
    if (textToAdd === undefined) {
      setInputVal('');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setErrorMessage(null);
    setTags((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      await onSave(tags);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save tags. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Profile Tags</Text>
              <Text style={styles.headerSubtitle}>
                Add tags to showcase your lifestyle, preferences, or skills ({tags.length}/10)
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={22} color="#666" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Input Row */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="pricetag-outline" size={18} color="#FFB43B" style={{ marginLeft: 12 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Type a tag (e.g. Pet Lover)"
                  placeholderTextColor="#9CA3AF"
                  value={inputVal}
                  onChangeText={(val) => {
                    setInputVal(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  maxLength={15}
                  returnKeyType="done"
                  onSubmitEditing={() => handleAddTag()}
                />
                <Text style={styles.charCount}>{inputVal.length}/15</Text>
              </View>

              <Pressable
                style={[
                  styles.addBtn,
                  (!inputVal.trim() || tags.length >= 10) && styles.addBtnDisabled,
                ]}
                onPress={() => handleAddTag()}
                disabled={!inputVal.trim() || tags.length >= 10}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Current Tags */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionHeading}>Your Current Tags</Text>
                <Text style={styles.tagCounterText}>{tags.length} of 10 max</Text>
              </View>

              {tags.length === 0 ? (
                <View style={styles.emptyTagsBox}>
                  <Ionicons name="pricetags-outline" size={28} color="#D1D5DB" />
                  <Text style={styles.emptyTagsText}>No tags added yet.</Text>
                  <Text style={styles.emptyTagsSub}>
                    Create custom tags above or select from quick suggestions below.
                  </Text>
                </View>
              ) : (
                <View style={styles.tagsChipContainer}>
                  {tags.map((tag, idx) => (
                    <View key={`${tag}-${idx}`} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{tag}</Text>
                      <Pressable
                        style={styles.removeTagBtn}
                        onPress={() => handleRemoveTag(idx)}
                        hitSlop={6}
                      >
                        <Ionicons name="close-circle" size={16} color="#B45309" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Suggested Tags */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>Quick Suggestions</Text>
              <Text style={styles.suggestionsSub}>Tap to quickly add to your profile:</Text>

              <View style={styles.suggestionsContainer}>
                {SUGGESTIONS.map((sug) => {
                  const alreadyAdded = tags.some((t) => t.toLowerCase() === sug.toLowerCase());
                  return (
                    <Pressable
                      key={sug}
                      style={[
                        styles.suggestionPill,
                        alreadyAdded && styles.suggestionPillAdded,
                      ]}
                      onPress={() => {
                        if (alreadyAdded) {
                          const idx = tags.findIndex((t) => t.toLowerCase() === sug.toLowerCase());
                          if (idx !== -1) handleRemoveTag(idx);
                        } else {
                          handleAddTag(sug);
                        }
                      }}
                      disabled={!alreadyAdded && tags.length >= 10}
                    >
                      <Ionicons
                        name={alreadyAdded ? 'checkmark' : 'add'}
                        size={14}
                        color={alreadyAdded ? '#059669' : '#4B5563'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.suggestionPillText,
                          alreadyAdded && styles.suggestionPillTextAdded,
                        ]}
                      >
                        {sug}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsFooter}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Save Tags</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
    marginRight: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB43B',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
  },
  addBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  sectionBlock: {
    marginTop: 16,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFB43B',
  },
  emptyTagsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyTagsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 6,
  },
  emptyTagsSub: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 3,
  },
  tagsChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginRight: 6,
  },
  removeTagBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsSub: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    marginTop: 2,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  suggestionPillAdded: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  suggestionPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  suggestionPillTextAdded: {
    color: '#065F46',
    fontWeight: '600',
  },
  actionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#FFB43B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB43B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
