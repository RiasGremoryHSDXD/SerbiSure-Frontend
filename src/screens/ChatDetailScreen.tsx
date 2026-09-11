import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Share,
  ToastAndroid,
  NativeModules,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BookingModal } from './BookingModal';
import { UserProfileModal } from './UserProfileModal';

import { useUser } from '../context/UserContext';
import THEME from '../config/theme';
import {
  fetchChatThread,
  fetchChatThreadDetails,
  sendChatMessage,
  sendChatImage,
  toggleChatReaction,
  reactToChatMessage,
  deleteChatMessage,
  markChatMessageRead,
  sendChatTyping,
} from '../api/chatApi';
import { chatStore } from '../store/chatStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ChatMessage {
  id: string;
  sender: 'other' | 'me' | 'system';
  text?: string;
  imageUri?: string;
  reaction?: string;
  reactionSummary?: Record<string, number>;
  replyTo?: {
    author: string;
    text: string;
  };
  time: string;
  avatar?: string;
  bookingInfo?: {
    title: string;
    startDate: string;
    details: string;
    isConfirmed?: boolean;
  };
  isTyping?: boolean;
  isUploading?: boolean;
}

function isValidUUID(val?: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

function SwipeableMessageRow({
  children,
  onReply,
  disabled,
  align = 'left',
}: {
  children: React.ReactNode;
  onReply: () => void;
  disabled?: boolean;
  align?: 'left' | 'right';
}) {
  const panX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (disabled) return false;
        if (align === 'right') {
          // Swiping own message from right to left (negative dx)
          return (
            gestureState.dx < -25 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.5
          );
        } else {
          // Swiping partner's message from left to right (positive dx)
          return (
            gestureState.dx > 25 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.5
          );
        }
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (align === 'right') {
          if (gestureState.dx < 0) {
            const resistance =
              gestureState.dx < -55 ? -55 + (gestureState.dx + 55) * 0.3 : gestureState.dx;
            panX.setValue(Math.max(resistance, -75));
          }
        } else {
          if (gestureState.dx > 0) {
            const resistance =
              gestureState.dx > 55 ? 55 + (gestureState.dx - 55) * 0.3 : gestureState.dx;
            panX.setValue(Math.min(resistance, 75));
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (align === 'right') {
          if (gestureState.dx <= -45) {
            onReply();
          }
        } else {
          if (gestureState.dx >= 45) {
            onReply();
          }
        }
        Animated.spring(panX, {
          toValue: 0,
          friction: 7,
          tension: 140,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, {
          toValue: 0,
          friction: 7,
          tension: 140,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const iconScale = panX.interpolate({
    inputRange: align === 'right' ? [-50, -20, 0] : [0, 20, 50],
    outputRange: align === 'right' ? [1, 0.7, 0.3] : [0.3, 0.7, 1],
    extrapolate: 'clamp',
  });

  const iconOpacity = panX.interpolate({
    inputRange: align === 'right' ? [-45, -15, 0] : [0, 15, 45],
    outputRange: align === 'right' ? [1, 0.5, 0] : [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.swipeRowContainer} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          align === 'right' ? styles.swipeReplyIconRight : styles.swipeReplyIconLeft,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        <Ionicons name="arrow-undo" size={16} color="#1A1A1A" />
      </Animated.View>

      <Animated.View
        style={{
          transform: [{ translateX: panX }],
          width: '100%',
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

interface ChatDetailScreenProps {
  visible: boolean;
  onClose: () => void;
  partnerId?: string;
  token?: string | null;
  contactName?: string;
  contactRole?: string;
  contactAvatar?: string;
  isOnline?: boolean;
  initialMessage?: string;
  userRole?: 'homeowner' | 'kasambahay';
}

function formatTimeOnly(isoString?: string): string {
  if (!isoString) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
  }
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Now';
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
  } catch {
    return 'Now';
  }
}

const REACTION_OPTIONS = ['❤️', '👍', '😂', '😢', '😮'];

function isEmojiOnly(str?: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (!trimmed || trimmed.length > 10) return false;
  try {
    const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200d|\ufe0f|\s)+$/u;
    return emojiRegex.test(trimmed);
  } catch {
    return false;
  }
}

function TypingDotsIndicator({ avatarUri }: { avatarUri: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (anim: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: -5,
              duration: 260,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 260,
              useNativeDriver: true,
            }),
            Animated.delay(350),
          ])
        ),
      ]);
    };

    const anim1 = createBounce(dot1, 0);
    const anim2 = createBounce(dot2, 140);
    const anim3 = createBounce(dot3, 280);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingRow}>
      <Image source={{ uri: avatarUri }} style={styles.msgAvatar} />
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
      </View>
    </View>
  );
}

