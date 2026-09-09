import React, { useState } from 'react';
import { ShieldCheck, Eye, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const DocumentPreview: React.FC = () => {
  const { verifications, selectedVerificationId, approveVerification, rejectVerification } = useAdmin();
  const [rejectReason, setRejectReason] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const selectedItem = verifications.find(v => v.id === selectedVerificationId) || verifications[0];

  if (!selectedItem) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex items-center justify-center h-full text-slate-400 text-sm">
        Select a verification request to preview.
      </div>
    );
  }

  const handleApprove = () => {
    approveVerification(selectedItem.id);
    setFeedbackMessage(`Approved ${selectedItem.name}'s ${selectedItem.documentType}`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleReject = () => {
    rejectVerification(selectedItem.id, rejectReason || 'Document criteria not met');
    setFeedbackMessage(`Rejected ${selectedItem.name}'s document`);
    setRejectReason('');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col justify-between h-full">
      <div>
        {/* Title */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">
            Document Preview
          </h3>
          <span className="text-xs font-bold text-slate-400">
            Brgy. {selectedItem.barangay}
          </span>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div className="my-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Document Visual Scan Representation */}
        <div className="relative mt-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
          {/* Clearance Document Replica Header */}
          <div className="p-4 bg-linear-to-b from-[#F7F7F7] to-[#ECECEC] border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#C05621]" />
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                Philippine National Police Clearance Certificate
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              No: 855142
            </span>
          </div>

          {/* Document Sample Imagery / Canvas */}
          <div className="p-5 flex flex-col items-center justify-center bg-[#FAFAF8] relative min-h-[140px]">
            {/* Watermark Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
              <span className="text-6xl font-black rotate-12 uppercase text-slate-900">
                REPUBLIC OF THE PHILIPPINES
              </span>
            </div>

            {/* Document Details Grid */}
            <div className="w-full grid grid-cols-3 gap-3 relative z-10">
              <div className="col-span-1 border-2 border-dashed border-slate-300 rounded-xl p-2 flex flex-col items-center justify-center bg-white shadow-2xs">
                <img
                  src={selectedItem.avatar}
                  alt={selectedItem.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                  Biometric Scan
                </span>
              </div>

              <div className="col-span-2 space-y-1.5 text-xs text-slate-700">
                <div className="font-bold text-slate-900 uppercase">
                  {selectedItem.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold">Barangay:</span> {selectedItem.barangay}, Cagayan de Oro City
                </div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold">Purpose:</span> Domestic Labor Registration (RA 10361)
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  <span className="font-semibold">Control Key:</span> 7784-9021-3382
                </div>
              </div>
            </div>
          </div>

          {/* Hover Zoom Prompt */}
          <div className="p-2.5 bg-slate-900/80 text-white text-[11px] font-bold flex items-center justify-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            <span>High-Resolution Cloudinary Scan Verified</span>
          </div>
        </div>

        {/* User Metadata & Face Liveness Card */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={selectedItem.avatar}
                alt={selectedItem.name}
                className="w-12 h-12 rounded-full object-cover shadow-xs border-2 border-[#F5A623]"
              />
              <div>
                <h4 className="text-base font-extrabold text-slate-900">
                  {selectedItem.name}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full w-fit mt-0.5">
                  <Sparkles className="w-3 h-3" />
                  <span>MediaPipe Liveness: {selectedItem.faceLivenessMatchScore || 99.2}% Match</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details list matching mockup */}
          <div className="space-y-2 text-xs pt-2">
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="font-semibold text-slate-500">ID Type:</span>
              <span className="font-bold text-[#F5A623]">{selectedItem.documentType}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="font-semibold text-slate-500">ID Number:</span>
              <span className="font-bold text-[#F5A623] font-mono">{selectedItem.documentNumber}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="font-semibold text-slate-500">Date Issued:</span>
              <span className="font-bold text-[#F5A623]">{selectedItem.issuedDate}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="font-semibold text-slate-500">Validity:</span>
              <span className="font-bold text-[#F5A623]">{selectedItem.validityDate}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-semibold text-slate-500">Status:</span>
              <span className="font-bold text-[#F5A623]">{selectedItem.recordStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons & Rejection Reason Form */}
      <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleReject}
            className="w-full py-2.5 rounded-xl border-2 border-[#F5A623] text-[#F5A623] hover:bg-[#FFF8EB] text-xs font-black tracking-wider uppercase transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            <span>REJECT</span>
          </button>
          
          <button
            onClick={handleApprove}
            className="w-full py-2.5 rounded-xl bg-[#F5A623] hover:bg-[#E09214] text-white text-xs font-black tracking-wider uppercase transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>APPROVE</span>
          </button>
        </div>

        {/* Reason Textarea matching Mockup #3 */}
        <div>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="REASON (OPTIONAL)"
            rows={2}
            className="w-full p-3 bg-[#F8F9FC] border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 uppercase focus:outline-none focus:ring-2 focus:ring-[#F5A623]/30 resize-none font-medium"
          />
        </div>
      </div>
    </div>
  );
};
