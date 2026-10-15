import React, { useEffect, useState } from 'react';
import { ChatDetailScreen } from '../../chat/components/ChatDetailScreen';
import { UserProfileView } from './UserProfileView';
import type { ProfileMessageTarget, UserProfileViewProps } from './UserProfileView';

export interface UserProfileModalProps extends Omit<UserProfileViewProps, 'onMessage' | 'children'> {
  onMessage?: () => void;
}

// Compose profile-to-chat navigation here. Chat uses the profile view directly.
export function UserProfileModal({ onMessage, ...props }: UserProfileModalProps) {
  const [chatTarget, setChatTarget] = useState<ProfileMessageTarget | null>(null);
  useEffect(() => { setChatTarget(null); }, [props.visible, props.userId]);

  return (
    <UserProfileView {...props} onMessage={target => {
      if (onMessage) onMessage();
      else setChatTarget(target);
    }}>
      {chatTarget && (
        <ChatDetailScreen {...chatTarget} visible onClose={() => setChatTarget(null)} />
      )}
    </UserProfileView>
  );
}
