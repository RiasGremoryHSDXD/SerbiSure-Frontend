# SerbiSure Capstone QA Matrix & Validation Verification

**Document Version:** 1.0 (Post-QA Milestone)  
**Target Document:** [Google Docs Capstone Documentation](https://docs.google.com/document/d/1wHYezngSnU7cglM5fQtchAVDtKmQ8Xs41lGWLCZkPlc/edit?tab=t.0)  
**System Tested:** SerbiSure Full-Stack Mobile Platform (React Native Expo + Django REST API)

---

## 1. Updated Capstone Module QA Matrix

| No. | User Role | Feature or Module | Previous Status | Current Status | QA Result | Technical Validation Notes |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | Kasambahay | Registration | Ready to Deploy | **Ready to Deploy** | **PASSED** | Multi-step form with phone validation, BCrypt password hashing, and user role separation. |
| **2** | Kasambahay | Login and Authentication | Ready to Deploy | **Ready to Deploy** | **PASSED** | JWT token authentication, secure AsyncStorage token persistence, auto-refresh mechanism. |
| **3** | Kasambahay | Clearance Document Upload (NBI & Police) | Not Yet Tested | **Ready to Deploy** | **PASSED** | Multi-file upload, secure Cloudinary integration, document format checks (JPEG/PNG/PDF). |
| **4** | Kasambahay | Facial Liveness Detection | Not Yet Tested | **Ready to Deploy** | **PASSED** | Real-time VisionCamera & Skia liveness machine, blink/turn/smile verification, **strictly non-skippable** under RA 10361. |
| **5** | Kasambahay | Submit Police and NBI Clearance | Not Yet Tested | **Ready to Deploy** | **PASSED** | OCR pre-validation with Google Vision, automatic tamper detection, and verification queue insertion. |
| **6** | Kasambahay | Booking Initiation Workflow | Not Yet Tested | **Ready to Deploy** | **PASSED** | Homeowner discloses full terms (salary, schedule, tasks); Kasambahay receives explicit **Accept** and **Decline** options. |
| **7** | Kasambahay | Chat | Ready to Deploy | **Ready to Deploy** | **PASSED** | Real-time messaging, encrypted payload, photo sharing under 10MB, reactions, swipe-to-reply. |
| **8** | Kasambahay | Booking Search and Filtering Subsystem | Ready to Deploy | **Ready to Deploy** | **PASSED** | Filter by service type, location, minimum wage compliance, stay-in vs. part-time tags. |
| **9** | Kasambahay | CSV Data Extraction | Not Yet Tested | **Ready to Deploy** | **PASSED** | Backend export utilities for user records, contract history, and wage compliance auditing. |
| **10** | Kasambahay | Localization Configuration | Not Yet Tested | **Ready to Deploy** | **PASSED** | English, Tagalog, and Cebuano/Bisaya translations via `LanguageContext` across all screens. |
| **11** | Kasambahay | Biography Management | Not Yet Tested | **Ready to Deploy** | **PASSED** | Profile bio edit, skill highlights, service specialties, and digital resume sync. |
| **12** | Kasambahay | Tagging | Not Yet Tested | **Ready to Deploy** | **PASSED** | Skill and service categorization tags (`Cleaning`, `Child_care`, `Cooking`, `Laundry`, `All-around`). |
| **14** | Kasambahay | NLP Sentiment Classification Engine | *Under Development* | **Ready to Deploy** | **PASSED** | **Live Hugging Face Space Connected** (`riasgremory2-serbisure-sentiment-api.hf.space`) with local multi-lingual fallback. |
| **15** | Kasambahay | Review / Feedback | *Under Development* | **Ready to Deploy** | **PASSED** | **Mandatory post-contract prompt** upon job completion; rating, unstructured feedback, and sentiment scoring. |
| **16** | Homeowner | Registration | Ready to Deploy | **Ready to Deploy** | **PASSED** | Role-tailored onboarding, address verification, and account creation. |
| **17** | Homeowner | Login and Authentication | Ready to Deploy | **Ready to Deploy** | **PASSED** | Secure authentication and session management. |
| **18** | Homeowner | Clearance Document Upload (National ID) | Ready to Deploy | **Ready to Deploy** | **PASSED** | Government ID capture, image dimension validation, secure cloud upload. |
| **19** | Homeowner | Facial Liveness Detection | Ready to Deploy | **Ready to Deploy** | **PASSED** | Biometric selfie validation, profile photo locked to verified camera capture (gallery upload disabled). |
| **20** | Homeowner | Post Booking | Not Yet Tested | **Ready to Deploy** | **PASSED** | Job post creation with daily/monthly rates validated against Philippine Regional Minimum Wage standards. |
| **21** | Homeowner | Booking Search and Filtering Subsystem | Not Yet Tested | **Ready to Deploy** | **PASSED** | Search by category, experience, rating score, and proximity. |
| **22** | Homeowner | Messaging System | Not Yet Tested | **Ready to Deploy** | **PASSED** | Bidirectional chat, image attachment, booking card integration, unread tracking. |
| **23** | Homeowner | Localization Configuration | Not Yet Tested | **Ready to Deploy** | **PASSED** | Dynamic multi-lingual interface support (En / Tag / Bis). |
| **24** | Homeowner | CSV Data | Not Yet Tested | **Ready to Deploy** | **PASSED** | Booking expense reporting and employment summary downloads. |
| **25** | Homeowner | Biography Management | Not Yet Tested | **Ready to Deploy** | **PASSED** | Employer profile details, household specifications, and family context. |
| **26** | Homeowner | Tagging | Not Yet Tested | **Ready to Deploy** | **PASSED** | Custom service requirement tagging for targeted worker matching. |
| **27** | Homeowner | NLP Sentiment Classification Engine | *Under Development* | **Ready to Deploy** | **PASSED** | Live AI sentiment engine evaluating homeowner ratings and feedback using Hugging Face XLM-RoBERTa / FiReCS. |
| **28** | Homeowner | Review / Feedback | *Under Development* | **Ready to Deploy** | **PASSED** | Enforced mandatory feedback upon service completion before new bookings can be initiated. |
| **29** | Super Admin | Barangay Account Creation | Ready to Deploy | **Ready to Deploy** | **PASSED** | Multi-tenant administrative structure for local government / barangay verification officers. |
| **30** | Admin / Super Admin | Login and Authentication | Ready to Deploy | **Ready to Deploy** | **PASSED** | Role-based access control (RBAC), permission boundaries, and 2FA support. |
| **31** | Admin / Super Admin | Dashboard | Ready to Deploy | **Ready to Deploy** | **PASSED** | High-level metrics: verified users, active contracts, pending liveness reviews, dispute tracking. |
| **32** | Admin / Super Admin | OCR Data Extraction | Ready to Deploy | **Ready to Deploy** | **PASSED** | Automated OCR parsing of Philippine IDs, confidence threshold checks, and manual override queue. |
| **33** | Admin / Super Admin | Audit Log | Ready to Deploy | **Ready to Deploy** | **PASSED** | Immutable event logging: verification approvals, contract creations, and dispute actions. |
| **34** | Admin / Super Admin | Document Validation Workflow | Ready to Deploy | **Ready to Deploy** | **PASSED** | Side-by-side comparison of user selfie vs. government ID photo with approve/reject workflow. |
| **35** | Admin / Super Admin | Messaging System | Ready to Deploy | **Ready to Deploy** | **PASSED** | Support escalation messaging between administrators, homeowners, and domestic workers. |

---

## 2. Core Feature Implementations & Fixes

### A. FB Marketplace-Style Post Closure
- **Mechanism**: When an applicant is accepted and contract formalized via `BookingAcceptView` or proposal response, the backend triggers `notify_other_applicants_listing_closed`.
- **In-App Notification**: Other applicants receive `"The job listing for ... has been filled and is now closed."`
- **System Message**: Automated `[LISTING_CLOSED]` chat message dispatched to all existing applicant threads.
- **Client UI**: Displays a gray/slate closed card with padlock badge and `CLOSED` tag. Job post CTA becomes disabled: `Listing Closed (Position Filled)`.

### B. Profile Picture Lock & Mandatory Biometric Camera Verification
- **Gallery Upload Disabled**: In `homeowner/ProfileScreen.tsx` and `kasambahay/ProfileScreen.tsx`, tapping the profile picture alerts that the photo is biometrically verified under RA 10361. The camera overlay icon is replaced with a green `shield-checkmark` badge.
- **Non-Skippable Liveness**: `onSkip` removed from `LivenessScreen.tsx`. Cancel attempts display an alert confirming mandatory verification. `App.tsx` requires successful verification to advance to registration completion.

### C. Booking Logic & Role Separation
- **Homeowner Creation**: Configures terms (salary, schedule, tasks, location) and sends proposal. Homeowners cannot accept or decline their own offer. When active, card displays `"Offer Sent • Waiting for Kasambahay response"`.
- **Kasambahay Response**: Distinct `"Decline"` and `"Agree & Accept"` action buttons.
- **Decline Handling**: Updates message state to `BOOKING DECLINED` and notifies homeowner.
- **Accept Handling**: Updates to `BOOKING CONFIRMED` (Contract Active), marks post closed in `savedJobsStore`.

### D. Hugging Face NLP Sentiment Analysis & Mandatory Feedback
- **Live Hugging Face Space**: Connected to `https://riasgremory2-serbisure-sentiment-api.hf.space` via Gradio API protocol (`/gradio_api/call/predict`) with Bearer token authentication (`HUGGINGFACE_API_TOKEN`).
- **Real-Time Interactive Prediction**: Debounced (600ms) prediction in `ReviewModal.tsx` displaying live badge: `Hugging Face NLP: [Positive/Neutral/Negative] · {Confidence %}`.
- **Multi-Lingual Fallback**: Local lexicon covering Cebuano/Bisaya (*maayo, kugihan, buotan, tapulan, bastos*), Tagalog, and English.
- **Server Verification**: In `backend/reviews/sentiment_service.py` and `backend/reviews/serializers.py`, automatic sentiment validation occurs before database commit.
- **Mandatory Feedback Prompt**: Enforced upon job completion in `MyBookingsModal.tsx` (`handleComplete`) with top reminder banner.
