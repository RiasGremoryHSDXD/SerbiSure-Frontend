import React, { useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileAvatar } from '../../../shared/ui/ProfileAvatar';
import THEME from '../../../shared/theme/theme';

interface CardProps {
  readonly name: string;
  readonly avatarUri?: string | null;
  readonly authorRole: 'Homeowner' | 'Kasambahay';
  readonly title: string;
  readonly location: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly price: string;
  readonly unit: string;
  readonly saved: boolean;
  readonly applied?: boolean;
  readonly onProfilePress: () => void;
  readonly onSave: () => void;
  readonly onDetails: () => void;
}

export function BrowsePostCard({ name, avatarUri, authorRole, title, location, description, tags, price, unit, saved, applied, onProfilePress, onSave, onDetails }: CardProps) {
  const displayTags = Array.from(new Set(tags.filter((tag) => !tag.startsWith('Verified')))).slice(0, 3);
  const workerPost = authorRole === 'Kasambahay';
  return (
    <View style={styles.card}>
      <PhotoSurface uri={avatarUri} name={name}>
        <View style={styles.overlay}>
          <View style={styles.identityRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={`View ${name}'s profile`} onPress={onProfilePress} style={styles.profilePill}>
              <ProfileAvatar uri={avatarUri} name={name} size={20} />
              <Text style={styles.profileLabel} numberOfLines={1}>{workerPost ? 'View Profile' : name}</Text>
              <Ionicons name="information-circle-outline" size={14} color={THEME.colors.brand} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Unsave post' : 'Save post'} accessibilityState={{ selected: saved }} onPress={onSave} style={styles.bookmark} hitSlop={8}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? THEME.colors.brandDark : THEME.colors.ink} />
            </Pressable>
          </View>
          <View>
            <Pressable accessibilityRole="button" onPress={workerPost ? onProfilePress : onDetails}>
              <Text style={styles.title} numberOfLines={2}>{workerPost ? name : title}</Text>
            </Pressable>
            <View style={styles.locationRow}><Ionicons name="location-outline" size={14} color={THEME.colors.brand} /><Text style={styles.location} numberOfLines={1}>{location}</Text></View>
            {workerPost && <Text style={styles.serviceTitle} numberOfLines={1}>{title}</Text>}
            <Text style={styles.description} numberOfLines={2}>{description}</Text>
            <View style={styles.tags}>{displayTags.map((tag) => <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}</View>
            <View style={styles.footer}>
              <View style={styles.rate}><Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit>{price}</Text><Text style={styles.unit}>{unit}</Text></View>
              <Pressable accessibilityRole="button" onPress={onDetails} style={[styles.details, applied && styles.applied]}><Text style={[styles.detailsLabel, applied && styles.appliedLabel]}>{applied ? 'Applied' : 'See Details'}</Text></Pressable>
            </View>
          </View>
        </View>
      </PhotoSurface>
    </View>
  );
}

function PhotoSurface({ uri, name, children }: Readonly<{ uri?: string | null; name: string; children: React.ReactNode }>) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const photoUri = uri?.trim();
  if (photoUri && photoUri !== failedUri) {
    return <ImageBackground source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" accessibilityLabel={`${name}'s profile photo`} onError={() => setFailedUri(photoUri)}>{children}</ImageBackground>;
  }
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
  return <View style={styles.photo}><View style={styles.photoPlaceholder} pointerEvents="none"><Text style={styles.initials}>{initials}</Text></View>{children}</View>;
}

export function BrowseCardBackdrop({ avatarUri, name }: Readonly<{ avatarUri?: string | null; name: string }>) {
  return <View style={styles.card}><PhotoSurface uri={avatarUri} name={name}><View style={styles.backdropOverlay} /></PhotoSurface></View>;
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: THEME.colors.ink },
  photo: { flex: 1, width: '100%', height: '100%', backgroundColor: THEME.colors.inkSubtle },
  photoPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 88, color: THEME.colors.brand, fontFamily: THEME.typography.fontFamily.display },
  backdropOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  overlay: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.42)', paddingVertical: 18, paddingHorizontal: 28 },
  identityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  profilePill: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 6, borderRadius: THEME.roundness.pill, backgroundColor: 'rgba(0,0,0,0.5)' },
  profileLabel: { flexShrink: 1, fontSize: 12, color: THEME.colors.white, fontFamily: THEME.typography.fontFamily.display },
  bookmark: { width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, lineHeight: 28, color: THEME.colors.white, fontFamily: THEME.typography.fontFamily.display, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  location: { flex: 1, fontSize: 13, color: THEME.colors.brand, fontFamily: THEME.typography.fontFamily.secondaryMedium },
  serviceTitle: { fontSize: 12, lineHeight: 16, color: THEME.colors.white, fontFamily: THEME.typography.fontFamily.secondarySemiBold, marginBottom: 4 },
  description: { fontSize: 12, lineHeight: 16, color: THEME.colors.white, fontFamily: THEME.typography.fontFamily.secondaryRegular, marginBottom: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { color: THEME.colors.ink, fontSize: 10, fontFamily: THEME.typography.fontFamily.secondaryMedium },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  rate: { flex: 1 },
  price: { fontSize: 18, fontFamily: THEME.typography.fontFamily.display, color: THEME.colors.white },
  unit: { fontSize: 11, color: THEME.colors.white, opacity: 0.85, fontFamily: THEME.typography.fontFamily.secondaryRegular },
  details: { minHeight: 44, borderRadius: THEME.roundness.pill, backgroundColor: THEME.colors.brand, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  detailsLabel: { color: THEME.colors.ink, fontSize: 12, fontFamily: THEME.typography.fontFamily.display },
  applied: { backgroundColor: THEME.colors.successLight },
  appliedLabel: { color: THEME.colors.success },
});
