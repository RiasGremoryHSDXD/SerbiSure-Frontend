import type { Role } from '../../app/roleConfig';

export interface ProfileScreenProps {
  role?: Role;
  avatarUri?: string | null;
  initialView?: 'main' | 'personal_info';
  onViewChange?: (view: 'main' | 'personal_info') => void;
  onUpdateAvatar?: (uri: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
  onBookingsPress?: () => void;
}
