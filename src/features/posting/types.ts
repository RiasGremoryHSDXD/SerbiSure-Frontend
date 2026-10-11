import type { PostingMode } from './postingConfig';

export interface PostScreenProps {
  visible: boolean;
  onClose: () => void;
  mode?: PostingMode;
  token?: string | null;
  onOpenVerification?: () => void;
}
