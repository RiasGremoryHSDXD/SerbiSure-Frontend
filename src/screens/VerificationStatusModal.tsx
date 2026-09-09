import React, { useState, useEffect } from 'react';
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

const EXTRACTED_FIELD_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  first_name: 'First Name',
  middle_name: 'Middle Name',
  last_name: 'Last Name',
  date_of_birth: 'Date of Birth',
  clearance_number: 'Clearance No.',
  philsys_number: 'PhilSys Card No.',
  document_number: 'Document No.',
  date_issued: 'Date Issued',
  valid_until: 'Valid Until',
  address: 'Address',
  purpose: 'Purpose',
  issuing_office: 'Issuing Office',
  blood_type: 'Blood Type',
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
  const [expandedDocIds, setExpandedDocIds] = useState<Record<string, boolean>>({});
  const [expandedRawDocIds, setExpandedRawDocIds] = useState<Record<string, boolean>>({});

  const toggleDocDetails = (docId: string) => {
    setExpandedDocIds((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const toggleRawDocDetails = (docId: string) => {
    setExpandedRawDocIds((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  // Auto-poll status every 8 seconds while modal is visible and documents are still undergoing processing
  useEffect(() => {
    if (!visible) return;

    const hasProcessingDocs = statusData?.documents?.some(
      (doc) => doc.verification_status === 'Pending' && !doc.ocr_processed_at
    );

    if (!hasProcessingDocs) return;

    const pollInterval = setInterval(() => {
      onRefresh?.();
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [visible, statusData?.documents, onRefresh]);

  const effectiveRole: 'homeowner' | 'kasambahay' =
    role ?? (statusData?.account_type === 'Homeowner' ? 'homeowner' : 'kasambahay');

  const handleClose = () => {
    setNbiImage(null);
    setPoliceImage(null);
    setNationalFrontImage(null);
    setNationalBackImage(null);
    setActiveBox(null);
    setIdPhotoVisible(false);
    setExpandedDocIds({});
    setExpandedRawDocIds({});
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
    const isUnderReview = status === 'Pending';
    const isApproved = status === 'Verified';
    const isRejected = status === 'Rejected';
    const isSubmittedDone = status !== 'Unverified';

    return (
      <View
        style={[
          styles.bannerCard,
          isApproved && styles.bannerCardVerified,
          isUnderReview && styles.bannerCardPending,
          isRejected && styles.bannerCardRejected,
          status === 'Unverified' && styles.bannerCardUnverified,
        ]}
      >
        <View style={styles.bannerTopRow}>
          <View
            style={[
              styles.bannerIconBox,
              isApproved && styles.bannerIconBoxVerified,
              isUnderReview && styles.bannerIconBoxPending,
              isRejected && styles.bannerIconBoxRejected,
              status === 'Unverified' && styles.bannerIconBoxUnverified,
            ]}
          >
            <Ionicons
              name={
                isApproved
                  ? 'shield-checkmark'
                  : isRejected
                  ? 'alert-circle'
                  : isUnderReview
                  ? 'time'
                  : 'document-text-outline'
              }
              size={22}
              color={
                isApproved
                  ? '#16A34A'
                  : isRejected
                  ? '#DC2626'
                  : isUnderReview
                  ? '#D97706'
                  : '#64748B'
              }
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={[
                styles.bannerTitle,
                isApproved && { color: '#15803D' },
                isRejected && { color: '#B91C1C' },
                isUnderReview && { color: '#B45309' },
                status === 'Unverified' && { color: '#334155' },
              ]}
            >
              {isApproved
                ? "You're verified! 🎉"
                : isRejected
                ? 'One of your documents needs attention'
                : isUnderReview
                ? 'Your documents are being reviewed'
                : 'Verify your identity'}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {isApproved
                ? 'Your documents have been approved by officials. Your profile now has the verified badge.'
                : isRejected
                ? 'Please check the note below and submit a clearer copy so officials can finish reviewing.'
                : isUnderReview
                ? "We'll let you know once officials approve your ID. This usually takes 1–3 days."
                : 'Upload your valid identity documents to unlock verified credentials and boost trust on SerbiSure.'}
            </Text>
          </View>
        </View>

        {/* 3-Step Progress Indicator */}
        {isSubmittedDone && (
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressCirclesRow}>
              {/* Step 1: Submitted */}
              <View style={[styles.progressStepCircle, styles.progressStepCircleDone]}>
                <Ionicons name="checkmark" size={12} color="#FFF" />
              </View>

              {/* Connector 1 */}
              <View
                style={[
                  styles.progressLine,
                  (isUnderReview || isRejected || isApproved) && styles.progressLineActive,
                ]}
              />

              {/* Step 2: Being Reviewed */}
              <View
                style={[
                  styles.progressStepCircle,
                  isApproved && styles.progressStepCircleDone,
                  isUnderReview && styles.progressStepCircleActive,
                  isRejected && styles.progressStepCircleWarning,
                ]}
              >
                {isApproved ? (
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                ) : isRejected ? (
                  <Ionicons name="alert" size={12} color="#FFF" />
                ) : (
                  <Ionicons name="time" size={12} color="#FFF" />
                )}
              </View>

              {/* Connector 2 */}
              <View style={[styles.progressLine, isApproved && styles.progressLineActive]} />

              {/* Step 3: Approved */}
              <View
                style={[
                  styles.progressStepCircle,
                  isApproved ? styles.progressStepCircleDone : styles.progressStepCircleInactive,
                ]}
              >
                {isApproved ? (
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                ) : (
                  <Text style={styles.progressStepNum}>3</Text>
                )}
              </View>
            </View>

            {/* Labels Row */}
            <View style={styles.progressLabelsRow}>
              <Text style={[styles.progressStepLabel, styles.progressStepLabelDone]}>
                Submitted
              </Text>
              <Text
                style={[
                  styles.progressStepLabel,
                  (isUnderReview || isApproved) && styles.progressStepLabelActive,
                  isRejected && { color: '#B91C1C', fontWeight: '700' },
                ]}
              >
                {isRejected ? 'Needs Action' : 'Being Reviewed'}
              </Text>
              <Text style={[styles.progressStepLabel, isApproved && styles.progressStepLabelDone]}>
                Approved
              </Text>
            </View>
          </View>
        )}

        {/* Friendly notification note for Pending */}
        {isUnderReview && (
          <View style={styles.whatNextBox}>
            <Ionicons name="notifications-outline" size={15} color="#B45309" style={styles.whatNextIcon} />
            <Text style={styles.whatNextText}>
              You'll get a notification once your documents are approved or if we need anything from you.
            </Text>
          </View>
        )}
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

    const isExpanded = !!expandedDocIds[doc.document_id];
    const isRawExpanded = !!expandedRawDocIds[doc.document_id];
    const hasOcrData = !!(doc.extracted_data && Object.keys(doc.extracted_data).length > 0);
    const hasDiscrepancies = !!(doc.ocr_discrepancies && doc.ocr_discrepancies.length > 0);
    const isProcessingOcr = isPending && !doc.ocr_processed_at && !hasOcrData;

    // Filter valid non-empty entries for raw extracted data
    const validRawEntries = Object.entries(doc.extracted_data || {}).filter(
      ([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim().toUpperCase() !== 'UNKNOWN'
    );

    return (
      <View key={doc.document_id} style={styles.docItemCard}>
        {/* Document Header Row */}
        <View style={styles.docItemHeader}>
          <View
            style={[
              styles.docIconBox,
              isVerified && styles.docIconBoxVerified,
              isPending && styles.docIconBoxPending,
              isRejected && styles.docIconBoxRejected,
            ]}
          >
            <Ionicons
              name={isVerified ? 'checkmark-circle' : isRejected ? 'alert-circle' : 'time'}
              size={20}
              color={isVerified ? '#16A34A' : isRejected ? '#DC2626' : '#D97706'}
            />
          </View>

          <View style={styles.docItemTitleBox}>
            <Text style={styles.docItemTitle} numberOfLines={1}>{docTitle}</Text>
            {formattedDate ? (
              <Text style={styles.docItemSub} numberOfLines={1}>
                {isVerified ? 'Verified by Barangay Official' : `Submitted on ${formattedDate}`}
              </Text>
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
              {isVerified ? 'Approved ✓' : isRejected ? 'Needs Re-upload' : 'Under Review'}
            </Text>
          </View>
        </View>

        {/* Rejected State: Large, prominent feedback and re-upload call to action */}
        {isRejected ? (
          <View style={styles.rejectedCard}>
            <View style={styles.rejectedHeader}>
              <Ionicons name="close-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.rejectedTitle}>This document was not accepted</Text>
            </View>
            <Text style={styles.rejectedReasonText}>
              {doc.rejection_reason
                ? `Note from reviewer: ${doc.rejection_reason}`
                : 'The document image was unclear or unreadable. Please upload a clear, well-lit photo.'}
            </Text>

            <View style={styles.rejectedActionsRow}>
              <Pressable
                style={styles.reuploadFullBtn}
                onPress={() => handleReupload(doc.document_type)}
              >
                <Ionicons name="camera-outline" size={17} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.reuploadFullBtnText}>Upload a New Photo</Text>
              </Pressable>

              <Pressable
                style={styles.removeBtn}
                onPress={() => handleDeleteRejected(doc)}
                disabled={deletingId === doc.document_id}
                accessibilityLabel="Remove rejected document"
              >
                {deletingId === doc.document_id ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Ionicons name="trash-outline" size={17} color="#DC2626" />
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Reading Document State (Processing) */}
        {isProcessingOcr ? (
          <View style={styles.ocrScanningBanner}>
            <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ocrScanningTitle}>Reading your document...</Text>
              <Text style={styles.ocrScanningSubtitle}>
                Our system is checking the details on your {docTitle}. This takes just a moment.
              </Text>
            </View>
          </View>
        ) : (!isRejected && (hasOcrData || hasDiscrepancies)) ? (
          /* Discrepancy & Document Information Section */
          <View style={styles.ocrSummarySection}>
            <Pressable
              style={[styles.ocrToggleBtn, isExpanded && styles.ocrToggleBtnActive]}
              onPress={() => toggleDocDetails(doc.document_id)}
            >
              <View style={styles.ocrToggleLeft}>
                <Ionicons
                  name={hasDiscrepancies ? 'alert-circle' : 'document-text-outline'}
                  size={18}
                  color={hasDiscrepancies ? '#D97706' : '#4B5563'}
                  style={styles.ocrToggleIcon}
                />
                <Text
                  style={[
                    styles.ocrToggleBtnText,
                    hasDiscrepancies && styles.ocrToggleBtnTextAlert,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {hasDiscrepancies ? 'Some details look different' : 'Document details'}
                </Text>
              </View>

              <View style={styles.ocrToggleRight}>
                <Text style={styles.seeDetailsText}>{isExpanded ? 'Hide' : 'Details'}</Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#6B7280"
                />
              </View>
            </Pressable>

            {isExpanded && (
              <View style={styles.ocrExpandedContainer}>
                {/* Reassuring Friendly Callout Box */}
                {hasDiscrepancies && (
                  <View style={styles.friendlyNoticeBox}>
                    <View style={styles.friendlyNoticeHeader}>
                      <Ionicons name="bulb-outline" size={18} color="#92400E" style={{ marginRight: 6 }} />
                      <Text style={styles.friendlyNoticeTitle}>Don't worry — this is common!</Text>
                    </View>
                    <Text style={styles.friendlyNoticeText}>
                      The name on your ID looks slightly different from your SerbiSure profile (for example, a nickname or middle name). Barangay officials will check your actual photo ID during review.
                    </Text>
                  </View>
                )}

                {/* Section A: What We Noticed (Replaces Account vs Document Discrepancy) */}
                {hasDiscrepancies && (
                  <View style={styles.discrepancyBox}>
                    <Text style={styles.discrepancyBoxHeaderLabel}>Here is what we noticed:</Text>

                    {doc.ocr_discrepancies.map((disc, idx) => {
                      const fieldLabel = EXTRACTED_FIELD_LABELS[disc.field] || disc.field;
                      return (
                        <View key={idx} style={styles.humanDiscrepancyCard}>
                          <Text style={styles.humanFieldBadge}>{fieldLabel.toUpperCase()}</Text>

                          <View style={styles.humanRow}>
                            <Text style={styles.humanLabel}>Your profile says:</Text>
                            <Text style={styles.humanValProfile}>{disc.profile_value || '(Not set)'}</Text>
                          </View>

                          <View style={styles.humanRowDivider} />

                          <View style={styles.humanRow}>
                            <Text style={styles.humanLabel}>Your document shows:</Text>
                            <Text style={styles.humanValDoc}>{disc.document_value || '(Not found)'}</Text>
                          </View>
                        </View>
                      );
                    })}

                    <View style={styles.profileTipRow}>
                      <Ionicons name="create-outline" size={15} color="#92400E" style={{ marginRight: 6 }} />
                      <Text style={styles.profileTipText}>
                        If there is a typo in your SerbiSure name, you can update it anytime in Profile Settings.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Section B: Clean Document Info (Secondary optional toggle) */}
                {validRawEntries.length > 0 && (
                  <View style={styles.rawDocSection}>
                    <Pressable
                      style={styles.rawDocToggleBtn}
                      onPress={() => toggleRawDocDetails(doc.document_id)}
                    >
                      <Text style={styles.rawDocToggleText}>
                        {isRawExpanded ? 'Hide all document info ▴' : 'See all info from your document ▾'}
                      </Text>
                    </Pressable>

                    {isRawExpanded && (
                      <View style={styles.rawDataTable}>
                        {validRawEntries.map(([key, val]) => {
                          const label =
                            EXTRACTED_FIELD_LABELS[key] ||
                            key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

                          return (
                            <View key={key} style={styles.rawDataRow}>
                              <Text style={styles.rawDataKey}>{label}</Text>
                              <Text style={styles.rawDataVal}>{String(val)}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
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
                      <Text style={styles.sectionHeader}>Submitted Documents</Text>
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
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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
    color: '#1F2937',
  },
  scrollBody: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },

  /* Banner Card */
  bannerCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bannerCardVerified: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  bannerCardPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  bannerCardRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bannerCardUnverified: {
    backgroundColor: '#F8FAFC',
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
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  bannerSubtitle: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 18,
  },

  /* 3-Step Progress Indicator */
  progressBarWrapper: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  progressCirclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  progressStepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  progressStepCircleDone: {
    backgroundColor: '#16A34A',
  },
  progressStepCircleActive: {
    backgroundColor: '#D97706',
  },
  progressStepCircleWarning: {
    backgroundColor: '#DC2626',
  },
  progressStepCircleInactive: {
    backgroundColor: '#E5E7EB',
  },
  progressStepNum: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 6,
  },
  progressLineActive: {
    backgroundColor: '#16A34A',
  },
  progressLabelsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressStepLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  progressStepLabelDone: {
    color: '#15803D',
    fontWeight: '600',
  },
  progressStepLabelActive: {
    color: '#B45309',
    fontWeight: '600',
  },

  /* What happens next note */
  whatNextBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 12,
  },
  whatNextIcon: {
    marginRight: 8,
    marginTop: 1,
    flexShrink: 0,
  },
  whatNextText: {
    fontSize: 11.5,
    color: '#92400E',
    flex: 1,
    lineHeight: 16.5,
  },

  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },

  /* Document Item Card */
  docItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  docItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    flexShrink: 0,
  },
  docIconBoxVerified: {
    backgroundColor: '#DCFCE7',
  },
  docIconBoxPending: {
    backgroundColor: '#FEF3C7',
  },
  docIconBoxRejected: {
    backgroundColor: '#FEE2E2',
  },
  docItemTitleBox: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
    minWidth: 0,
  },
  docItemTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1F2937',
  },
  docItemSub: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    flexShrink: 0,
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
    color: '#4B5563',
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

  /* Rejected State Card */
  rejectedCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rejectedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
  },
  rejectedReasonText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
    marginBottom: 10,
  },
  rejectedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reuploadFullBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB43B',
    paddingVertical: 9,
    borderRadius: 8,
  },
  reuploadFullBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  removeBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
  },

  /* Scanning / Reading Document Banner */
  ocrScanningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ocrScanningTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400E',
  },
  ocrScanningSubtitle: {
    fontSize: 11.5,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },

  /* OCR Summary / Toggle Section */
  ocrSummarySection: {
    marginTop: 10,
  },
  ocrToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ocrToggleBtnActive: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
  },
  ocrToggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    minWidth: 0,
  },
  ocrToggleIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  ocrToggleBtnText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#374151',
  },
  ocrToggleBtnTextAlert: {
    color: '#B45309',
  },
  ocrToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
  seeDetailsText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#6B7280',
  },
  ocrExpandedContainer: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D1D5DB',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: 12,
  },

  /* Friendly Notice Callout Box */
  friendlyNoticeBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  friendlyNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  friendlyNoticeTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400E',
  },
  friendlyNoticeText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },

  /* Discrepancy Box */
  discrepancyBox: {
    marginBottom: 8,
  },
  discrepancyBoxHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
  },
  humanDiscrepancyCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  humanFieldBadge: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  humanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  humanRowDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  humanLabel: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
    flexShrink: 0,
    marginRight: 8,
  },
  humanValProfile: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  humanValDoc: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    flex: 1,
    textAlign: 'right',
  },
  profileTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  profileTipText: {
    fontSize: 11.5,
    color: '#6B7280',
    flex: 1,
    lineHeight: 16,
  },

  /* Raw Document Data Collapsible */
  rawDocSection: {
    marginTop: 6,
  },
  rawDocToggleBtn: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  rawDocToggleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  rawDataTable: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 6,
    overflow: 'hidden',
  },
  rawDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rawDataKey: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  rawDataVal: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },

  /* Upload Section */
  uploadSection: {
    marginTop: 6,
  },
  uploadSectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
    marginTop: 4,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
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
    color: '#111827',
    marginBottom: 3,
  },
  uploadSubtitle: {
    fontSize: 11.5,
    color: '#4B5563',
    marginBottom: 2,
  },
  uploadMeta: {
    fontSize: 9.5,
    color: '#9CA3AF',
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
    color: '#6B7280',
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

  /* Footer */
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
    color: '#374151',
  },
});

