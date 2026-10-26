import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Text, View, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';
import { updateUserAbout } from '../api/accountApi';

export function BioSection({ profile }: { profile: ProfileController }) {
  const { tr: uiText } = useUiLanguage();
  const {
    t,
    copy,
    bio,
    setBio,
    isEditingBio,
    setIsEditingBio,
    editBioText,
    setEditBioText,
    isSavingBio,
    setIsSavingBio,
    user,
    updateUser,
  } = profile;

  const handleStartEdit = () => {
    setEditBioText(bio && bio !== 'No Bio' ? bio : '');
    setIsEditingBio(true);
  };

  const handleCancelEdit = () => {
    setEditBioText(bio && bio !== 'No Bio' ? bio : '');
    setIsEditingBio(false);
  };

  const handleSaveBio = async () => {
    if (!user.token) {
      Alert.alert(uiText('Error'), uiText('You must be logged in to update your bio.'));
      return;
    }
    setIsSavingBio(true);
    try {
      const updated = await updateUserAbout(user.token, editBioText.trim());
      setBio(updated);
      updateUser({ userAbout: updated });
      setIsEditingBio(false);
    } catch (err: any) {
      Alert.alert(uiText('Unable to Save Bio'), err?.message || uiText('Failed to update bio.'));
    } finally {
      setIsSavingBio(false);
    }
  };

  const hasBio = Boolean(bio && bio !== 'No Bio' && bio.trim() !== '');

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
          <Text style={styles.sectionCardTitle}>{t.aboutTitle} {copy.name}</Text>
        </View>
        {!isEditingBio && (
          <Pressable
            style={styles.actionPillButton}
            onPress={handleStartEdit}
            accessibilityRole="button"
            accessibilityLabel={uiText("Edit")}
          >
            <Ionicons name="pencil" size={12} color="#FFFFFF" />
            <Text style={styles.actionPillButtonText}>{uiText("Edit")}</Text>
          </Pressable>
        )}
      </View>

      {isEditingBio ? (
        <View style={styles.inlineBioEditContainer}>
          <TextInput
            style={styles.inlineBioTextInput}
            multiline
            maxLength={500}
            placeholder={copy.bioPlaceholder}
            placeholderTextColor="#9CA3AF"
            value={editBioText}
            onChangeText={setEditBioText}
            textAlignVertical="top"
            autoFocus
          />
          <View style={styles.inlineBioFooterRow}>
            <Text style={styles.charCountText}>{editBioText.length}/500</Text>
            <View style={styles.inlineBioActionButtons}>
              <Pressable
                style={styles.cancelInlineBtn}
                disabled={isSavingBio}
                onPress={handleCancelEdit}
                accessibilityRole="button"
              >
                <Text style={styles.cancelInlineBtnText}>{uiText("Cancel")}</Text>
              </Pressable>
              <Pressable
                style={[styles.saveInlineBtn, isSavingBio && { opacity: 0.7 }]}
                disabled={isSavingBio}
                onPress={handleSaveBio}
                accessibilityRole="button"
              >
                {isSavingBio ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveInlineBtnText}>{uiText("Save")}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      ) : hasBio ? (
        <View style={styles.bioTextContainer}>
          <Text style={styles.bioBodyText}>{bio}</Text>
        </View>
      ) : (
        <Pressable style={styles.emptyBioRow} onPress={handleStartEdit}>
          <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
          <Text style={styles.emptyBioItalicText}>{uiText("No bio provided yet.")}</Text>
        </Pressable>
      )}
    </View>
  );
}
