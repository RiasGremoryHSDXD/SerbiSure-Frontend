import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileAvatar } from '../../../shared/ui/ProfileAvatar';
import THEME from '../../../shared/theme/theme';
import type { SavedJobItem } from '../../bookings/store/savedJobsStore';

interface ActivityProps {
  readonly post: SavedJobItem;
  readonly applied?: boolean;
  readonly closed?: boolean;
  readonly onProfile: () => void;
  readonly onDetails: () => void;
  readonly onUnsave?: () => void;
  readonly onMessage?: () => void;
}

export function BrowseActivityCard({ post, applied, closed, onProfile, onDetails, onUnsave, onMessage }: ActivityProps) {
  const tags = [post.roleTag, post.termTag].filter((tag): tag is string => !!tag);
  return (
    <View style={styles.card}>
      <View style={styles.identityRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`View ${post.employerName}'s profile`} onPress={onProfile}><ProfileAvatar uri={post.avatar} name={post.employerName} size={48} /></Pressable>
        <Pressable onPress={onProfile} style={styles.identity}><Text style={styles.name} numberOfLines={2}>{post.employerName}</Text><Text style={styles.location} numberOfLines={1}>{post.location || 'Location not provided'}</Text></Pressable>
        {onUnsave && <Pressable accessibilityRole="button" accessibilityLabel="Unsave post" onPress={onUnsave} style={styles.bookmark}><Ionicons name="bookmark" size={22} color={THEME.colors.brandDark} /></Pressable>}
      </View>
      <Pressable onPress={onDetails} accessibilityRole="button">
        <Text style={styles.subject} numberOfLines={2}>{post.title || post.roleTag || 'Household Service'}</Text>
      </Pressable>
      <View style={styles.tags}>{tags.map((tag) => <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}</View>
      {applied && <Text style={[styles.status, closed && styles.closed]}>{closed ? 'Position filled' : 'Application sent'}</Text>}
      <View style={styles.footer}>
        <View style={styles.rate}><Text style={styles.price}>{post.price}</Text><Text style={styles.unit}>{post.unit}</Text></View>
        <View style={styles.actions}>
          {onMessage && <Pressable accessibilityRole="button" accessibilityLabel={`Message ${post.employerName}`} onPress={onMessage} style={styles.message}><Ionicons name="chatbubble-ellipses-outline" size={19} color={THEME.colors.ink} /></Pressable>}
          <Pressable accessibilityRole="button" onPress={onDetails} style={styles.details}><Text style={styles.detailsLabel}>See Details</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, backgroundColor: THEME.colors.white, borderRadius: THEME.roundness.card },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identity: { flex: 1 },
  name: { color: THEME.colors.ink, fontSize: 16, fontFamily: THEME.typography.fontFamily.display },
  location: { fontSize: 11, color: THEME.colors.textSecondary, fontFamily: THEME.typography.fontFamily.secondaryRegular, marginTop: 4 },
  bookmark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  subject: { fontSize: 17, color: THEME.colors.ink, fontFamily: THEME.typography.fontFamily.display, marginTop: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: THEME.colors.brandLight, borderRadius: THEME.roundness.pill, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 10, color: THEME.colors.brandDark, fontFamily: THEME.typography.fontFamily.secondaryMedium },
  status: { marginTop: 12, color: THEME.colors.success, fontSize: 11, fontFamily: THEME.typography.fontFamily.secondarySemiBold },
  closed: { color: THEME.colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: THEME.colors.divider, marginTop: 14, paddingTop: 14 },
  rate: { flex: 1 },
  price: { color: THEME.colors.success, fontSize: 18, fontFamily: THEME.typography.fontFamily.display },
  unit: { color: THEME.colors.textSecondary, fontSize: 11, fontFamily: THEME.typography.fontFamily.secondaryRegular },
  actions: { flexDirection: 'row', gap: 8 },
  message: { width: 44, height: 44, borderRadius: 22, backgroundColor: THEME.colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  details: { minHeight: 44, paddingHorizontal: 16, borderRadius: THEME.roundness.pill, backgroundColor: THEME.colors.brand, alignItems: 'center', justifyContent: 'center' },
  detailsLabel: { color: THEME.colors.ink, fontSize: 12, fontFamily: THEME.typography.fontFamily.display },
});
