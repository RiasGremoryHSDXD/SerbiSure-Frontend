import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../../shared/theme/theme';
import type { Role } from '../../../app/roleConfig';
import { browseEmptyCopy } from '../browsePresentation';

export function BrowseDeckEmpty({ role, fetchedCount, hasFilters, error, onRefresh, onClearFilters }: Readonly<{ role: Role; fetchedCount: number; hasFilters: boolean; error?: string | null; onRefresh: () => void; onClearFilters: () => void }>) {
  const copy = browseEmptyCopy(role, fetchedCount, hasFilters, error);
  const clearFilters = !error && fetchedCount === 0 && hasFilters;
  return <BrowseEmptyState icon={copy.icon} title={copy.title} description={copy.description} action={copy.action} onAction={clearFilters ? onClearFilters : onRefresh} />;
}

export function BrowseEmptyState({ icon, title, description, action, onAction }: Readonly<{ icon: keyof typeof Ionicons.glyphMap; title: string; description: string; action: string; onAction: () => void }>) {
  const { tr: uiText } = useUiLanguage();
  return (
    <View style={styles.empty}>
      <View style={styles.iconCircle}><Ionicons name={icon} size={36} color={THEME.colors.brandDark} /></View>
      <Text style={styles.title}>{uiText(title)}</Text>
      <Text style={styles.description}>{uiText(description)}</Text>
      <Pressable accessibilityRole="button" onPress={onAction} style={styles.button}><Text style={styles.buttonText}>{uiText(action)}</Text></Pressable>
    </View>
  );
}

export function BrowseDeckSkeleton() {
  const { tr: uiText } = useUiLanguage();
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return (
    <Animated.View style={[styles.skeleton, { opacity }]} accessibilityLabel={uiText("Loading posts")}>
      <View style={styles.skeletonIdentity}><View style={styles.skeletonAvatar} /><View style={[styles.bar, { flex: 1 }]} /></View>
      <View style={[styles.bar, { width: '75%', height: 24 }]} />
      <View style={styles.bar} /><View style={[styles.bar, { width: '85%' }]} />
      <View style={[styles.bar, { height: 44, marginTop: 'auto' }]} />
    </Animated.View>
  );
}

export function BrowseDeckSwipeControls({ role, dragX, onSkip, onInterested }: Readonly<{ role: Role; dragX: Animated.Value; onSkip: () => void; onInterested: () => void }>) {
  const { tr: uiText } = useUiLanguage();
  const passBackground = dragX.interpolate({ inputRange: [-150, -20, 0], outputRange: ['#E53935', '#FFEBEE', '#FFFFFF'], extrapolate: 'clamp' });
  const interestedBackground = dragX.interpolate({ inputRange: [0, 20, 150], outputRange: ['#FFFFFF', '#E8F5E9', '#4CD964'], extrapolate: 'clamp' });
  const passHighlight = dragX.interpolate({ inputRange: [-120, -15, 0], outputRange: [1, 0.4, 0], extrapolate: 'clamp' });
  const interestedHighlight = dragX.interpolate({ inputRange: [0, 15, 120], outputRange: [0, 0.4, 1], extrapolate: 'clamp' });
  return (
    <View style={styles.edgeControls} pointerEvents="box-none">
      <Pressable accessibilityRole="button" accessibilityLabel={uiText("Skip this post")} onPress={onSkip} hitSlop={8}>
        <Animated.View style={[styles.edgeButton, { backgroundColor: passBackground }]}>
          <Ionicons name="close" size={18} color="#E53935" />
          <Animated.View pointerEvents="none" style={[styles.edgeHighlight, { opacity: passHighlight }]}><Ionicons name="close" size={18} color={THEME.colors.white} /></Animated.View>
        </Animated.View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={role === 'kasambahay' ? uiText("Apply to this job") : uiText("Message this kasambahay")} onPress={onInterested} hitSlop={8}>
        <Animated.View style={[styles.edgeButton, { backgroundColor: interestedBackground }]}>
          <Ionicons name="heart-outline" size={18} color="#22C55E" />
          <Animated.View pointerEvents="none" style={[styles.edgeHighlight, { opacity: interestedHighlight }]}><Ionicons name="heart" size={18} color={THEME.colors.white} /></Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

export const browseDeckStyles = StyleSheet.create({
  emptyContainer: { marginHorizontal: 20, marginTop: 16, marginBottom: 16 },
  container: { height: 370, marginHorizontal: 24, marginTop: 24, marginBottom: 4, position: 'relative' },
  front: { position: 'absolute', left: 0, right: 0, top: 0, height: 350, zIndex: 10 },
  middle: { position: 'absolute', left: 8, right: 8, top: -12, height: 350, borderRadius: 24, opacity: 0.85, transform: [{ scale: 0.96 }], zIndex: 5 },
  back: { position: 'absolute', left: 16, right: 16, top: -24, height: 350, borderRadius: 24, opacity: 0.65, transform: [{ scale: 0.92 }], zIndex: 2 },
});

const styles = StyleSheet.create({
  empty: { minHeight: 312, backgroundColor: THEME.colors.white, borderRadius: THEME.roundness.card, padding: 28, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: THEME.colors.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 20, lineHeight: 26, textAlign: 'center', color: THEME.colors.ink, fontFamily: THEME.typography.fontFamily.display },
  description: { fontSize: 13, lineHeight: 20, textAlign: 'center', color: THEME.colors.textSecondary, fontFamily: THEME.typography.fontFamily.secondaryRegular, marginTop: 8, marginBottom: 22 },
  button: { minHeight: 44, paddingHorizontal: 22, backgroundColor: THEME.colors.brand, borderRadius: THEME.roundness.pill, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: THEME.colors.ink, fontSize: 13, fontFamily: THEME.typography.fontFamily.display },
  skeleton: { height: 350, borderRadius: 24, backgroundColor: THEME.colors.white, padding: 20, gap: 18 },
  skeletonIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: THEME.colors.canvasSubtle },
  bar: { height: 16, borderRadius: 8, backgroundColor: THEME.colors.canvasSubtle },
  edgeControls: { position: 'absolute', top: 0, bottom: 20, left: -16, right: -16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 },
  edgeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 4 },
  edgeHighlight: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
