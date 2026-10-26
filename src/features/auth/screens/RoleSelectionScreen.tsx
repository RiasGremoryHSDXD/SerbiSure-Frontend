import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../../shared/theme/theme';
import { APP_HEADER_BACK_ICON_COLOR, APP_HEADER_BACK_ICON_SIZE, APP_HEADER_LOGO_SIZE, APP_HEADER_SIDE_WIDTH } from '../../../shared/components/AppHeader';

const logoSource = require('../../../../assets/serbisure_new_clean.png');
const homeownerSource = require('../../../../assets/homeowner1.png');
const kasambahaySource = require('../../../../assets/kasambahay1.png');

type RoleSelectionScreenProps = {
  onSelectRole?: (role: 'homeowner' | 'kasambahay') => void;
  onBack?: () => void;
};

export function RoleSelectionScreen({ onSelectRole, onBack }: RoleSelectionScreenProps) {
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={10}>
              <Ionicons name="arrow-back" size={APP_HEADER_BACK_ICON_SIZE} color={APP_HEADER_BACK_ICON_COLOR} />
            </Pressable>
          ) : null}
        </View>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerSide} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          {uiText("How would")}{' '}<Text style={styles.titleHighlight}>{uiText("you")}</Text>{'\n'}{uiText("like to join?")}</Text>
      </View>

      <View style={styles.optionsContainer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uiText("I am a Homeowner")}
          style={({ pressed }) => [styles.roleOption, styles.homeownerOption, pressed && styles.cardPressed]}
          onPress={() => onSelectRole?.('homeowner')}
        >
          <Image source={homeownerSource} style={styles.homeownerImage} resizeMode="contain" />
          <View style={[styles.roleButton, styles.homeownerButton, styles.homeownerLabel]}>
            <Text style={styles.cardLabelText}>{uiText("I am a Homeowner")}</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uiText("I am a Kasambahay")}
          style={({ pressed }) => [styles.roleOption, styles.kasambahayOption, pressed && styles.cardPressed]}
          onPress={() => onSelectRole?.('kasambahay')}
        >
          <Image source={kasambahaySource} style={styles.kasambahayImage} resizeMode="contain" />
          <View style={[styles.roleButton, styles.kasambahayButton, styles.kasambahayLabel]}>
            <Text style={styles.cardLabelText}>{uiText("I am a Kasambahay")}</Text>
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
    marginBottom: 8,
    width: '100%',
  },
  headerSide: {
    width: APP_HEADER_SIDE_WIDTH,
    justifyContent: 'center',
  },
  logo: {
    height: APP_HEADER_LOGO_SIZE,
    width: APP_HEADER_LOGO_SIZE,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: THEME.colors.ink,
    fontSize: 30,
    fontFamily: THEME.typography.fontFamily.displayExtraBold,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: THEME.typography.tracking.tighter,
  },
  titleHighlight: {
    color: THEME.colors.brandDark,
  },
  optionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 6,
  },
  roleOption: {
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  homeownerOption: {
    height: '51%',
  },
  kasambahayOption: {
    height: '43%',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  homeownerImage: {
    width: '100%',
    height: '100%',
  },
  kasambahayImage: {
    width: '88%',
    height: '100%',
  },
  roleButton: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    width: '68%',
    borderRadius: THEME.roundness.pill,
  },
  homeownerButton: {
    bottom: 42,
  },
  kasambahayButton: {
    bottom: 8,
  },
  homeownerLabel: {
    backgroundColor: THEME.colors.ink,
  },
  kasambahayLabel: {
    backgroundColor: THEME.colors.brand,
  },
  cardLabelText: {
    color: THEME.colors.white,
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
    textAlign: 'center',
    letterSpacing: THEME.typography.tracking.tight,
  },
});