export function ChatDetailScreen({
  visible,
  onClose,
  partnerId,
  token,
  contactName = 'User',
  contactRole = 'Member',
  contactAvatar,
  isOnline = true,
  initialMessage,
  userRole = 'homeowner',
}: ChatDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const effectiveToken = token || user.token;

  // Determine if the current active user is a Kasambahay or Homeowner
  const isKasambahay =
    userRole === 'kasambahay' ||
    user?.accountType?.toLowerCase() === 'kasambahay' ||
    contactRole?.toLowerCase().includes('homeowner');
  const isHomeowner = !isKasambahay;

  const scrollViewRef = useRef<ScrollView>(null);
  const hasAutoScrolledRef = useRef(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const lastTypingSentRef = useRef<number>(0);

  const handleTyping = () => {
    if (!partnerId || !effectiveToken) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2500) {
      lastTypingSentRef.current = now;
      sendChatTyping(effectiveToken, partnerId, true);
    }
  };

  useEffect(() => {
    if (isOtherTyping) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isOtherTyping]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    try {
      if (NativeModules.Clipboard?.setString) {
        NativeModules.Clipboard.setString(text);
      } else {
        const RNClipboard = require('react-native/Libraries/Components/Clipboard/Clipboard');
        RNClipboard?.setString?.(text);
      }
    } catch (e) {
      console.log('[ChatDetailScreen] copy clipboard fallback:', e);
    }

    if (Platform.OS === 'android') {
      ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied', 'Message copied to clipboard');
    }
  };

  const resolvedAvatar =
    contactAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName || 'User')}&background=FFB43B&color=fff`;

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [activeActionMenuMsg, setActiveActionMenuMsg] = useState<ChatMessage | null>(null);
  const [activeMenuLayout, setActiveMenuLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const messageRefs = useRef<{ [id: string]: View | null }>({});
  const reactionScaleAnim = useRef(new Animated.Value(0.3)).current;
  const reactionOpacityAnim = useRef(new Animated.Value(0)).current;
  const menuScaleAnim = useRef(new Animated.Value(0.4)).current;
  const menuOpacityAnim = useRef(new Animated.Value(0)).current;
  const backdropOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    hasAutoScrolledRef.current = false;
    if (visible) {
      const t1 = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 50);
      const t2 = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 200);
      const t3 = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 450);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [visible, partnerId]);

  useEffect(() => {
    if (messages.length > 0 && !hasAutoScrolledRef.current) {
      hasAutoScrolledRef.current = true;
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      });
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 300);
    }
  }, [messages.length]);

  useEffect(() => {
    if (activeActionMenuMsg) {
      reactionScaleAnim.setValue(0.2);
      reactionOpacityAnim.setValue(0);
      menuScaleAnim.setValue(0.4);
      menuOpacityAnim.setValue(0);
      backdropOpacityAnim.setValue(0);

      Animated.parallel([
        Animated.timing(backdropOpacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(reactionScaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 135,
          useNativeDriver: true,
        }),
        Animated.timing(reactionOpacityAnim, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.spring(menuScaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 130,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [activeActionMenuMsg, reactionScaleAnim, reactionOpacityAnim, menuScaleAnim, menuOpacityAnim, backdropOpacityAnim]);

  const handleOpenActionMenu = (item: ChatMessage) => {
    const node = messageRefs.current[item.id];
    if (node && node.measureInWindow) {
      node.measureInWindow((x, y, width, height) => {
        if (typeof y === 'number' && !isNaN(y) && height > 0) {
          setActiveMenuLayout({ x, y, width, height });
        } else {
          setActiveMenuLayout(null);
        }
        setActiveActionMenuMsg(item);
      });
    } else {
      setActiveMenuLayout(null);
      setActiveActionMenuMsg(item);
    }
  };
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [bookingReadOnly, setBookingReadOnly] = useState(false);
  const [activeBookingMsgId, setActiveBookingMsgId] = useState<string | null>(null);
  const [activeBookingDetails, setActiveBookingDetails] = useState<any>(null);

  // Right-to-left slide transition state
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Swipe-to-reply state & input ref
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string; text: string } | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      slideAnim.setValue(SCREEN_WIDTH);
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 26,
        mass: 0.85,
        stiffness: 240,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    if (partnerId && effectiveToken) {
      sendChatTyping(effectiveToken, partnerId, false);
    }
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      onClose();
    });
  };

  const handleInitiateReply = (msg: ChatMessage) => {
    const authorName = msg.sender === 'me' ? 'You' : (contactName || 'User');
    const previewText = msg.text
      ? (msg.text.length > 75 ? msg.text.slice(0, 75) + '...' : msg.text)
      : msg.imageUri
      ? '📷 Photo'
      : 'Message';

    setReplyingTo({
      id: msg.id,
      author: authorName,
      text: previewText,
    });

    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  };

  const handleKasambahayConfirm = (msgId: string) => {
    const timeString = formatTimeOnly();

    setMessages((prev) => {
      const updated = prev.map((msg) => {
        if (msg.id === msgId && msg.bookingInfo) {
          return {
            ...msg,
            bookingInfo: {
              ...msg.bookingInfo,
              title: 'BOOKING CONFIRMED',
              isConfirmed: true,
            },
          };
        }
        return msg;
      });

      return [
        ...updated,
        {
          id: `temp-${Date.now()}`,
          sender: 'other',
          text: `I have accepted and confirmed the booking request! Thank you po! 😊`,
          time: timeString,
          avatar: resolvedAvatar,
        },
      ];
    });

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  React.useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    const syncThread = (isInitial = false) => {
      if (!partnerId || !effectiveToken) return;

      fetchChatThreadDetails(effectiveToken, partnerId)
        .then(({ messages: items, partnerIsTyping }) => {
          if (!isMounted) return;
          setIsOtherTyping(partnerIsTyping);

          if (items && items.length > 0) {
            const visibleItems = items.filter((m) => !chatStore.isMessageDeleted(m.chat_message_id));
            const mapped: ChatMessage[] = visibleItems.map((m) => {
              let displayReaction = m.my_reaction || undefined;
              if (!displayReaction && m.reaction_summary) {
                for (const [emoji, count] of Object.entries(m.reaction_summary)) {
                  if (count > 0) {
                    displayReaction = emoji;
                    break;
                  }
                }
              }

              let cleanText = m.message_payload || undefined;
              let replyInfo: { author: string; text: string } | undefined = undefined;

              if (cleanText) {
                const replyMatch = cleanText.match(/^> \[([^\]]+)\]:\s*(.*?)\n\n([\s\S]*)$/);
                if (replyMatch && replyMatch[1] && replyMatch[2] && replyMatch[3]) {
                  replyInfo = {
                    author: replyMatch[1],
                    text: replyMatch[2],
                  };
                  cleanText = replyMatch[3];
                }
              }

              return {
                id: m.chat_message_id,
                sender: m.is_sender ? ('me' as const) : ('other' as const),
                text: cleanText,
                imageUri: m.image_url || undefined,
                reaction: displayReaction,
                reactionSummary: m.reaction_summary,
                replyTo: replyInfo,
                time: formatTimeOnly(m.createdAt),
                avatar: m.is_sender ? undefined : resolvedAvatar,
              };
            });

            setMessages((prev) => {
              const hasChanged =
                prev.length !== mapped.length ||
                prev.some((msg, idx) => {
                  const m = mapped[idx];
                  if (!m) return true;
                  if (msg.id !== m.id) return true;
                  if (msg.reaction !== m.reaction) return true;
                  if (msg.imageUri !== m.imageUri) return true;
                  if (msg.text !== m.text) return true;
                  if (msg.replyTo?.text !== m.replyTo?.text) return true;
                  if (JSON.stringify(msg.reactionSummary) !== JSON.stringify(m.reactionSummary)) return true;
                  return false;
                });
              if (hasChanged) {
                return mapped;
              }
              return prev;
            });

            // Mark unread messages from partner as read
            items.forEach((m) => {
              if (!m.is_sender && !m.is_read) {
                markChatMessageRead(effectiveToken, m.chat_message_id).catch(() => {});
              }
            });
          } else if (isInitial && initialMessage) {
            // New thread with initial auto-message!
            const tempId = `temp-${Date.now()}`;
            setMessages([
              {
                id: tempId,
                sender: 'me',
                text: initialMessage,
                time: formatTimeOnly(),
              },
            ]);

            // Persist the initial message to backend
            sendChatMessage(effectiveToken, partnerId, initialMessage)
              .then((res) => {
                if (res?.data?.chat_message_id && isMounted) {
                  setMessages((prev) =>
                    prev.map((msg) => (msg.id === tempId ? { ...msg, id: res.data.chat_message_id } : msg))
                  );
                }
                chatStore.addOrUpdateChat({
                  partnerId,
                  name: contactName,
                  badge: contactRole,
                  avatar: resolvedAvatar,
                  message: initialMessage,
                  time: 'Just now',
                });
              })
              .catch((err) => {
                console.warn('[ChatDetailScreen] Failed to auto-send initial message:', err);
              });
          } else if (isInitial) {
            setMessages([]);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          if (isInitial) {
            console.warn('[ChatDetailScreen] Could not load thread:', err);
            if (initialMessage) {
              setMessages([
                {
                  id: `temp-${Date.now()}`,
                  sender: 'me',
                  text: initialMessage,
                  time: formatTimeOnly(),
                },
              ]);
            } else {
              setMessages([]);
            }
          }
        });
    };

    if (partnerId && effectiveToken) {
      // 1. Initial immediate sync
      syncThread(true);

      // 2. Poll every 3 seconds while chat modal is visible
      const intervalId = setInterval(() => {
        syncThread(false);
      }, 3000);

      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    } else {
      if (initialMessage) {
        setMessages([
          {
            id: `temp-${Date.now()}`,
            sender: 'me',
            text: initialMessage,
            time: formatTimeOnly(),
          },
        ]);
      } else {
        setMessages([]);
      }
      return () => {
        isMounted = false;
      };
    }
  }, [visible, partnerId, effectiveToken, resolvedAvatar, initialMessage]);

  const handleSend = () => {
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    if (partnerId && effectiveToken) {
      sendChatTyping(effectiveToken, partnerId, false);
    }

    const timeString = formatTimeOnly();
    const tempId = `temp-${Date.now()}`;

    const currentReply = replyingTo;
    setReplyingTo(null);

    const payloadToSend = currentReply
      ? `> [${currentReply.author}]: ${currentReply.text}\n\n${trimmed}`
      : trimmed;

    const newMessage: ChatMessage = {
      id: tempId,
      sender: 'me',
      text: trimmed,
      replyTo: currentReply ? { author: currentReply.author, text: currentReply.text } : undefined,
      time: timeString,
    };

    setMessages((prev) => {
      const nonTyping = prev.filter((m) => !m.isTyping);
      return [...nonTyping, newMessage];
    });

    setInputMessage('');

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Call real backend API if partnerId and token exist
    if (partnerId && effectiveToken) {
      sendChatMessage(effectiveToken, partnerId, payloadToSend)
        .then((res) => {
          if (res?.data?.chat_message_id) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === tempId ? { ...msg, id: res.data.chat_message_id } : msg))
            );
          }
          chatStore.addOrUpdateChat({
            partnerId,
            name: contactName,
            badge: contactRole,
            avatar: contactAvatar,
            message: trimmed,
            time: 'Just now',
          });
        })
        .catch((err) => {
          console.warn('[ChatDetailScreen] send failed:', err);
          Alert.alert('Send Error', err.message || 'Could not send message. Please try again.');
        });
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Gallery permission is required to choose photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const imageUri = result.assets[0].uri;

      if (!partnerId || !effectiveToken) {
        Alert.alert('Error', 'Cannot send image: conversation is not ready.');
        return;
      }

      const fileSize = result.assets[0].fileSize;
      if (fileSize && fileSize > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please choose an image under 10MB.');
        return;
      }

      const now = new Date();
      const timeString = formatTimeOnly(now.toISOString());
      const tempId = `temp-img-${Date.now()}`;

      const newMsg: ChatMessage = {
        id: tempId,
        sender: 'me',
        imageUri: imageUri,
        time: timeString,
        isUploading: true,
      };

      setMessages((prev) => {
        const nonTyping = prev.filter((m) => !m.isTyping);
        return [...nonTyping, newMsg];
      });

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      setIsUploadingImage(true);
      try {
        const res = await sendChatImage(effectiveToken, partnerId, imageUri);
        if (res?.data?.chat_message_id) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId
                ? {
                    ...msg,
                    id: res.data.chat_message_id,
                    imageUri: res.data.image_url || imageUri,
                  }
                : msg
            )
          );
        }
        chatStore.addOrUpdateChat({
          partnerId,
          name: contactName,
          badge: contactRole,
          avatar: contactAvatar,
          message: '📷 Photo',
          time: 'Just now',
        });
      } catch (uploadErr: any) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        const errMsg = uploadErr?.message || 'Could not send image. Please try again.';
        if (errMsg.toLowerCase().includes('too large') || errMsg.toLowerCase().includes('10 mb')) {
          Alert.alert('File Too Large', 'Please choose an image under 10MB.');
        } else if (errMsg.toLowerCase().includes('format') || errMsg.toLowerCase().includes('unsupported')) {
          Alert.alert('Invalid Format', 'Only JPEG, PNG, and WEBP images are supported.');
        } else if (errMsg.toLowerCase().includes('rate') || errMsg.toLowerCase().includes('limit') || errMsg.toLowerCase().includes('too many')) {
          Alert.alert('Slow Down', 'You are sending images too quickly. Please wait a moment.');
        } else {
          Alert.alert('Upload Failed', errMsg);
        }
      } finally {
        setIsUploadingImage(false);
      }
    } catch (err) {
      console.log('Error choosing image in chat:', err);
      Alert.alert('Gallery Error', 'Could not open photo gallery. Please try again.');
    }
  };

  const handleSelectReaction = async (emoji: string, targetId?: string) => {
    const targetMsgId = targetId || activeActionMenuMsg?.id || reactingMessageId;
    if (!targetMsgId) return;
    setReactingMessageId(null);

    // Normalize heart emoji
    const normalizedEmoji = emoji === '\u2764' ? '❤️' : emoji;

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === targetMsgId) {
          const isRemoving = msg.reaction === normalizedEmoji;
          const nextReaction = isRemoving ? undefined : normalizedEmoji;
          const prevSummary = { ...(msg.reactionSummary || {}) };
          if (isRemoving) {
            prevSummary[normalizedEmoji] = Math.max(0, (prevSummary[normalizedEmoji] ?? 1) - 1);
          } else {
            const currentReactionCount = msg.reaction ? prevSummary[msg.reaction] : undefined;
            if (msg.reaction && currentReactionCount !== undefined) {
              prevSummary[msg.reaction] = Math.max(0, currentReactionCount - 1);
            }
            prevSummary[normalizedEmoji] = (prevSummary[normalizedEmoji] ?? 0) + 1;
          }
          return {
            ...msg,
            reaction: nextReaction,
            reactionSummary: prevSummary,
          };
        }
        return msg;
      })
    );

    // Persist to backend
    if (effectiveToken && targetMsgId && !targetMsgId.startsWith('temp-')) {
      try {
        const res = await toggleChatReaction(effectiveToken, targetMsgId, normalizedEmoji);
        if (res?.data?.reaction_counts) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === targetMsgId
                ? {
                    ...msg,
                    reaction: res.data.my_reaction || undefined,
                    reactionSummary: res.data.reaction_counts,
                  }
                : msg
            )
          );
        }
      } catch (err) {
        console.warn('[ChatDetailScreen] toggle reaction error:', err);
      }
    }
  };

  const handleDeleteOrUnsend = async (msg: ChatMessage, actionType: 'unsend' | 'delete_for_me') => {
    setActiveActionMenuMsg(null);

    // Track ID in chatStore so background polling never resurrects it
    if (msg.id) {
      chatStore.markMessageDeleted(msg.id);
    }

    // Optimistic removal from message list
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));

    if (actionType === 'delete_for_me') {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Message deleted for you', ToastAndroid.SHORT);
      }
      return;
    }

    // For unsend: delete for everyone on the server
    if (actionType === 'unsend') {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Message unsent', ToastAndroid.SHORT);
      }

      if (effectiveToken && msg.id && isValidUUID(msg.id) && !msg.id.startsWith('temp-')) {
        try {
          await deleteChatMessage(effectiveToken, msg.id);
        } catch (err) {
          // Log softly to prevent yellow LogBox popup on user device
          console.log('[ChatDetailScreen] unsend background sync:', err);
        }
      }
    }
  };

  const renderReactionBadge = (msg: ChatMessage, align: 'left' | 'right') => {
    const counts = msg.reactionSummary || {};
    const activeEntries = Object.entries(counts).filter(([_, count]) => count > 0);

    if (activeEntries.length === 0 && !msg.reaction) return null;

    return (
      <View
        style={[
          styles.reactionBadgePill,
          align === 'left' ? styles.reactionBadgePillLeft : styles.reactionBadgePillRight,
        ]}
      >
        {activeEntries.length > 0 ? (
          activeEntries.map(([emoji, count]) => {
            const cleanEmoji = emoji === '\u2764' || emoji.startsWith('\u2764') ? '❤️' : emoji;
            return (
              <View key={emoji} style={styles.reactionBadgeItem}>
                <Text style={styles.reactionBadgeEmoji}>
                  {cleanEmoji}
                </Text>
                {count > 1 ? (
                  <Text style={styles.reactionBadgeCount}>{count}</Text>
                ) : null}
              </View>
            );
          })
        ) : msg.reaction ? (
          <View style={styles.reactionBadgeItem}>
            <Text style={styles.reactionBadgeEmoji}>
              {msg.reaction === '\u2764' || msg.reaction.startsWith('\u2764') ? '❤️' : msg.reaction}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal visible={modalVisible} animationType="none" transparent onRequestClose={handleClose}>
      <Animated.View style={[styles.modalScreenContainer, { transform: [{ translateX: slideAnim }] }]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
            <Pressable onPress={handleClose} style={styles.backBtn} hitSlop={10}>
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </Pressable>

          <Pressable
            style={styles.headerInfo}
            onPress={() => {
              if (partnerId) {
                setProfileModalVisible(true);
              }
            }}
            hitSlop={8}
          >
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: resolvedAvatar }} style={styles.headerAvatar} />
              {isOnline ? <View style={styles.onlineDot} /> : null}
            </View>
            <View style={styles.headerTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.contactName}>{contactName}</Text>
                <Ionicons name="chevron-forward" size={13} color="#8E8E93" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Text style={[styles.contactSub, isOtherTyping && styles.contactSubTyping]}>
                  {isOtherTyping ? 'Typing...' : (isOnline ? 'Online now' : 'Offline')}
                </Text>
                <Text style={{ color: '#C4C4C4', fontSize: 10 }}>•</Text>
                <View style={styles.headerRoleBadge}>
                  <Text style={styles.headerRoleBadgeText}>{contactRole}</Text>
                </View>
              </View>
            </View>
          </Pressable>

          {isHomeowner ? (
            <Pressable
              style={styles.bookingHeaderBtn}
              onPress={() => {
                setBookingReadOnly(false);
                setActiveBookingMsgId(null);
                setActiveBookingDetails(null);
                setBookingModalVisible(true);
              }}
              hitSlop={10}
            >
              <Ionicons name="calendar-outline" size={19} color="#1A1A1A" />
            </Pressable>
          ) : null}
        </View>

        {/* Chat Body Container */}
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatBody}
            contentContainerStyle={styles.chatBodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={(contentWidth, contentHeight) => {
              if (!hasAutoScrolledRef.current && messages.length > 0 && contentHeight > 0) {
                hasAutoScrolledRef.current = true;
                requestAnimationFrame(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: false });
                });
              }
            }}
          >
            {/* Date Separator Pill */}
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>
                Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>

            {/* Messages */}
            {messages.map((item, index) => {
              if (item.sender === 'system' && item.bookingInfo) {
                const isConfirmed = item.bookingInfo.isConfirmed || item.bookingInfo.title === 'BOOKING CONFIRMED';

                return (
                  <Pressable
                    key={item.id}
                    style={styles.systemCardContainer}
                    onPress={() => {
                      setActiveBookingMsgId(item.id);
                      setActiveBookingDetails({
                        startDate: item.bookingInfo?.startDate,
                        workHours: item.bookingInfo?.details.split('·')[1]?.trim() || '08:00 AM - 05:00 PM',
                        salary: item.bookingInfo?.details.split('·')[0]?.trim() || '5000',
                        location: 'Lower Tambo Macasandig, Blk 5',
                        days: ['M', 'T', 'W', 'Th', 'F'],
                        scope: ['cooking', 'laundry', 'caregiver'],
                      });
                      setBookingReadOnly(true);
                      setBookingModalVisible(true);
                    }}
                  >
                    <View style={[styles.bookingCard, isConfirmed && styles.bookingCardConfirmed]}>
                      <View style={styles.bookingTagRow}>
                        <Ionicons
                          name={isConfirmed ? "checkmark-circle" : "time-outline"}
                          size={16}
                          color={isConfirmed ? "#4CAF50" : "#FFA51F"}
                        />
                        <Text style={[styles.bookingTagText, isConfirmed && styles.bookingTagTextConfirmed]}>
                          {isConfirmed ? 'BOOKING CONFIRMED' : 'BOOKING READY'}
                        </Text>
                      </View>
                      <Text style={styles.bookingStartTitle}>Start: {item.bookingInfo.startDate}</Text>
                      <Text style={styles.bookingDetails}>{item.bookingInfo.details}</Text>

                      {isConfirmed && (
                        <View style={styles.confirmedStatusTag}>
                          <Ionicons name="checkmark-done-circle" size={16} color="#4CAF50" style={{ marginRight: 4 }} />
                          <Text style={styles.confirmedStatusText}>Confirmed & Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.systemTimeText}>{item.time}</Text>
                  </Pressable>
                );
              }

              // Grouping calculations (Messenger style)
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

              const isSameSenderAsPrev =
                !!prevMsg &&
                prevMsg.sender === item.sender &&
                prevMsg.sender !== 'system' &&
                !prevMsg.bookingInfo &&
                !item.bookingInfo &&
                !item.replyTo;

              const isSameSenderAsNext =
                !!nextMsg &&
                nextMsg.sender === item.sender &&
                nextMsg.sender !== 'system' &&
                !nextMsg.bookingInfo &&
                !item.bookingInfo &&
                !nextMsg.replyTo;

              const isSameGroupAsPrev = isSameSenderAsPrev && prevMsg.time === item.time;
              const isSameGroupAsNext = isSameSenderAsNext && nextMsg.time === item.time;

              const hasReaction = !!item.reaction || Object.values(item.reactionSummary || {}).some((c) => c > 0);
              const rowSpacingStyle = isSameGroupAsNext
                ? (hasReaction ? styles.messageRowGroupedWithReaction : styles.messageRowGrouped)
                : null;

              if (item.sender === 'other') {
                const isEmoji = isEmojiOnly(item.text);

                let leftGroupingCornerStyle = styles.leftBubbleSingle;
                if (!isSameGroupAsPrev && isSameGroupAsNext) {
                  leftGroupingCornerStyle = styles.leftBubbleTop;
                } else if (isSameGroupAsPrev && isSameGroupAsNext) {
                  leftGroupingCornerStyle = styles.leftBubbleMiddle;
                } else if (isSameGroupAsPrev && !isSameGroupAsNext) {
                  leftGroupingCornerStyle = styles.leftBubbleBottom;
                }

                return (
                  <SwipeableMessageRow
                    key={item.id}
                    align="left"
                    onReply={() => handleInitiateReply(item)}
                    disabled={item.isTyping}
                  >
                    <View style={[styles.leftMessageRow, rowSpacingStyle]}>
                      <Pressable
                        onPress={() => {
                          if (partnerId) {
                            setProfileModalVisible(true);
                          }
                        }}
                        hitSlop={6}
                      >
                        {!isSameGroupAsNext ? (
                          <Image source={{ uri: item.avatar || contactAvatar || resolvedAvatar }} style={styles.msgAvatar} />
                        ) : (
                          <View style={styles.msgAvatarPlaceholder} />
                        )}
                      </Pressable>
                      <View style={styles.leftMessageCol}>
                        {/* Instagram / Messenger Style Quoted Reply Stack */}
                        {item.replyTo ? (
                          <View style={styles.replyQuoteStackLeft}>
                            <Text style={styles.replyQuoteLabelLeft}>
                              {item.replyTo.author === 'You' ? `${contactName} replied to you` : `${contactName} replied`}
                            </Text>
                            <View style={styles.replyQuoteBubbleLeft}>
                              <Text style={styles.replyQuoteBubbleText} numberOfLines={4}>
                                {item.replyTo.text}
                              </Text>
                            </View>
                          </View>
                        ) : null}

                        <View
                          ref={(el) => {
                            messageRefs.current[item.id] = el;
                          }}
                          collapsable={false}
                        >
                          <Pressable delayLongPress={200} onLongPress={() => handleOpenActionMenu(item)}>
                            <View
                              style={[
                                styles.leftBubble,
                                leftGroupingCornerStyle,
                                isEmoji ? styles.emojiOnlyBubble : null,
                                item.replyTo ? styles.leftBubbleWithReply : null,
                                item.isTyping ? styles.typingBubble : null,
                                item.imageUri && !item.text ? styles.imageOnlyBubble : null,
                              ]}
                            >
                              {item.imageUri ? (
                                <Pressable
                                  onPress={() => setSelectedImageUri(item.imageUri || null)}
                                  style={styles.chatImageWrapper}
                                >
                                  <Image source={{ uri: item.imageUri }} style={styles.chatImage} resizeMode="cover" />
                                  {item.isUploading ? (
                                    <View style={styles.imageUploadingOverlay}>
                                      <ActivityIndicator size="small" color="#FFFFFF" />
                                    </View>
                                  ) : null}
                                </Pressable>
                              ) : null}
                              {item.text ? (
                                <Text
                                  style={[
                                    styles.leftMsgText,
                                    isEmoji ? styles.emojiOnlyText : null,
                                    item.imageUri ? { marginTop: 6 } : null,
                                    item.isTyping ? styles.typingText : null,
                                  ]}
                                >
                                  {item.text}
                                </Text>
                              ) : null}

                              {renderReactionBadge(item, 'left')}
                            </View>
                          </Pressable>
                        </View>

                        {!isSameGroupAsNext && item.time ? <Text style={styles.leftTimeText}>{item.time}</Text> : null}
                      </View>
                    </View>
                  </SwipeableMessageRow>
                );
              }

              // Right Message (me)
              const isEmojiRight = isEmojiOnly(item.text);

              let rightGroupingCornerStyle = styles.rightBubbleSingle;
              if (!isSameGroupAsPrev && isSameGroupAsNext) {
                rightGroupingCornerStyle = styles.rightBubbleTop;
              } else if (isSameGroupAsPrev && isSameGroupAsNext) {
                rightGroupingCornerStyle = styles.rightBubbleMiddle;
              } else if (isSameGroupAsPrev && !isSameGroupAsNext) {
                rightGroupingCornerStyle = styles.rightBubbleBottom;
              }

              return (
                <SwipeableMessageRow
                  key={item.id}
                  align="right"
                  onReply={() => handleInitiateReply(item)}
                >
                  <View style={[styles.rightMessageRow, rowSpacingStyle]}>
                    {/* Instagram / Messenger Style Quoted Reply Stack */}
                    {item.replyTo ? (
                      <View style={styles.replyQuoteStackRight}>
                        <Text style={styles.replyQuoteLabelRight}>
                          {item.replyTo.author === 'You' ? 'You replied' : `You replied to ${item.replyTo.author}`}
                        </Text>
                        <View style={styles.replyQuoteBubbleRight}>
                          <Text style={styles.replyQuoteBubbleText} numberOfLines={4}>
                            {item.replyTo.text}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    <View
                      ref={(el) => {
                        messageRefs.current[item.id] = el;
                      }}
                      collapsable={false}
                    >
                      <Pressable delayLongPress={200} onLongPress={() => handleOpenActionMenu(item)}>
                        <View
                          style={[
                            styles.rightBubble,
                            rightGroupingCornerStyle,
                            isEmojiRight ? styles.emojiOnlyBubble : null,
                            item.replyTo ? styles.rightBubbleWithReply : null,
                            item.imageUri && !item.text ? styles.imageOnlyBubble : null,
                          ]}
                        >
                          {item.imageUri ? (
                            <Pressable
                              onPress={() => setSelectedImageUri(item.imageUri || null)}
                              style={styles.chatImageWrapper}
                            >
                              <Image source={{ uri: item.imageUri }} style={styles.chatImage} resizeMode="cover" />
                              {item.isUploading ? (
                                <View style={styles.imageUploadingOverlay}>
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                </View>
                              ) : null}
                            </Pressable>
                          ) : null}
                          {item.text ? (
                            <Text
                              style={[
                                styles.rightMsgText,
                                isEmojiRight ? styles.emojiOnlyText : null,
                                item.imageUri ? { marginTop: 6 } : null,
                              ]}
                            >
                              {item.text}
                            </Text>
                          ) : null}

                          {renderReactionBadge(item, 'right')}
                        </View>
                      </Pressable>
                    </View>

                    {!isSameGroupAsNext && item.time ? <Text style={styles.rightTimeText}>{item.time}</Text> : null}
                  </View>
                </SwipeableMessageRow>
              );
            })}
            {isOtherTyping ? <TypingDotsIndicator avatarUri={resolvedAvatar} /> : null}
          </ScrollView>
        </View>

        {/* Reply Context Banner - Ultra-clean, without yellow line */}
        {replyingTo ? (
          <View style={styles.replyBanner}>
            <View style={styles.replyBannerContent}>
              <View style={styles.replyBannerTopRow}>
                <View style={styles.replyBannerHeaderLeft}>
                  <Ionicons name="arrow-undo" size={13} color="#8E8E93" style={{ marginRight: 5 }} />
                  <Text style={styles.replyBannerAuthor}>
                    Replying to <Text style={styles.replyBannerAuthorName}>{replyingTo.author}</Text>
                  </Text>
                </View>
                <Pressable
                  onPress={() => setReplyingTo(null)}
                  hitSlop={8}
                  style={styles.replyBannerCloseBtn}
                  accessibilityLabel="Cancel reply"
                >
                  <Ionicons name="close" size={17} color="#8E8E93" />
                </Pressable>
              </View>
              <Text style={styles.replyBannerText} numberOfLines={1}>
                {replyingTo.text}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Messenger Style Input Footer */}
        {isUploadingImage && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color="#FFB43B" />
            <Text style={styles.uploadingText}>Sending photo...</Text>
          </View>
        )}
        <View style={[styles.inputFooter, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Pressable style={styles.attachBtn} onPress={handlePickImage}>
            <Ionicons name="add-circle" size={32} color="#FFB43B" />
          </Pressable>
          <Pressable style={styles.imageBtn} onPress={handlePickImage}>
            <Ionicons name="image-outline" size={22} color="#888" />
          </Pressable>

          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            value={inputMessage}
            onChangeText={(text) => {
              setInputMessage(text);
              handleTyping();
            }}
            multiline
          />

          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              !inputMessage.trim() && styles.sendBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleSend}
            disabled={!inputMessage.trim()}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Messenger-Style Full-Screen Image Zoom Viewer Modal */}
      <Modal
        visible={!!selectedImageUri}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageUri(null)}
      >
        <View style={styles.fullImageContainer}>
          <Pressable style={styles.fullImageBackdrop} onPress={() => setSelectedImageUri(null)} />
          
          <Pressable 
            style={[styles.fullImageCloseBtn, { top: Math.max(insets.top + 10, 30) }]} 
            onPress={() => setSelectedImageUri(null)}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>

          {selectedImageUri ? (
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.fullImageContent}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* Booking Screen Modal */}
      <BookingModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
        contactName={contactName}
        contactRole={contactRole}
        contactAvatar={contactAvatar}
        readOnly={bookingReadOnly || isKasambahay}
        isConfirmed={activeBookingMsgId ? messages.find((m) => m.id === activeBookingMsgId)?.bookingInfo?.isConfirmed : false}
        userRole={isHomeowner ? 'homeowner' : 'kasambahay'}
        initialDetails={activeBookingDetails}
        token={effectiveToken}
        bookingType="long_term"
        onConfirm={(details) => {
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes().toString().padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const timeString = `${hours % 12 || 12}:${minutes} ${ampm}`;
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: 'system',
              time: timeString,
              bookingInfo: {
                title: 'BOOKING READY',
                startDate: details.startDate,
                details: `${details.salary}/mo · ${details.workHours}`,
                isConfirmed: false,
              },
            },
          ]);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }}
        onKasambahayConfirm={() => {
          if (activeBookingMsgId) {
            handleKasambahayConfirm(activeBookingMsgId);
          }
        }}
      />

      {/* Counterparty Public Profile Modal */}
      <UserProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        userId={partnerId}
        token={effectiveToken}
        prefilledName={contactName}
        prefilledAvatar={resolvedAvatar}
        prefilledRole={contactRole}
      />

      {/* Blurred Long-Press Action Menu & Reaction Overlay (Position-aware & Animated) */}
      {activeActionMenuMsg ? (() => {
        const isSender = activeActionMenuMsg.sender === 'me';
        const pillHeight = 44;
        const menuHeight = activeActionMenuMsg.text ? 138 : 94;
        const bubbleHeight = activeMenuLayout?.height || 48;
        const bubbleWidth = activeMenuLayout?.width;

        // Vertical positioning: place pill directly above bubble and menu directly below bubble
        let bubbleTop = activeMenuLayout ? activeMenuLayout.y : (SCREEN_HEIGHT / 2 - 60);
        const minBubbleTop = Math.max(insets.top + 10, 50) + pillHeight + 8;
        const maxBubbleTop = SCREEN_HEIGHT - insets.bottom - 16 - menuHeight - 8 - bubbleHeight;

        if (maxBubbleTop >= minBubbleTop) {
          bubbleTop = Math.max(minBubbleTop, Math.min(bubbleTop, maxBubbleTop));
        } else {
          bubbleTop = Math.max(minBubbleTop, (SCREEN_HEIGHT - bubbleHeight) / 2);
        }

        const pillTop = bubbleTop - pillHeight - 8;
        const menuTop = bubbleTop + bubbleHeight + 8;

        // Horizontal positioning: align to message's screen coordinates
        const rightOffset = activeMenuLayout
          ? Math.max(16, SCREEN_WIDTH - (activeMenuLayout.x + activeMenuLayout.width))
          : 16;
        const leftOffset = activeMenuLayout
          ? Math.max(16, activeMenuLayout.x)
          : 52;

        const horizontalPositionStyle = isSender
          ? { right: rightOffset }
          : { left: leftOffset };

        return (
          <View style={styles.actionModalBackdrop}>
            {/* Dimmed Background Overlay */}
            <Animated.View style={[styles.actionModalDarkDimmer, { opacity: backdropOpacityAnim }]} />

            {/* Dismiss when tapping backdrop */}
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setActiveActionMenuMsg(null)}
            />

            {/* 1. Floating Reaction Emoji Pill Directly Above Message */}
            <Animated.View
              style={[
                styles.actionReactionPill,
                horizontalPositionStyle,
                {
                  top: pillTop,
                  opacity: reactionOpacityAnim,
                  transform: [{ scale: reactionScaleAnim }],
                },
              ]}
            >
              {REACTION_OPTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={({ pressed }) => [
                    styles.actionEmojiButton,
                    pressed && { transform: [{ scale: 1.3 }] },
                  ]}
                  onPress={() => {
                    const targetId = activeActionMenuMsg.id;
                    setActiveActionMenuMsg(null);
                    handleSelectReaction(emoji, targetId);
                  }}
                >
                  <Text style={styles.actionEmojiText}>{emoji}</Text>
                </Pressable>
              ))}
            </Animated.View>

            {/* 2. Message Bubble Preview (Natural Fixed Size at exact position) */}
            <View
              style={[
                styles.actionMessageBubblePreview,
                isSender ? styles.actionRightBubble : styles.actionLeftBubble,
                isEmojiOnly(activeActionMenuMsg.text) ? styles.emojiOnlyBubble : null,
                horizontalPositionStyle,
                activeActionMenuMsg.imageUri && !activeActionMenuMsg.text ? styles.imageOnlyBubble : null,
                {
                  top: bubbleTop,
                  width: bubbleWidth,
                },
              ]}
            >
              {activeActionMenuMsg.imageUri ? (
                <View style={styles.chatImageWrapper}>
                  <Image
                    source={{ uri: activeActionMenuMsg.imageUri }}
                    style={styles.chatImage}
                    resizeMode="cover"
                  />
                </View>
              ) : null}
              {activeActionMenuMsg.text ? (
                <Text
                  style={[
                    isSender ? styles.rightMsgText : styles.leftMsgText,
                    isEmojiOnly(activeActionMenuMsg.text) ? styles.emojiOnlyText : null,
                    activeActionMenuMsg.imageUri ? { marginTop: 6 } : null,
                  ]}
                >
                  {activeActionMenuMsg.text}
                </Text>
              ) : null}

              {/* Include the reaction on long press */}
              {renderReactionBadge(activeActionMenuMsg, isSender ? 'right' : 'left')}
            </View>

            {/* 3. Floating Action Menu Card Directly Below Message */}
            <Animated.View
              style={[
                styles.actionMenuCard,
                horizontalPositionStyle,
                {
                  top: menuTop,
                  opacity: menuOpacityAnim,
                  transform: [{ scale: menuScaleAnim }],
                },
              ]}
            >
              {/* Reply */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionMenuItem,
                  pressed && styles.actionMenuItemPressed,
                ]}
                onPress={() => {
                  const msg = activeActionMenuMsg;
                  setActiveActionMenuMsg(null);
                  handleInitiateReply(msg);
                }}
              >
                <Ionicons name="arrow-undo-outline" size={19} color="#1A1A1A" style={styles.actionMenuIcon} />
                <Text style={styles.actionMenuText}>Reply</Text>
              </Pressable>

              {/* Copy */}
              {activeActionMenuMsg.text ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionMenuItem,
                    pressed && styles.actionMenuItemPressed,
                  ]}
                  onPress={() => {
                    const text = activeActionMenuMsg.text || '';
                    setActiveActionMenuMsg(null);
                    copyToClipboard(text);
                  }}
                >
                  <Ionicons name="copy-outline" size={19} color="#1A1A1A" style={styles.actionMenuIcon} />
                  <Text style={styles.actionMenuText}>Copy</Text>
                </Pressable>
              ) : null}

              {/* Unsend (if message sender is 'me') */}
              {isSender ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionMenuItem,
                    styles.actionMenuItemLast,
                    pressed && styles.actionMenuItemPressed,
                  ]}
                  onPress={() => handleDeleteOrUnsend(activeActionMenuMsg, 'unsend')}
                >
                  <Ionicons name="trash-outline" size={19} color="#EF4444" style={styles.actionMenuIcon} />
                  <Text style={[styles.actionMenuText, { color: '#EF4444' }]}>Unsend</Text>
                </Pressable>
              ) : null}

              {/* Delete for me (if message sender is 'other') */}
              {!isSender ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionMenuItem,
                    styles.actionMenuItemLast,
                    pressed && styles.actionMenuItemPressed,
                  ]}
                  onPress={() => handleDeleteOrUnsend(activeActionMenuMsg, 'delete_for_me')}
                >
                  <Ionicons name="trash-outline" size={19} color="#EF4444" style={styles.actionMenuIcon} />
                  <Text style={[styles.actionMenuText, { color: '#EF4444' }]}>Delete for me</Text>
                </Pressable>
              ) : null}
            </Animated.View>
          </View>
        );
      })() : null}
    </Animated.View>
  </Modal>
);
}

const styles = StyleSheet.create({
  modalScreenContainer: {
    flex: 1,
    backgroundColor: '#F9F8F6',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F8F6',
  },
  header: {
    backgroundColor: '#F6F5F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    paddingRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#F6F5F2',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  headerTextCol: {
    justifyContent: 'center',
  },
  headerRoleBadge: {
    backgroundColor: '#FFB380',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 9999,
  },
  headerRoleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D0D11',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  contactSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  bookingHeaderBtn: {
    paddingLeft: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  chatBody: {
    flex: 1,
    backgroundColor: '#F9F8F6',
  },
  chatBodyContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  datePill: {
    alignSelf: 'center',
    backgroundColor: '#E4E2DC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginVertical: 14,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  leftMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginTop: 4,
  },
  leftMessageCol: {
    maxWidth: '78%',
  },
  leftBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  typingBubble: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  leftMsgText: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  typingText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#333',
  },
  leftTimeText: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    marginLeft: 4,
  },
  rightMessageRow: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    marginBottom: 12,
    maxWidth: '82%',
  },
  rightBubble: {
    backgroundColor: '#FFB43B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 46,
  },
  // Messenger Outgoing (Right) Grouping Corner Styles
  rightBubbleSingle: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  rightBubbleTop: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  rightBubbleMiddle: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  rightBubbleBottom: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },

  // Messenger Incoming (Left) Grouping Corner Styles
  leftBubbleSingle: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  leftBubbleTop: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
  },
  leftBubbleMiddle: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
  },
  leftBubbleBottom: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },

  // Grouped row spacing & avatar placeholder
  messageRowGrouped: {
    marginBottom: 2,
  },
  messageRowGroupedWithReaction: {
    marginBottom: 8,
  },
  msgAvatarPlaceholder: {
    width: 28,
    marginRight: 8,
  },
  imageOnlyBubble: {
    paddingHorizontal: 2,
    paddingVertical: 2,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  chatImageWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  imageBubbleContainer: {
    position: 'relative',
  },
  imageBubbleFrame: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleWithImage: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 10,
    overflow: 'visible',
  },
  imageHeaderFrame: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 4,
  },
  chatImage: {
    width: 220,
    height: 220,
    borderRadius: 16,
  },
  imageUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatImageWithCaption: {
    width: 220,
    height: 200,
  },
  imageCaptionText: {
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  rightMsgText: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
    fontWeight: '500',
  },
  rightTimeText: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  systemCardContainer: {
    alignSelf: 'flex-end',
    width: '82%',
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: '#FFFBF2',
    borderWidth: 1.5,
    borderColor: '#FFB43B',
    borderRadius: 16,
    padding: 14,
  },
  bookingCardConfirmed: {
    backgroundColor: '#F0F9F0',
    borderColor: '#4CAF50',
  },
  bookingTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFA51F',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  bookingTagTextConfirmed: {
    color: '#4CAF50',
  },
  bookingStartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 6,
  },
  bookingDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tapToViewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFB43B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  confirmBookingBtn: {
    backgroundColor: '#FFB43B',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginTop: 10,
  },
  confirmBookingBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  pendingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5E5',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  pendingStatusText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 11,
  },
  confirmedStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  confirmedStatusText: {
    color: '#2E7D32',
    fontWeight: '800',
    fontSize: 12,
  },
  systemTimeText: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputFooter: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#EFEFEF',
  },
  attachBtn: {
    marginRight: 4,
  },
  imageBtn: {
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F3',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: '#1A1A1A',
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFB43B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  fullImageContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  fullImageCloseBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImageContent: {
    width: '95%',
    height: '82%',
  },
  inlineReactionPillLeft: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  inlineReactionPillRight: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  inlineEmojiItem: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  inlineEmojiText: {
    fontSize: 20,
  },
  reactionBadgePill: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  reactionBadgePillLeft: {
    right: -4,
  },
  reactionBadgePillRight: {
    right: -4,
  },
  reactionBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
  },
  reactionBadgeEmoji: {
    fontSize: 18,
    includeFontPadding: false,
    textAlign: 'center',
  },
  reactionBadgeCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginLeft: 2,
    includeFontPadding: false,
  },
  emojiOnlyBubble: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minWidth: 0,
  },
  emojiOnlyText: {
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'center',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  typingDotsBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#9CA3AF',
  },
  contactSubTyping: {
    color: '#FFA51F',
    fontWeight: '700',
  },
  swipeRowContainer: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  swipeReplyIconLeft: {
    position: 'absolute',
    left: 8,
    top: '30%',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EBEBE6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  swipeReplyIconRight: {
    position: 'absolute',
    right: 8,
    top: '30%',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EBEBE6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EBEBE6',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  replyBannerContent: {
    flex: 1,
  },
  replyBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  replyBannerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBannerAuthor: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  replyBannerAuthorName: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
  replyBannerCloseBtn: {
    padding: 3,
  },
  replyBannerText: {
    fontSize: 13,
    color: '#4B5563',
  },
  // Instagram / Messenger Style Quoted Reply Stack
  rightBubbleWithReply: {
    borderTopRightRadius: 4,
  },
  leftBubbleWithReply: {
    borderTopLeftRadius: 4,
  },
  replyQuoteStackRight: {
    alignItems: 'flex-end',
    marginBottom: 2,
    maxWidth: '100%',
  },
  replyQuoteLabelRight: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 2,
    marginRight: 6,
  },
  replyQuoteBubbleRight: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    maxWidth: '100%',
  },
  replyQuoteBubbleText: {
    fontSize: 14,
    lineHeight: 19,
    color: '#262626',
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
  },
  replyQuoteStackLeft: {
    alignItems: 'flex-start',
    marginBottom: 2,
    maxWidth: '100%',
  },
  replyQuoteLabelLeft: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 2,
    marginLeft: 6,
  },
  replyQuoteBubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    maxWidth: '100%',
  },
  // Long-Press Action Modal & Reaction Overlay Styles
  actionModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  actionModalDarkDimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 17, 0.45)',
  },
  actionReactionPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    gap: 10,
    zIndex: 10,
  },
  actionEmojiButton: {
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  actionEmojiText: {
    fontSize: 22,
    includeFontPadding: false,
  },
  actionMessageBubblePreview: {
    position: 'absolute',
    maxWidth: '82%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9,
  },
  actionLeftBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 46,
  },
  actionRightBubble: {
    backgroundColor: '#FFB43B',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 46,
  },
  actionMenuCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: 205,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    paddingVertical: 4,
    zIndex: 10,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionMenuItemPressed: {
    backgroundColor: '#F7F7F5',
  },
  actionMenuItemLast: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBE6',
  },
  actionMenuIcon: {
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  actionMenuText: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily.secondarySemiBold,
  },
  reactionBadgeText: {
    fontSize: 14,
  },
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFF8EB',
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
  },
  uploadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#8A5A00',
    fontWeight: '500',
  },
});
