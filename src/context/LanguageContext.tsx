import React, { createContext, useContext, useState } from 'react';

export type Language = 'English' | 'Tagalog' | 'Bisaya' | 'Cebuano';

export interface Translations {
  // Tabs
  tabHome: string;
  tabServices: string;
  tabJobs: string;
  tabChats: string;
  tabProfile: string;

  // Profile Screen
  personalInfo: string;
  passwordsSecurity: string;
  getVerified: string;
  notifications: string;
  language: string;
  aboutUs: string;
  privacyPolicy: string;
  logout: string;
  setStatus: string;
  available: string;
  onJob: string;
  aboutTitle: string;
  recentReviews: string;
  viewAll: string;
  noReviewsYet: string;
  noReviewsSubtitle: string;
  workerSentiment: string;
  clientSentiment: string;
  positive: string;

  // Home Screen
  greeting: string;
  searchPlaceholder: string;
  popularServices: string;
  featuredWorkers: string;
  topEmployers: string;

  // Chats Screen
  chatsHeader: string;
  searchChats: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  English: {
    tabHome: 'Home',
    tabServices: 'Services',
    tabJobs: 'Jobs',
    tabChats: 'Chats',
    tabProfile: 'Profile',

    personalInfo: 'Personal Info',
    passwordsSecurity: 'Passwords & Security',
    getVerified: 'Get Verified',
    notifications: 'Notifications',
    language: 'Language',
    aboutUs: 'About Us',
    privacyPolicy: 'Privacy Policy',
    logout: 'Log out',
    setStatus: 'Status',
    available: 'Available',
    onJob: 'On the Job',
    aboutTitle: 'About',
    recentReviews: 'Recent Reviews',
    viewAll: 'View All',
    noReviewsYet: 'No reviews yet',
    noReviewsSubtitle: 'Reviews from completed bookings will appear here.',
    workerSentiment: 'Worker Sentiment',
    clientSentiment: 'Client Sentiment',
    positive: 'Positive',

    greeting: 'Hello',
    searchPlaceholder: 'Search services...',
    popularServices: 'Popular Services',
    featuredWorkers: 'Featured Kasambahay',
    topEmployers: 'Top Homeowners',

    chatsHeader: 'Messages',
    searchChats: 'Search conversations...',
  },
  Tagalog: {
    tabHome: 'Bahay',
    tabServices: 'Mga Serbisyo',
    tabJobs: 'Mga Trabaho',
    tabChats: 'Mga Chat',
    tabProfile: 'Propayl',

    personalInfo: 'Impormasyon sa Sarili',
    passwordsSecurity: 'Password at Seguridad',
    getVerified: 'Kumuha ng Biyeripikasyon',
    notifications: 'Mga Abiso',
    language: 'Wika',
    aboutUs: 'Tungkol sa Amin',
    privacyPolicy: 'Patakaran sa Privacy',
    logout: 'Mag-log out',
    setStatus: 'Estatuwa',
    available: 'Nakahanda',
    onJob: 'May Trabaho',
    aboutTitle: 'Tungkol kay',
    recentReviews: 'Mga Huling Rebyu',
    viewAll: 'Ipakita Lahat',
    noReviewsYet: 'Wala pang rebyu',
    noReviewsSubtitle: 'Dito lalabas ang mga rebyu mula sa natapos na mga booking.',
    workerSentiment: 'Saloobin ng Manggagawa',
    clientSentiment: 'Saloobin ng Kliyente',
    positive: 'Positibo',

    greeting: 'Kamusta',
    searchPlaceholder: 'Maghanap ng serbisyo...',
    popularServices: 'Mga Sikat na Serbisyo',
    featuredWorkers: 'Mga Tampok na Kasambahay',
    topEmployers: 'Mga Nangungunang Employer',

    chatsHeader: 'Mga Mensahe',
    searchChats: 'Maghanap ng pag-uusap...',
  },
  Bisaya: {
    tabHome: 'Balay',
    tabServices: 'Mga Serbisyo',
    tabJobs: 'Mga Trabaho',
    tabChats: 'Mga Chat',
    tabProfile: 'Propayl',

    personalInfo: 'Impormasyon sa Kaugalingon',
    passwordsSecurity: 'Password ug Siguridad',
    getVerified: 'Magpa-Biyeripikar',
    notifications: 'Mga Pahibalo',
    language: 'Pinulongan',
    aboutUs: 'Tungkol sa Amoa',
    privacyPolicy: 'Polisiya sa Pribasya',
    logout: 'Mag-log out',
    setStatus: 'Estatuwa',
    available: 'Makuha',
    onJob: 'Naa sa Trabaho',
    aboutTitle: 'Tungkol kang',
    recentReviews: 'Mga Bag-ong Rebyu',
    viewAll: 'Ipakita Tanan',
    noReviewsYet: 'Wala pay rebyu',
    noReviewsSubtitle: 'Dinhi makita ang mga rebyu gikan sa nahuman nga mga booking.',
    workerSentiment: 'Saloobin sa Trabahante',
    clientSentiment: 'Saloobin sa Kliyente',
    positive: 'Positibo',

    greeting: 'Maayong Adlaw',
    searchPlaceholder: 'Pangita og serbisyo...',
    popularServices: 'Inilang mga Serbisyo',
    featuredWorkers: 'Mga Tampok nga Kasambahay',
    topEmployers: 'Mga Pangunang Homeowner',

    chatsHeader: 'Mga Mensahe',
    searchChats: 'Pangita og istorya...',
  },
  Cebuano: {
    tabHome: 'Balay',
    tabServices: 'Mga Serbisyo',
    tabJobs: 'Mga Trabaho',
    tabChats: 'Mga Chat',
    tabProfile: 'Propayl',

    personalInfo: 'Impormasyon sa Kaugalingon',
    passwordsSecurity: 'Password ug Siguridad',
    getVerified: 'Magpa-Biyeripikar',
    notifications: 'Mga Pahibalo',
    language: 'Pinulongan',
    aboutUs: 'Tungkol sa Amoa',
    privacyPolicy: 'Polisiya sa Pribasya',
    logout: 'Mag-log out',
    setStatus: 'Estatuwa',
    available: 'Makuha',
    onJob: 'Naa sa Trabaho',
    aboutTitle: 'Tungkol kang',
    recentReviews: 'Mga Bag-ong Rebyu',
    viewAll: 'Ipakita Tanan',
    noReviewsYet: 'Wala pay rebyu',
    noReviewsSubtitle: 'Dinhi makita ang mga rebyu gikan sa nahuman nga mga booking.',
    workerSentiment: 'Saloobin sa Trabahante',
    clientSentiment: 'Saloobin sa Kliyente',
    positive: 'Positibo',

    greeting: 'Maayong Adlaw',
    searchPlaceholder: 'Pangita og serbisyo...',
    popularServices: 'Inilang mga Serbisyo',
    featuredWorkers: 'Mga Tampok nga Kasambahay',
    topEmployers: 'Mga Pangunang Homeowner',

    chatsHeader: 'Mga Mensahe',
    searchChats: 'Pangita og istorya...',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'English',
  setLanguage: () => {},
  t: TRANSLATIONS.English,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('English');
  const t = TRANSLATIONS[language] || TRANSLATIONS.Bisaya || TRANSLATIONS.English;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
