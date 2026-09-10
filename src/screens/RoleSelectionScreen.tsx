import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../config/theme';

const logoSource = require('../../assets/serbisure_new_clean.png');
const homeownerSource = require('../../assets/homeowner.png');
const kasambahaySource = require('../../assets/kasambahay.png');

type RoleSelectionScreenProps = {
  onSelectRole?: (role: 'homeowner' | 'kasambahay') => void;
  onBack?: () => void;
};

export function RoleSelectionScreen({ onSelectRole, onBack }: RoleSelectionScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={THEME.colors.ink} />
            </Pressable>
          ) : null}
        </View>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerSide} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          How would <Text style={styles.titleHighlight}>you</Text>{'\n'}like to join?
        </Text>
        <Text style={styles.subtitle}>Choose your path to get started</Text>
      </View>

      <View style={styles.cardsContainer}>
        <Pressable 
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => onSelectRole?.('homeowner')}
        >
          <Image source={homeownerSource} style={styles.cardImage} />
          <View style={[styles.cardLabel, styles.homeownerLabel]}>
            <Text style={styles.cardLabelText}>I am a Homeowner</Text>
          </View>
        </Pressable>

        <Pressable 
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => onSelectRole?.('kasambahay')}
        >
          <Image source={kasambahaySource} style={styles.cardImage} />
          <View style={[styles.cardLabel, styles.kasambahayLabel]}>
            <Text style={styles.cardLabelText}>I am a Kasambahay</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: THEME.colors.canvas,
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  headerSide: {
    width: 44,
    justifyContent: 'center',
  },
  backBtn: {
    padding: 8,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.pill,
  },
  logo: {
    height: 52,
    width: 52,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: THEME.colors.ink,
    fontSize: 34,
    fontFamily: THEME.typography.fontFamily.displayExtraBold,
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: THEME.typography.tracking.tighter,
    marginBottom: 10,
  },
  titleHighlight: {
    color: THEME.colors.brandDark,
  },
  subtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.bodyMedium,
    textAlign: 'center',
  },
  cardsContainer: {
    flex: 1,
    gap: 20,
    paddingBottom: 16,
  },
  card: {
    flex: 1,
    borderRadius: THEME.roundness.cardLg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: THEME.colors.white,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardLabel: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: THEME.roundness.pill,
  },
  homeownerLabel: {
    backgroundColor: THEME.colors.ink,
  },
  kasambahayLabel: {
    backgroundColor: THEME.colors.brand,
  },
  cardLabelText: {
    color: THEME.colors.white,
    fontSize: 17,
    fontFamily: THEME.typography.fontFamily.display,
    textAlign: 'center',
    letterSpacing: THEME.typography.tracking.tight,
  },
});
