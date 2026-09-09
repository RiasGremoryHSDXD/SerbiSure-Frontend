import React from 'react';
import { VerificationQueue } from '../components/verifications/VerificationQueue';
import { DocumentPreview } from '../components/verifications/DocumentPreview';

export const VerificationsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Verification Queue
        </h1>
      </div>

      {/* Grid matching Mockup #3 (Active Requests on Left, Document Preview on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7">
          <VerificationQueue />
        </div>
        <div className="lg:col-span-5">
          <DocumentPreview />
        </div>
      </div>
    </div>
  );
};
