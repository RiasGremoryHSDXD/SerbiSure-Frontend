import type { Role } from '../../app/roleConfig';

export interface ProfileScreenProps {
  role?: Role;
  avatarUri?: string | null;
  initialView?: 'main' | 'personal_info';
  onUpdateAvatar?: (uri: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
}
