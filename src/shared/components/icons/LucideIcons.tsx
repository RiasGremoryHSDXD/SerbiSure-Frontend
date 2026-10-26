import { Feather, Ionicons } from '@expo/vector-icons';
import { StyleProp, TextStyle } from 'react-native';

export interface IconProps {
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Lucide-compatible icons with Ionicons fallback for test environments
 */

// Lucide: Bookmark / BookMarked outline
export function BookMarkedIcon({ size = 24, color = '#0D0D11', style }: IconProps) {
  return <Ionicons name="bookmark-outline" size={size} color={color} style={style} />;
}

// Lucide: Bookmark / BookMarked filled
export function BookMarkedFilledIcon({ size = 24, color = '#FFAA77', style }: IconProps) {
  return <Ionicons name="bookmark" size={size} color={color} style={style} />;
}

// Lucide: Bell
export function BellIcon({ size = 24, color = '#0D0D11', style }: IconProps) {
  if (Feather) return <Feather name="bell" size={size} color={color} style={style} />;
  return <Ionicons name="notifications-outline" size={size} color={color} style={style} />;
}

// Lucide: Home
export function HomeIcon({ size = 24, color = '#0D0D11', style }: IconProps) {
  if (Feather) return <Feather name="home" size={size} color={color} style={style} />;
  return <Ionicons name="home-outline" size={size} color={color} style={style} />;
}

// Lucide: Briefcase
export function BriefcaseIcon({ size = 24, color = '#0D0D11', style }: IconProps) {
  if (Feather) return <Feather name="briefcase" size={size} color={color} style={style} />;
  return <Ionicons name="briefcase-outline" size={size} color={color} style={style} />;
}

// Lucide: MessageCircle
export function MessageCircleIcon({ size = 24, color = '#0D0D11', style }: IconProps) {
  if (Feather) return <Feather name="message-circle" size={size} color={color} style={style} />;
  return <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} style={style} />;
}

// Lucide: User
export function UserIcon({ size = 24, color = '#0D0D11', style }: IconProps) {
  if (Feather) return <Feather name="user" size={size} color={color} style={style} />;
  return <Ionicons name="person-outline" size={size} color={color} style={style} />;
}

// Lucide: Plus
export function PlusIcon({ size = 24, color = '#FFFFFF', style }: IconProps) {
  if (Feather) return <Feather name="plus" size={size} color={color} style={style} />;
  return <Ionicons name="add" size={size} color={color} style={style} />;
}

// Lucide: Bookmark
export function BookmarkIcon({ size = 24, color = '#0D0D11', style }: IconProps) {
  if (Feather) return <Feather name="bookmark" size={size} color={color} style={style} />;
  return <Ionicons name="bookmark-outline" size={size} color={color} style={style} />;
}

// Lucide: Search
export function SearchIcon({ size = 20, color = '#71717A', style }: IconProps) {
  if (Feather) return <Feather name="search" size={size} color={color} style={style} />;
  return <Ionicons name="search-outline" size={size} color={color} style={style} />;
}

// Lucide: MapPin
export function MapPinIcon({ size = 14, color = '#71717A', style }: IconProps) {
  if (Feather) return <Feather name="map-pin" size={size} color={color} style={style} />;
  return <Ionicons name="location-outline" size={size} color={color} style={style} />;
}

// Lucide: Star
export function StarIcon({ size = 12, color = '#0D0D11', style }: IconProps) {
  if (Feather) return <Feather name="star" size={size} color={color} style={style} />;
  return <Ionicons name="star" size={size} color={color} style={style} />;
}
