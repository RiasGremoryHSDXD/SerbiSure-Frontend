import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { Image, Pressable, StyleSheet, Text, View, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IDPhotoModal } from './IDPhotoModal';
import { API_BASE_URL } from '../../../shared/api/config';
import { fetchWithTimeout } from '../../../shared/api/httpClient';
import THEME from '../../../shared/theme/theme';
import { RegistrationStepper } from '../../auth/components/RegistrationStepper';
import type { SelfieUploadTask } from '../api/selfieUpload';

const noSubscription = () => () => {};
const noSelfieUpload = () => null;

const logoSource = require('../../../../assets/serbisure_new_clean.png');

function getFileName(uri: string | null, defaultName: string) {
  if (!uri) return defaultName;
  const raw = uri.split('/').pop()?.split('?')[0];
  if (raw && (raw.endsWith('.jpg') || raw.endsWith('.png') || raw.endsWith('.jpeg') || raw.endsWith('.pdf'))) {
    return raw;
  }
  return defaultName;
}

type DocumentUploadScreenProps = {
  role?: 'homeowner' | 'kasambahay';
  onBack?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  onSkip?: () => void;
  token?: string | null;
  selfieUpload?: SelfieUploadTask;
};

export function DocumentUploadScreen({ role = 'kasambahay', token, selfieUpload, onBack, onNext, onCancel, onSkip }: DocumentUploadScreenProps) {
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeBox, setActiveBox] = useState<'nbi' | 'police' | 'national_front' | 'national_back' | null>(null);
  const [nbiImage, setNbiImage] = useState<string | null>(null);
  const [policeImage, setPoliceImage] = useState<string | null>(null);
  const [nationalFrontImage, setNationalFrontImage] = useState<string | null>(null);
  const [nationalBackImage, setNationalBackImage] = useState<string | null>(null);
  const [existingDocs, setExistingDocs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const active = useRef(true);
  const selfieState = useSyncExternalStore(selfieUpload?.subscribe || noSubscription, selfieUpload?.getSnapshot || noSelfieUpload);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  // All registration exits, including Skip, must wait for a real selfie save.
  const finishRegistration = async (next?: () => void) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      await selfieUpload?.ensureSaved();
      if (active.current) next?.();
    } catch (error) {
      if (active.current) Alert.alert('Selfie not saved', error instanceof Error ? error.message : 'Please retry saving your selfie.');
    } finally {
      busy.current = false;
      if (active.current) setLoading(false);
    }
  };

  // Check if any documents were already uploaded in a previous attempt
  useEffect(() => {
    if (token) {
      fetchWithTimeout(`${API_BASE_URL}/api/v1/verifications/status/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.documents)) {
            const active = new Set<string>(
              data.documents
                .filter((d: any) => d.verification_status === 'Pending' || d.verification_status === 'Verified')
                .map((d: any) => d.document_type)
            );
            setExistingDocs(active);
          }
        })
        .catch((err) => console.warn('[DocumentUploadScreen] check status error:', err));
    }
  }, [token]);

  const handleBoxPress = (box: 'nbi' | 'police' | 'national_front' | 'national_back') => {
    setActiveBox(box);
    setModalVisible(true);
  };

  const handlePickedImage = (uri: string) => {
    if (activeBox === 'nbi') setNbiImage(uri);
    else if (activeBox === 'police') setPoliceImage(uri);
    else if (activeBox === 'national_front') setNationalFrontImage(uri);
    else if (activeBox === 'national_back') setNationalBackImage(uri);
  };

  const handleUploadAll = async () => {
    if (busy.current) return;
    const uploads: { type: string; uri: string }[] = [];
    if (role === 'homeowner') {
      const hasFront = existingDocs.has('national_id_front') || !!nationalFrontImage;
      const hasBack = existingDocs.has('national_id_back') || !!nationalBackImage;

      if (!hasFront || !hasBack) {
        Alert.alert("Missing Documents", "Please upload both the front and back of your National ID.");
        return;
      }
      if (nationalFrontImage && !existingDocs.has('national_id_front')) {
        uploads.push({ type: 'national_id_front', uri: nationalFrontImage });
      }
      if (nationalBackImage && !existingDocs.has('national_id_back')) {
        uploads.push({ type: 'national_id_back', uri: nationalBackImage });
      }
    } else {
      const hasNbi = existingDocs.has('nbi_clearance') || !!nbiImage;
      const hasPolice = existingDocs.has('police_clearance') || !!policeImage;
      if (!hasNbi && !hasPolice) {
        Alert.alert("Missing Documents", "Please upload at least one clearance document.");
        return;
      }
      if (nbiImage && !existingDocs.has('nbi_clearance')) uploads.push({ type: 'nbi_clearance', uri: nbiImage });
      if (policeImage && !existingDocs.has('police_clearance')) uploads.push({ type: 'police_clearance', uri: policeImage });
    }

    busy.current = true;
    setLoading(true);
    try {
      await selfieUpload?.ensureSaved();
      if (!active.current) return;
      for (const upload of uploads) {
        const formData = new FormData();
        formData.append('document_type', upload.type);

        const filename = upload.uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('document_image', {
          uri: upload.uri,
          name: filename,
          type
        } as any);

        const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/verifications/upload/`, {
          method: "POST",
          headers: {
            "Authorization": token ? `Bearer ${token}` : "",
          },
          body: formData,
        }, 45000);

        if (response.status === 409) {
          // Document was already submitted (pending review) - continue to next upload gracefully!
          console.log(`[DocumentUploadScreen] ${upload.type} was already submitted, proceeding with remaining uploads.`);
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to upload ${upload.type}`);
        }
        if (!active.current) return;
      }

      if (active.current) {
        Alert.alert("Success", "Your documents have been submitted and are under review!");
        onNext?.();
      }

    } catch (error: any) {
      if (active.current) Alert.alert("Upload Failed", error.message);
    } finally {
      busy.current = false;
      if (active.current) setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable onPress={onBack} disabled={loading || selfieState?.status === 'uploading'} style={(loading || selfieState?.status === 'uploading') && { opacity: 0.4 }}>
            <Ionicons name="arrow-back" size={26} color="#2A2925" />
          </Pressable>
        </View>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <View style={[styles.headerSide, styles.headerSideRight]}>
          <Pressable onPress={() => { void finishRegistration(onSkip); }} disabled={loading}>
            <Text style={styles.skipText}>{uiText("Skip")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.title}>{uiText("Verify Your Identity")}</Text>
        <Text style={styles.subtitle}>{uiText("Upload your documents to activate your profile")}</Text>
      </View>

      <View style={styles.alertBox}>
        <Ionicons name="alert-circle" size={16} color="#000" style={styles.alertIcon} />
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>{uiText("Verification Process")}</Text>
          <Text style={styles.alertText}>{uiText("Documents are securely stored and typically reviewed within 24 hours.")}</Text>
          {selfieState?.status === 'uploading' && <View style={styles.selfieStatus}>
            <ActivityIndicator size="small" color={THEME.colors.ink} />
            <Text accessibilityLiveRegion="polite" style={styles.selfieStatusText}>{uiText("Saving your selfie. You can select documents now.")}</Text>
          </View>}
          {selfieState?.status === 'failed' && <View style={styles.selfieStatus}>
            <Text accessibilityRole="alert" style={styles.selfieStatusText}>{selfieState.error}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Retry saving selfie" disabled={loading} onPress={() => { void finishRegistration(); }} style={styles.selfieRetry}>
              <Text style={styles.selfieRetryText}>{uiText("Retry")}</Text>
            </Pressable>
          </View>}
        </View>
      </View>

      <View style={styles.card}>
        <RegistrationStepper
          currentStep={role === 'kasambahay' ? 5 : 4}
          totalSteps={role === 'kasambahay' ? 5 : 4}
          title={role === 'kasambahay' ? 'Step 5: Identity Documents' : 'Step 4: Identity Documents'}
          help="Upload your government ID to complete your registration."
        />

        <View style={styles.cardContent}>
          <View>
            {role === 'homeowner' ? (
              <>
                <Pressable style={[styles.uploadBox, styles.uploadBoxHomeowner, (!!nationalFrontImage || existingDocs.has('national_id_front')) && styles.uploadBoxHasImage]} onPress={() => handleBoxPress('national_front')}>
                  {nationalFrontImage ? (
                    <View style={styles.attachmentContainer}>
                      <Image source={{ uri: nationalFrontImage }} style={[styles.uploadPreview, styles.uploadPreviewHomeowner]} resizeMode="cover" />
                      <Text style={styles.fileNameTextItalic} numberOfLines={1}>
                        {getFileName(nationalFrontImage, 'national_id_front.jpg')}
                      </Text>
                    </View>
                  ) : existingDocs.has('national_id_front') ? (
                    <View style={styles.attachmentContainer}>
                      <Ionicons name="checkmark-circle" size={32} color="#16A34A" />
                      <Text style={[styles.uploadTitle, { color: '#16A34A', marginTop: 4 }]}>{uiText("National ID (Front)")}</Text>
                      <Text style={[styles.uploadSubtitle, { color: '#15803D' }]}>{uiText("Submitted (Under Review)")}</Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={26} color={THEME.colors.brand} style={styles.uploadIcon} />
                      <Text style={styles.uploadTitle}>{uiText("National ID (Front)")}</Text>
                      <Text style={styles.uploadSubtitle}>{uiText("Tap or upload image")}</Text>
                      <Text style={styles.uploadMeta}>{uiText("JPG, PNG, PDF (Max 5MB)")}</Text>
                    </>
                  )}
                </Pressable>

                <Pressable style={[styles.uploadBox, styles.uploadBoxHomeowner, (!!nationalBackImage || existingDocs.has('national_id_back')) && styles.uploadBoxHasImage]} onPress={() => handleBoxPress('national_back')}>
                  {nationalBackImage ? (
                    <View style={styles.attachmentContainer}>
                      <Image source={{ uri: nationalBackImage }} style={[styles.uploadPreview, styles.uploadPreviewHomeowner]} resizeMode="cover" />
                      <Text style={styles.fileNameTextItalic} numberOfLines={1}>
                        {getFileName(nationalBackImage, 'national_id_back.jpg')}
                      </Text>
                    </View>
                  ) : existingDocs.has('national_id_back') ? (
                    <View style={styles.attachmentContainer}>
                      <Ionicons name="checkmark-circle" size={32} color="#16A34A" />
                      <Text style={[styles.uploadTitle, { color: '#16A34A', marginTop: 4 }]}>{uiText("National ID (Back)")}</Text>
                      <Text style={[styles.uploadSubtitle, { color: '#15803D' }]}>{uiText("Submitted (Under Review)")}</Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={26} color={THEME.colors.brand} style={styles.uploadIcon} />
                      <Text style={styles.uploadTitle}>{uiText("National ID (Back)")}</Text>
                      <Text style={styles.uploadSubtitle}>{uiText("Tap or upload image")}</Text>
                      <Text style={styles.uploadMeta}>{uiText("JPG, PNG, PDF (Max 5MB)")}</Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={[styles.uploadBox, styles.uploadBoxKasambahay, !!nbiImage && styles.uploadBoxHasImage]} onPress={() => handleBoxPress('nbi')}>
                  {nbiImage ? (
                    <View style={styles.attachmentContainer}>
                      <Image source={{ uri: nbiImage }} style={styles.uploadPreview} resizeMode="cover" />
                      <Text style={styles.fileNameTextItalic} numberOfLines={1}>
                        {getFileName(nbiImage, 'nbi_clearance.jpg')}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={26} color={THEME.colors.brand} style={styles.uploadIcon} />
                      <Text style={styles.uploadTitle}>{uiText("NBI Clearance")}</Text>
                      <Text style={styles.uploadSubtitle}>{uiText("Click or drag file to upload")}</Text>
                      <Text style={styles.uploadMeta}>{uiText("JPG, PNG, PDF (Max 5MB)")}</Text>
                    </>
                  )}
                </Pressable>

                <Pressable style={[styles.uploadBox, styles.uploadBoxKasambahay, !!policeImage && styles.uploadBoxHasImage]} onPress={() => handleBoxPress('police')}>
                  {policeImage ? (
                    <View style={styles.attachmentContainer}>
                      <Image source={{ uri: policeImage }} style={styles.uploadPreview} resizeMode="cover" />
                      <Text style={styles.fileNameTextItalic} numberOfLines={1}>
                        {getFileName(policeImage, 'police_clearance.jpg')}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={26} color={THEME.colors.brand} style={styles.uploadIcon} />
                      <Text style={styles.uploadTitle}>{uiText("Police Clearance")}</Text>
                      <Text style={styles.uploadSubtitle}>{uiText("Click or drag file to upload")}</Text>
                      <Text style={styles.uploadMeta}>{uiText("JPG, PNG, PDF (Max 5MB)")}</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>

          <View>
            <View style={styles.divider} />
            <View style={styles.buttonRow}>
              <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]} onPress={() => { void finishRegistration(onCancel); }} disabled={loading}>
                <Text style={styles.secondaryButtonText}>{uiText("Cancel")}</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, loading && { opacity: 0.7 }]} onPress={handleUploadAll} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>{uiText("Submit")}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <IDPhotoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onPickedImage={handlePickedImage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  selfieStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  selfieStatusText: { flex: 1, fontSize: 11, lineHeight: 16, color: THEME.colors.textSecondary, fontFamily: THEME.typography.fontFamily.body },
  selfieRetry: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: THEME.colors.white },
  selfieRetryText: { fontSize: 12, color: THEME.colors.ink, fontFamily: THEME.typography.fontFamily.mainBold },
  root: {
    backgroundColor: THEME.colors.canvas,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    width: '100%',
  },
  headerSide: {
    width: 44,
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  logo: {
    height: 44,
    width: 44,
  },
  skipText: {
    color: THEME.colors.brandDark,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.bodyBold,
  },
  titleBlock: {
    marginTop: 8,
    paddingHorizontal: 24,
    minHeight: 58,
  },
  title: {
    color: THEME.colors.ink,
    fontSize: 24,
    fontFamily: THEME.typography.fontFamily.display,
    lineHeight: 28,
    marginBottom: 4,
  },
  subtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.body,
    lineHeight: 18,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.roundness.card,
    flex: 1,
    marginTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 12,
    width: '92%',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.brandLight,
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    marginHorizontal: 18,
    marginBottom: 0,
  },
  alertIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.bodyBold,
    color: THEME.colors.ink,
    marginBottom: 2,
  },
  alertText: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.body,
    color: THEME.colors.textSecondary,
    lineHeight: 15,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#D8D8D2',
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
    backgroundColor: '#FAFAF8',
  },
  uploadBoxKasambahay: {
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  uploadBoxHomeowner: {
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 6,
  },
  uploadBoxHasImage: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#F5F4F0',
    borderStyle: 'solid',
    borderColor: THEME.colors.brand,
  },
  uploadIcon: {
    marginBottom: 4,
  },
  attachmentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  uploadPreview: {
    width: '100%',
    height: 95,
    borderRadius: 12,
  },
  uploadPreviewHomeowner: {
    height: 95,
  },
  fileNameTextItalic: {
    fontStyle: 'italic',
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.body,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  uploadTitle: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.bodyBold,
    color: THEME.colors.ink,
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.body,
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  uploadMeta: {
    fontSize: 9,
    fontFamily: THEME.typography.fontFamily.body,
    color: THEME.colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.divider,
    marginTop: 6,
    marginBottom: 10,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: THEME.colors.ink,
    height: 48,
    borderRadius: THEME.roundness.pill,
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: THEME.colors.white,
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.display,
    letterSpacing: THEME.typography.tracking.tight,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: THEME.colors.canvas,
    borderRadius: THEME.roundness.pill,
    height: 48,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: THEME.colors.ink,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.display,
  },
});
