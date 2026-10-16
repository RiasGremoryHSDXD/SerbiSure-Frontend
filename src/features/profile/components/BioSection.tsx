import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Text, View, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';

export function BioSection({ profile }: { profile: ProfileController }) {
  const { tr: uiText } = useUiLanguage();
  const {
    t,
    copy,
    bio,
    setIsEditingBio,
    setEditBioText,
  } = profile;
  return (<>
    {/* About Kasambahay Section (About Me First) */}
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
          <Text style={styles.sectionCardTitle}>{t.aboutTitle} {copy.name}</Text>
          <Text style={styles.sectionCardSubtitle}>{copy.aboutSubtitle}</Text>
        </View>
        {bio && bio !== 'No Bio' && bio.trim() !== '' ? (
          <Pressable
            style={styles.actionPillButton}
            onPress={() => {
              setEditBioText(bio);
              setIsEditingBio(true);
            }}
          >
            <Ionicons name="pencil" size={12} color="#FFFFFF" />
            <Text style={styles.actionPillButtonText}>{uiText("Edit")}</Text>
          </Pressable>
        ) : null}
      </View>

      {!bio || bio === 'No Bio' || bio.trim() === '' ? (
        <Pressable
          style={styles.emptyActionTile}
          onPress={() => {
            setEditBioText('');
            setIsEditingBio(true);
          }}
        >
          <View style={styles.emptyActionIconCircle}>
            <Ionicons name="create" size={18} color="#0D0D11" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.emptyActionTitle}>{copy.addBio}</Text>
            <Text style={styles.emptyActionSubtitle}>{copy.emptyBio}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        </Pressable>
      ) : (
        <View style={styles.bioTextContainer}>
          <Text style={styles.bioBodyText}>{bio}</Text>
        </View>
      )}
    </View>
  </>);
}
