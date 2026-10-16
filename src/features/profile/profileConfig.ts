export const PROFILE_COPY = {
  homeowner: {
    name: 'Homeowner', addTags: 'Describe your household', aboutSubtitle: 'Tell workers about your home',
    addBio: 'Add your bio', emptyBio: 'Tell workers about your family and expectations...',
    pendingPosts: 'Your job posts waiting for worker acceptance or proposals',
    emptyPosts: "You don't have any pending job posts right now. Posts you publish will appear here while waiting for worker applications.",
    waiting: 'Waiting for worker acceptance', reviewer: 'Verified Worker', reviewTitle: 'Worker Reviews',
    bookingTitle: 'My Bookings & Hires', bookingIcon: 'calendar',
    pendingTitle: 'ID Verification Pending', pendingDescription: 'Your National ID is under review. Tap to check status.',
    bioHelp: "Write a short bio describing your household, preferences, or what you're looking for in a Kasambahay (up to 500 characters).",
    bioPlaceholder: 'e.g. I am a homeowner looking for a reliable, honest helper who can assist with daily housekeeping...',
    sentimentKey: 'workerSentiment',
  },
  kasambahay: {
    name: 'Kasambahay', addTags: 'Add your skills & preferences', aboutSubtitle: 'Tell clients about yourself',
    addBio: 'Write your bio', emptyBio: 'Share your experience, work ethic, and background...',
    pendingPosts: 'Your posts waiting for client acceptance or review',
    emptyPosts: "You don't have any pending posts right now. Posts you publish will appear here while waiting for partner acceptance.",
    waiting: 'Waiting for client acceptance', reviewer: 'Verified Client', reviewTitle: 'Client Reviews',
    bookingTitle: 'My Jobs & Contracts', bookingIcon: 'briefcase',
    pendingTitle: 'Document Verification Pending', pendingDescription: 'Your uploaded clearances are under review. Tap to check status.',
    bioHelp: 'Write a short bio describing your background, skills, or experience (up to 500 characters).',
    bioPlaceholder: 'e.g. Hi! I have 5 years of housekeeping and cooking experience in Cagayan de Oro...',
    sentimentKey: 'clientSentiment',
  },
} as const;

export function localizeProfileCopy(role: keyof typeof PROFILE_COPY, translate: (source: string) => string) {
  const copy = PROFILE_COPY[role];
  return {
    ...copy,
    name: translate(copy.name), addTags: translate(copy.addTags), aboutSubtitle: translate(copy.aboutSubtitle),
    addBio: translate(copy.addBio), emptyBio: translate(copy.emptyBio), pendingPosts: translate(copy.pendingPosts),
    emptyPosts: translate(copy.emptyPosts), waiting: translate(copy.waiting), reviewer: translate(copy.reviewer),
    reviewTitle: translate(copy.reviewTitle), bookingTitle: translate(copy.bookingTitle), pendingTitle: translate(copy.pendingTitle),
    pendingDescription: translate(copy.pendingDescription), bioHelp: translate(copy.bioHelp), bioPlaceholder: translate(copy.bioPlaceholder),
  };
}
