import { Contact, InstalledApp } from '../types';

export const MOCK_CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'Alex Vance',
    phone: '+1 (555) 382-9011',
    email: 'alex.vance@techcorp.io',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    relationship: 'Best Friend',
  },
  {
    id: 'c2',
    name: 'Mom',
    phone: '+1 (555) 749-1204',
    email: 'mom.smith@familymail.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    relationship: 'Mother',
  },
  {
    id: 'c3',
    name: 'Sarah Chen',
    phone: '+1 (555) 912-3488',
    email: 'sarah.chen@designstudio.com',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    relationship: 'Design Lead',
  },
  {
    id: 'c4',
    name: 'David Miller',
    phone: '+1 (555) 438-6621',
    email: 'david.miller@acme.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    relationship: 'Manager',
  },
];

export const MOCK_INSTALLED_APPS: InstalledApp[] = [
  {
    packageName: 'com.google.android.youtube',
    name: 'YouTube',
    icon: 'PlaySquare',
    category: 'Media & Video',
    color: '#FF0000',
  },
  {
    packageName: 'com.instagram.android',
    name: 'Instagram',
    icon: 'Camera',
    category: 'Social',
    color: '#E1306C',
  },
  {
    packageName: 'com.whatsapp',
    name: 'WhatsApp',
    icon: 'MessageSquare',
    category: 'Communication',
    color: '#25D366',
  },
  {
    packageName: 'com.google.android.calculator',
    name: 'Calculator',
    icon: 'Calculator',
    category: 'Tools',
    color: '#00E5FF',
  },
  {
    packageName: 'com.spotify.music',
    name: 'Spotify',
    icon: 'Music',
    category: 'Audio & Music',
    color: '#1DB954',
  },
  {
    packageName: 'com.google.android.gm',
    name: 'Gmail',
    icon: 'Mail',
    category: 'Communication',
    color: '#EA4335',
  },
];
