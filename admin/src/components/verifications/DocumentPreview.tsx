import React, { useState, useEffect } from 'react';
import { Eye, CheckCircle, XCircle, AlertTriangle, X, FileText, RotateCcw, RotateCw, Send, ExternalLink, Copy, Check } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const DocumentPreview: React.FC = () => {
  const { 
    verifications, 
    selectedVerificationId, 
    approveVerification, 
    rejectVerification, 
    resetVerification 
  } = useAdmin();
  const [rejectReason, setRejectReason] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [idSide, setIdSide] = useState<'front' | 'back'>('front');
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);

  const selectedItem = verifications.find(v => v.id === selectedVerificationId) || verifications[0];

  useEffect(() => {
    setIdSide('front');
    setImageRotation(0);
    setCopiedNumber(false);
  }, [selectedVerificationId]);

  if (!selectedItem) {
    return (
      <div className="bg-white rounded-3xl p-8 flex items-center justify-center h-full text-zinc-400 text-sm font-medium">
        Select a verification request to preview.
      </div>
    );
  }

  const handleApprove = async () => {
    await approveVerification(selectedItem.id);
    setFeedbackMessage(`Approved ${selectedItem.name}'s ${selectedItem.documentType}`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleReject = async () => {
    await rejectVerification(selectedItem.id, rejectReason || 'Document criteria not met');
    setFeedbackMessage(`Rejected ${selectedItem.name}'s document`);
    setRejectReason('');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleReset = async () => {
    await resetVerification(selectedItem.id);
    setFeedbackMessage(`Reset ${selectedItem.name}'s document to Pending Review`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const ocrData = selectedItem.ocrExtractedData;

  // Dual-sided support (e.g. National ID Front & Back)
  const hasBackImage = Boolean(selectedItem.documentImageBack);
  const activeImageUrl = (idSide === 'back' && hasBackImage)
    ? selectedItem.documentImageBack
    : selectedItem.documentImage;

  // Dynamic values strictly extracted from OCR or verified record (zero hardcoded values)
  const isNationalId = selectedItem.documentType?.toLowerCase().includes('national id') || (selectedItem.rawDocumentType || '').toLowerCase().includes('national_id') || hasBackImage;
  
  // OCR Name extraction: strictly from OCR data, never falling back to profile username/account name
  const ocrExtractedName = 
    ocrData?.full_name ||
    [ocrData?.first_name, ocrData?.middle_name, ocrData?.last_name].filter(Boolean).join(' ') ||
    (ocrData?.name ? String(ocrData.name) : undefined);
  const idName = ocrExtractedName || 'Not Detected in OCR';

  const docNumber = ocrData?.clearance_number || ocrData?.philsys_number || ocrData?.document_number || selectedItem.documentNumber || 'Not Detected';
  
  // PhilSys National IDs do not have an issuance date printed on the card
  const issuedDate = isNationalId 
    ? 'N/A (PhilSys National ID)' 
    : (ocrData?.date_issued || selectedItem.issuedDate || 'Not Detected');
  
  const rawValidity = ocrData?.valid_until || selectedItem.validityDate;
  const validityDate = isNationalId 
    ? 'Permanent' 
    : (rawValidity && rawValidity !== 'Not Detected' ? rawValidity : 'Not Detected');

  const resolvedIdType = isNationalId ? 'National ID' : (selectedItem.documentType || ocrData?.document_type_label || 'Government ID');

  const docTypeLower = (selectedItem.documentType || selectedItem.rawDocumentType || resolvedIdType || '').toLowerCase();
  const isNbi = docTypeLower.includes('nbi');
  const isPolice = docTypeLower.includes('police') || docTypeLower.includes('pnp');
  const numberLabel = isNbi ? 'Transaction Number' : 'ID Number';

  const handleCopyNumber = () => {
    if (docNumber && docNumber !== 'Not Detected') {
      navigator.clipboard.writeText(docNumber);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    }
  };

  const formatOcrDate = (val?: string) => {
    if (!val || val === 'Not Detected' || val === 'N/A') return 'Not Detected';
    if (val === 'Permanent (PhilSys)' || val === 'Permanent') return 'Permanent';
    if (val.includes('PhilSys') || val.includes('N/A')) return val;
    if (/^[A-Za-z]{3}\s+\d{1,2},\s+\d{4}$/.test(val)) return val;
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {}
    return val;
  };

  return (
    <>
      <div className="bg-white rounded-3xl p-8 flex flex-col justify-between h-full">
        <div>
          {/* Title and Barangay */}
          <div className="flex items-center justify-between pb-5">
            <h3 className="text-xl font-black font-display text-[#0D0D11] tracking-tight">
              Document Preview
            </h3>
            <span className="text-xs font-bold font-display text-zinc-400 bg-[#F0F0EC] px-3 py-1 rounded-full">
              Brgy. {selectedItem.barangay || 'Pagatpat'}
            </span>
          </div>

          {/* Feedback Alert Toast */}
          {feedbackMessage && (
            <div className="my-3 p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {/* Clean Scanned Image Preview Card */}
          <div 
            onClick={() => setShowImageModal(true)}
            className="relative mt-2 rounded-3xl overflow-hidden bg-zinc-100 hover:bg-zinc-200/70 transition-colors group cursor-pointer"
            title="Click to expand full resolution scan"
          >
            {selectedItem.documentImage ? (
              <div className="relative h-[220px] flex items-center justify-center p-3">
                <img
                  src={selectedItem.documentImage}
                  alt={`${selectedItem.name} ${selectedItem.documentType}`}
                  className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-200 rounded-2xl"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold font-display backdrop-blur-[2px]">
                  <Eye className="w-4 h-4" />
                  <span>Click to Zoom Scan</span>
                </div>
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-zinc-400 text-xs bg-zinc-50">
                <FileText className="w-8 h-8 mb-2" />
                <span className="font-medium">No scan image available</span>
              </div>
            )}
          </div>

          {/* User Metadata & Face Liveness Card */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-full overflow-hidden shrink-0 bg-zinc-200 flex items-center justify-center">
                  {selectedItem.avatar ? (
                    <img
                      src={selectedItem.avatar}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="font-bold text-xs text-zinc-600 font-display">
                      {selectedItem.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-base font-black font-display text-[#0D0D11]">
                    {selectedItem.name}
                  </h4>
                  <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-0.5 bg-zinc-100 text-zinc-600">
                    {selectedItem.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Details list (Clean, airy key-value block without grey zebra stripes) */}
            <div className="space-y-2.5 text-xs pt-3 border-t border-zinc-100">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-display">ID Name</span>
                <span className="font-bold text-[#0D0D11] text-xs font-display">{idName}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-display">ID Type</span>
                <span className="font-bold text-[#0D0D11] text-xs font-display">{resolvedIdType}</span>
              </div>
              <div className="py-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-display">
                    {numberLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-zinc-800 text-xs">{docNumber}</span>
                    {docNumber && docNumber !== 'Not Detected' && (
                      <button
                        type="button"
                        onClick={handleCopyNumber}
                        title={copiedNumber ? "Copied!" : "Copy to clipboard"}
                        className="p-1 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer border-0"
                      >
                        {copiedNumber ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Direct External Verification Portal Link */}
                {(isNbi || isPolice) && (
                  <div className="flex justify-end pt-1 pb-0.5">
                    <a
                      href={isNbi ? "https://verification.nbi-clearance.io" : "https://pnpclearance.ph/#call-to-action"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFF4ED] hover:bg-[#FFE5D6] text-[#FFB380] hover:text-[#F5A066] rounded-full text-[11px] font-black font-display transition-all cursor-pointer border-0"
                      title={`Open official ${isNbi ? 'NBI' : 'PNP'} clearance verification portal`}
                    >
                      <span>Verify on {isNbi ? 'NBI Portal' : 'PNP Portal'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-display">Date Issued</span>
                <span className="font-medium text-zinc-700 text-xs">{formatOcrDate(issuedDate)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-display">Validity</span>
                <span className="font-medium text-zinc-700 text-xs">{formatOcrDate(validityDate)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-display">Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-display ${
                  selectedItem.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' :
                  selectedItem.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'
                }`}>
                  {selectedItem.status === 'PENDING / REVIEW' ? 'In Review' : selectedItem.status}
                </span>
              </div>
            </div>

            {/* Discrepancies if any */}
            {selectedItem.ocrDiscrepancies && selectedItem.ocrDiscrepancies.length > 0 && (
              <div className="mt-2 p-3 bg-amber-50 rounded-2xl space-y-1">
                <div className="flex items-center gap-1 text-amber-900 text-[11px] font-black font-display">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Flagged Discrepancies ({selectedItem.ocrDiscrepancies.length})</span>
                </div>
                {selectedItem.ocrDiscrepancies.map((disc, idx) => (
                  <div key={idx} className="text-[11px] text-amber-900/80 pl-4 list-disc font-medium">
                    • {disc.message || `${disc.field}: expected '${disc.profile_value}', got '${disc.document_value}'`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons & Status Lifecycle Controls */}
        <div className="mt-6 pt-4 space-y-3">
          {selectedItem.status === 'REJECTED' ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-rose-50 rounded-2xl text-xs text-rose-800">
                <div className="font-black font-display flex items-center gap-1.5 text-rose-700">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Document Currently Rejected</span>
                </div>
                {selectedItem.notes && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium pl-5">
                    Reason: {selectedItem.notes}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-3 rounded-full bg-[#F0F0EC] text-zinc-800 hover:bg-[#E5E5E0] text-xs font-black font-display tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                  <span>RESET</span>
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black font-display tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>OVERRIDE</span>
                </button>
              </div>
            </div>
          ) : selectedItem.status === 'VERIFIED' ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 rounded-2xl text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2 font-black font-display">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Document Verified</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Re-open
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 rounded-full bg-[#F0F0EC] text-zinc-700 hover:bg-[#E5E5E0] text-xs font-black font-display transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                <span>Move to Pending Review</span>
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleReject}
                  className="w-full py-3.5 rounded-full bg-[#0D0D11] hover:bg-black text-white text-xs font-black font-display tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
                >
                  <XCircle className="w-4 h-4" />
                  <span>REJECT</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleApprove}
                  className="w-full py-3.5 rounded-full bg-[#FFB380] hover:bg-[#F5A066] text-white text-xs font-black font-display tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>APPROVE</span>
                </button>
              </div>

              {/* Optional Reason Input with Integrated Send Button */}
              <div className="relative flex items-center bg-zinc-100 rounded-full p-1 pl-4 focus-within:ring-2 focus-within:ring-[#FFB380]/40 transition-all">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleReject();
                    }
                  }}
                  placeholder="Optional rejection reason..."
                  className="w-full py-2 bg-transparent text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none font-medium border-0"
                />
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-4 py-2 bg-[#0D0D11] hover:bg-black text-white text-xs font-black font-display rounded-full flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer border-0 shrink-0"
                  title="Submit Rejection"
                >
                  <span>Send</span>
                  <Send className="w-3 h-3 text-[#FFB380]" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-Screen Zoom Modal for Cloudinary Document Scan */}
      {showImageModal && activeImageUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0D0D11] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h4 className="font-black font-display text-sm">{selectedItem.name} — {selectedItem.documentType}</h4>
                  <p className="text-[11px] text-zinc-400 font-medium">Authenticated Scan</p>
                </div>
                {hasBackImage && (
                  <div className="flex items-center gap-1 bg-zinc-800 p-1 rounded-full">
                    <button
                      type="button"
                      onClick={() => { setIdSide('front'); setImageRotation(0); }}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        idSide === 'front' ? 'bg-white text-zinc-900' : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      Front Side
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIdSide('back'); setImageRotation(0); }}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        idSide === 'back' ? 'bg-white text-zinc-900' : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      Back Side
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                  className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Rotate Scan 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate ({imageRotation}°)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[80vh] overflow-auto flex items-center justify-center bg-[#0D0D11]">
              <img
                src={activeImageUrl}
                alt={`Document Full Scan ${idSide}`}
                style={{ transform: `rotate(${imageRotation}deg)`, transition: 'transform 0.25s ease' }}
                className="max-h-[75vh] w-auto object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
