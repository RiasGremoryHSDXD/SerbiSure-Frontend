interface ReplyRelationshipInput {
  currentIsMine: boolean;
  quotedIsMine?: boolean;
  quotedAuthor?: string;
  partnerName: string;
}

export function isGenericPhotoReply(text: string, imageUri?: string): boolean {
  if (!imageUri) return false;
  return ['photo', '📷 photo', '🖼 photo', '🖼️ photo'].includes(text.trim().toLocaleLowerCase());
}

export function getReplyRelationship({
  currentIsMine,
  quotedIsMine,
  quotedAuthor = '',
  partnerName,
}: ReplyRelationshipInput): string {
  const name = partnerName.trim() || 'User';
  let originalIsMine = quotedIsMine;

  // Older mobile replies store "You" from the sender's point of view.
  if (originalIsMine === undefined) {
    const author = quotedAuthor.trim().toLocaleLowerCase();
    if (author === 'you') originalIsMine = currentIsMine;
    else if (author === name.toLocaleLowerCase()) originalIsMine = false;
    else originalIsMine = !currentIsMine;
  }

  if (currentIsMine) return originalIsMine ? 'You replied to yourself' : `You replied to ${name}`;
  return originalIsMine ? `${name} replied to you` : `${name} replied to themself`;
}
