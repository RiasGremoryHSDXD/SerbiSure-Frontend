import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DocumentStatusItem,
  VerificationStatusResponse,
  deleteRejectedDocument,
} from '../api/verificationApi';
import { IDPhotoModal } from './IDPhotoModal';
import { API_BASE_URL, fetchWithTimeout } from '../config/api';

interface VerificationStatusModalProps {
  visible: boolean;
  onClose: () => void;
  statusData: VerificationStatusResponse | null;
  loading: boolean;
  token?: string | null;
  onRefresh?: () => void;
  onOpenUpload?: (docType?: string) => void;
  role?: 'homeowner' | 'kasambahay';
}

const DOCUMENT_NAMES: Record<string, string> = {
  nbi_clearance: 'NBI Clearance',
  police_clearance: 'Police Clearance',
  national_id_front: 'National ID (Front)',
  national_id_back: 'National ID (Back)',
};

function getFileName(uri: string | null, defaultName: string) {
  if (!uri) return defaultName;
  const raw = uri.split('/').pop()?.split('?')[0];
  if (raw && (raw.endsWith('.jpg') || raw.endsWith('.png') || raw.endsWith('.jpeg') || raw.endsWith('.pdf'))) {
    return raw;
  }
  return defaultName;
}

function UploadBox({
  title,
  subtitle = 'Tap or upload image',
  meta = 'JPG, PNG, PDF (Max 5MB)',
  image,
  defaultFilename,
  onPress,
  onRemove,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  image: string | null;
  defaultFilename: string;
  onPress: () => void;
  onRemove?: () => void;
}) {
  return (
    <Pressable
      style={[styles.uploadBox, !!image && styles.uploadBoxHasImage]}
      onPress={onPress}
    >
      {image ? (
        <View style={styles.attachmentContainer}>
          <Image source={{ uri: image }} style={styles.uploadPreview} resizeMode="cover" />
          <View style={styles.previewMetaRow}>
            <Text style={styles.fileNameTextItalic} numberOfLines={1}>
              {getFileName(image, defaultFilename)}
            </Text>
            {onRemove ? (
              <Pressable
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                style={styles.removeImageBtn}
              >
                <Ionicons name="close-circle" size={18} color="#E74C3C" />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
        <>
          <Ionicons name="cloud-upload" size={26} color="#FFB43B" style={styles.uploadIcon} />
          <Text style={styles.uploadTitle}>{title}</Text>
          <Text style={styles.uploadSubtitle}>{subtitle}</Text>
          <Text style={styles.uploadMeta}>{meta}</Text>
        </>
      )}
    </Pressable>
  );
}

export function VerificationStatusModal({
  visible,
  onClose,
  statusData,
  loading,
  token,
  onRefresh,
  onOpenUpload,
  role,
}: VerificationStatusModalProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [idPhotoVisible, setIdPhotoVisible] = useState(false);
  const [activeBox, setActiveBox] = useState<'nbi' | 'police' | 'national_front' | 'national_back' | null>(null);
  const [nbiImage, setNbiImage] = useState<string | null>(null);
  const [policeImage, setPoliceImage] = useState<string | null>(null);
  const [nationalFrontImage, setNationalFrontImage] = useState<string | null>(null);
  const [nationalBackImage, setNationalBackImage] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const effectiveRole: 'homeowner' | 'kasambahay' =
    role ?? (statusData?.account_type === 'Homeowner' ? 'homeowner' : 'kasambahay');

  const handleClose = () => {
    setNbiImage(null);
    setPoliceImage(null);
    setNationalFrontImage(null);
    setNationalBackImage(null);
    setActiveBox(null);
    setIdPhotoVisible(false);
    onClose();
  };

  const handleBoxPress = (box: 'nbi' | 'police' | 'national_front' | 'national_back') => {
    setActiveBox(box);
    setIdPhotoVisible(true);
  };

  const handlePickedImage = (uri: string) => {
    if (activeBox === 'nbi') setNbiImage(uri);
    else if (activeBox === 'police') setPoliceImage(uri);
    else if (activeBox === 'national_front') setNationalFrontImage(uri);
    else if (activeBox === 'national_back') setNationalBackImage(uri);
  };

  const handleReupload = (docType: string) => {
    if (docType === 'nbi_clearance') handleBoxPress('nbi');
    else if (docType === 'police_clearance') handleBoxPress('police');
    else if (docType === 'national_id_front') handleBoxPress('national_front');
    else if (docType === 'national_id_back') handleBoxPress('national_back');
  };

  const handleDeleteRejected = (document: DocumentStatusItem) => {
    if (!token) return;
    const docName = DOCUMENT_NAMES[document.document_type] || document.document_type;

    Alert.alert(
      'Remove Rejected Document',
      `Are you sure you want to remove this ${docName}? You will be able to re-upload a clear copy.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(document.document_id);
              await deleteRejectedDocument(token, document.document_id);
              Alert.alert('Removed', `${docName} was removed. You can now re-upload.`);
              onRefresh?.();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove document.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // Active documents (Pending or Verified) don't need re-upload
  const activeTypes = new Set(
    statusData?.documents
      ?.filter((d) => d.verification_status === 'Pending' || d.verification_status === 'Verified')
      .map((d) => d.document_type) ?? []
  );

  const needsNbi = effectiveRole === 'kasambahay' && (!activeTypes.has('nbi_clearance') || !!nbiImage);
  const needsPolice = effectiveRole === 'kasambahay' && (!activeTypes.has('police_clearance') || !!policeImage);
  const needsFront = effectiveRole === 'homeowner' && (!activeTypes.has('national_id_front') || !!nationalFrontImage);
  const needsBack = effectiveRole === 'homeowner' && (!activeTypes.has('national_id_back') || !!nationalBackImage);

  const hasAnyNeeds = needsNbi || needsPolice || needsFront || needsBack;
  const hasAnySelected = !!(nbiImage || policeImage || nationalFrontImage || nationalBackImage);

  const handleUploadAll = async () => {
    if (!token) {
      Alert.alert('Authentication Error', 'You must be logged in to upload documents.');
      return;
    }

    const uploads: { type: string; uri: string }[] = [];

    if (effectiveRole === 'homeowner') {
      if (needsFront && !nationalFrontImage) {
        Alert.alert('Missing Document', 'Please upload the front of your National ID.');
        return;
      }
      if (needsBack && !nationalBackImage) {
        Alert.alert('Missing Document', 'Please upload the back of your National ID.');
        return;
      }
      if (nationalFrontImage) uploads.push({ type: 'national_id_front', uri: nationalFrontImage });
      if (nationalBackImage) uploads.push({ type: 'national_id_back', uri: nationalBackImage });
    } else {
      if (needsNbi && !nbiImage && needsPolice && !policeImage) {
        Alert.alert('Missing Documents', 'Please upload at least one clearance document.');
        return;
      }
      if (nbiImage) uploads.push({ type: 'nbi_clearance', uri: nbiImage });
      if (policeImage) uploads.push({ type: 'police_clearance', uri: policeImage });
    }

    if (uploads.length === 0) {
      Alert.alert('No Documents', 'Please select at least one document to upload.');
      return;
    }

    setUploadLoading(true);
    try {
      for (const upload of uploads) {
        const formData = new FormData();
        formData.append('document_type', upload.type);

        const filename = upload.uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('document_image', {
          uri: upload.uri,
          name: filename,
          type,
        } as any);

        const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/verifications/upload/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to upload ${DOCUMENT_NAMES[upload.type] || upload.type}`);
        }
      }

      Alert.alert('Success', 'Documents submitted successfully!');
      setNbiImage(null);
      setPoliceImage(null);
      setNationalFrontImage(null);
      setNationalBackImage(null);
      onRefresh?.();
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'An unexpected error occurred during upload.');
    } finally {
      setUploadLoading(false);
    }
  };

  const resolveEffectiveStatus = (): 'Verified' | 'Pending' | 'Rejected' | 'Unverified' => {
    if (!statusData) return 'Unverified';

    // Derive directly from submitted documents list
    if (statusData.documents && statusData.documents.length > 0) {
      const verifiedTypes = new Set(
        statusData.documents
          .filter((d) => d.verification_status === 'Verified')
          .map((d) => d.document_type)
      );

      if (statusData.account_type === 'Homeowner') {
        if (verifiedTypes.has('national_id_front') && verifiedTypes.has('national_id_back')) {
          return 'Verified';
        }
      } else if (statusData.account_type === 'Kasambahay') {
        if (verifiedTypes.has('nbi_clearance') && verifiedTypes.has('police_clearance')) {
          return 'Verified';
        }
      }

      const docStatuses = new Set(statusData.documents.map((d) => d.verification_status));
      if (docStatuses.has('Rejected')) return 'Rejected';
      if (docStatuses.has('Pending') || verifiedTypes.size > 0) return 'Pending';
    }

    return (statusData.overall_status as any) || 'Unverified';
  };

  const renderStatusBanner = () => {
    const status = resolveEffectiveStatus();

    if (status === 'Verified') {
      return (
        <View style={[styles.bannerCard, styles.bannerCardVerified]}>
          <View style={[styles.bannerIconBox, styles.bannerIconBoxVerified]}>
            <Ionicons name="shield-checkmark" size={24} color="#27AE60" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.bannerTitle, { color: '#27AE60' }]}>Identity Verified</Text>
            <Text style={styles.bannerSubtitle}>
              Your documents have been reviewed and approved by officials. Your profile displays the verified trust badge.
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'Pending') {
      return (
        <View style={[styles.bannerCard, styles.bannerCardPending]}>
          <View style={[styles.bannerIconBox, styles.bannerIconBoxPending]}>
            <Ionicons name="time" size={24} color="#F39C12" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.bannerTitle, { color: '#D68910' }]}>Verification In Progress</Text>
            <Text style={styles.bannerSubtitle}>
              Your documents were submitted and analyzed by our AI verification assistant. Barangay/Admin officials are performing final review.
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'Rejected') {
      return (
        <View style={[styles.bannerCard, styles.bannerCardRejected]}>
          <View style={[styles.bannerIconBox, styles.bannerIconBoxRejected]}>
            <Ionicons name="alert-circle" size={24} color="#E74C3C" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.bannerTitle, { color: '#C0392B' }]}>Verification Needs Attention</Text>
            <Text style={styles.bannerSubtitle}>
              One or more documents were rejected by the reviewing official. Please check the feedback below and submit a clear document.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.bannerCard, styles.bannerCardUnverified]}>
        <View style={[styles.bannerIconBox, styles.bannerIconBoxUnverified]}>
          <Ionicons name="document-text-outline" size={24} color="#7F8C8D" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.bannerTitle, { color: '#555' }]}>Not Yet Verified</Text>
          <Text style={styles.bannerSubtitle}>
            Upload your valid identity documents to unlock verified credentials and boost trust on SerbiSure.
          </Text>
        </View>
      </View>
    );
  };

  const renderDocumentItem = (doc: DocumentStatusItem) => {
    const isPending = doc.verification_status === 'Pending';
    const isVerified = doc.verification_status === 'Verified';
    const isRejected = doc.verification_status === 'Rejected';
    const docTitle = DOCUMENT_NAMES[doc.document_type] || doc.document_type;
    const formattedDate = doc.created_at
      ? new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    return (
      <View key={doc.document_id} style={styles.docItemCard}>
        <View style={styles.docItemHeader}>
          <View style={styles.docIconBox}>
            <Ionicons
              name={isVerified ? 'checkmark-circle' : isRejected ? 'close-circle' : 'time'}
              size={20}
              color={isVerified ? '#27AE60' : isRejected ? '#E74C3C' : '#F39C12'}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.docItemTitle}>{docTitle}</Text>
            {formattedDate ? (
              <Text style={styles.docItemSub}>Submitted on {formattedDate}</Text>
            ) : null}
          </View>

          <View
            style={[
              styles.statusBadge,
              isVerified && styles.statusBadgeVerified,
              isPending && styles.statusBadgePending,
              isRejected && styles.statusBadgeRejected,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isVerified && styles.statusBadgeTextVerified,
                isPending && styles.statusBadgeTextPending,
                isRejected && styles.statusBadgeTextRejected,
              ]}
            >
              {doc.verification_status}
            </Text>
          </View>
        </View>

        {/* Rejection Reason Notice */}
        {isRejected && doc.rejection_reason ? (
          <View style={styles.rejectionBox}>
            <Ionicons name="information-circle" size={16} color="#C0392B" style={{ marginTop: 2, marginRight: 6 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectionLabel}>Feedback from Reviewer:</Text>
              <Text style={styles.rejectionText}>{doc.rejection_reason}</Text>
            </View>
          </View>
        ) : null}

        {/* Action Button for Rejected Document */}
        {isRejected ? (
          <View style={styles.docActionsRow}>
            <Pressable
              style={styles.reuploadBtn}
              onPress={() => handleReupload(doc.document_type)}
            >
              <Ionicons name="cloud-upload-outline" size={15} color="#FFF" />
              <Text style={styles.reuploadBtnText}>Re-upload Document</Text>
            </Pressable>

            <Pressable
              style={styles.removeBtn}
              onPress={() => handleDeleteRejected(doc)}
              disabled={deletingId === doc.document_id}
            >
              {deletingId === doc.document_id ? (
                <ActivityIndicator size="small" color="#E74C3C" />
              ) : (
                <Ionicons name="trash-outline" size={16} color="#E74C3C" />
              )}
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  const renderUploadSection = () => {
    if (!hasAnyNeeds && !hasAnySelected) return null;

    return (
      <View style={styles.uploadSection}>
        <Text style={styles.uploadSectionHeader}>Upload Documents</Text>

        {needsNbi ? (
          <UploadBox
            title="NBI Clearance"
            subtitle="Click or drag file to upload"
            image={nbiImage}
            defaultFilename="nbi_clearance.jpg"
            onPress={() => handleBoxPress('nbi')}
            onRemove={() => setNbiImage(null)}
          />
        ) : null}

        {needsPolice ? (
          <UploadBox
            title="Police Clearance"
            subtitle="Click or drag file to upload"
            image={policeImage}
            defaultFilename="police_clearance.jpg"
            onPress={() => handleBoxPress('police')}
            onRemove={() => setPoliceImage(null)}
          />
        ) : null}

        {needsFront ? (
          <UploadBox
            title="National ID (Front)"
            subtitle="Tap or upload image"
            image={nationalFrontImage}
            defaultFilename="national_id_front.jpg"
            onPress={() => handleBoxPress('national_front')}
            onRemove={() => setNationalFrontImage(null)}
          />
        ) : null}

        {needsBack ? (
          <UploadBox
            title="National ID (Back)"
            subtitle="Tap or upload image"
            image={nationalBackImage}
            defaultFilename="national_id_back.jpg"
            onPress={() => handleBoxPress('national_back')}
            onRemove={() => setNationalBackImage(null)}
          />
        ) : null}

        {hasAnySelected ? (
          <Pressable
            style={[styles.submitBtn, uploadLoading && styles.submitBtnDisabled]}
            onPress={handleUploadAll}
            disabled={uploadLoading}
          >
            {uploadLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="cloud-upload-outline" size={16} color="#FFF" />
                <Text style={styles.submitBtnText}>Submit Documents</Text>
              </View>
            )}
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark" size={22} color="#FFB43B" style={{ marginRight: 8 }} />
                <Text style={styles.headerTitle}>Document Verification</Text>
              </View>
              <Pressable onPress={handleClose} hitSlop={8}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#FFB43B" />
                  <Text style={styles.loadingText}>Loading verification status...</Text>
                </View>
              ) : (
                <>
                  {renderStatusBanner()}

                  {statusData?.documents && statusData.documents.length > 0 ? (
                    <>
                      <Text style={styles.sectionHeader}>Submitted Credentials</Text>
                      {statusData.documents.map(renderDocumentItem)}
                    </>
                  ) : null}

                  {renderUploadSection()}
                </>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Pressable style={styles.closeFooterBtn} onPress={handleClose}>
                <Text style={styles.closeFooterBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <IDPhotoModal
        visible={idPhotoVisible}
        onClose={() => setIdPhotoVisible(false)}
        onPickedImage={handlePickedImage}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFEA',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#666',
  },
  bannerCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
  },
  bannerCardVerified: {
    backgroundColor: '#F0FFF4',
    borderColor: '#C6F6D5',
  },
  bannerCardPending: {
    backgroundColor: '#FFFBF0',
    borderColor: '#FEEBC8',
  },
  bannerCardRejected: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FED7D7',
  },
  bannerCardUnverified: {
    backgroundColor: '#F7FAFC',
    borderColor: '#E2E8F0',
  },
  bannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconBoxVerified: {
    backgroundColor: '#DCFCE7',
  },
  bannerIconBoxPending: {
    backgroundColor: '#FEF3C7',
  },
  bannerIconBoxRejected: {
    backgroundColor: '#FEE2E2',
  },
  bannerIconBoxUnverified: {
    backgroundColor: '#EDF2F7',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  docItemCard: {
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAE8E1',
  },
  docItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  docItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  docItemSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  statusBadgeVerified: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A5568',
  },
  statusBadgeTextVerified: {
    color: '#15803D',
  },
  statusBadgeTextPending: {
    color: '#B45309',
  },
  statusBadgeTextRejected: {
    color: '#B91C1C',
  },
  rejectionBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF1F0',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFCCC7',
  },
  rejectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A8071A',
    marginBottom: 2,
  },
  rejectionText: {
    fontSize: 12,
    color: '#595959',
    lineHeight: 16,
  },
  docActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  reuploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB43B',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  reuploadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFCCC7',
    backgroundColor: '#FFF',
  },
  uploadSection: {
    marginTop: 6,
  },
  uploadSectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    marginTop: 4,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#777',
    borderStyle: 'dotted',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FAFAF8',
  },
  uploadBoxHasImage: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F5F4F0',
  },
  uploadIcon: {
    marginBottom: 6,
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    marginBottom: 3,
  },
  uploadSubtitle: {
    fontSize: 11,
    color: '#555',
    marginBottom: 2,
  },
  uploadMeta: {
    fontSize: 9,
    color: '#999',
  },
  attachmentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  uploadPreview: {
    width: '100%',
    height: 105,
    borderRadius: 8,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
  },
  removeImageBtn: {
    marginLeft: 8,
  },
  fileNameTextItalic: {
    fontStyle: 'italic',
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: '#FFB43B',
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0EFEA',
  },
  closeFooterBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F4F0',
    paddingVertical: 11,
    borderRadius: 8,
  },
  closeFooterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
});
