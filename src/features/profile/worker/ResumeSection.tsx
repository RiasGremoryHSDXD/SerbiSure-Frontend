import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';
import { WorkerCvModal } from './WorkerCvModal';

export function ResumeSection({ profile }: { profile: ProfileController }) {
  const [visible, setVisible] = useState(false);
  return <View style={styles.sectionCard}>
    <View style={styles.sectionCardHeader}><View><Text style={styles.sectionCardTitle}>Your SerbiSure CV</Text><Text style={styles.sectionCardSubtitle}>Created automatically from your saved profile</Text></View></View>
    <Pressable style={styles.emptyActionTile} onPress={() => setVisible(true)}>
      <View style={styles.emptyActionIconCircle}><Ionicons name="document-text-outline" size={22} color="#0D0D11" /></View>
      <View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.emptyActionTitle}>Preview my CV</Text><Text style={styles.emptyActionSubtitle}>Edit details, download PDF, or export CSV. No upload needed.</Text></View>
      <Ionicons name="chevron-forward" size={20} color="#0D0D11" />
    </Pressable>
    {profile.user.id && profile.user.token && <WorkerCvModal visible={visible} onClose={() => setVisible(false)} userId={profile.user.id} token={profile.user.token} editable onSaved={() => { void profile.handleRefresh(); }} />}
  </View>;
}
