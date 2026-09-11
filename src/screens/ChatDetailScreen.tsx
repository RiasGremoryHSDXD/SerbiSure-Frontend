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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BookingModal } from './BookingModal';
import { UserProfileModal } from './UserProfileModal';

import { useUser } from '../context/UserContext';
import { fetchChatThread, sendChatMessage, sendChatImage, reactToChatMessage, markChatMessageRead } from '../api/chatApi';
import { chatStore } from '../store/chatStore';

export interface ChatMessage {
  id: string;
  sender: 'other' | 'me' | 'system';
  text?: string;
  imageUri?: string;
  reaction?: string;
  time: string;
  avatar?: string;
  bookingInfo?: {
    title: string;
    startDate: string;
    details: string;
    isConfirmed?: boolean;
  };
  isTyping?: boolean;
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

function SmoothReactionPill({ align, onSelect }: { align: 'left' | 'right'; onSelect: (emoji: string) => void }) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        align === 'left' ? styles.inlineReactionPillLeft : styles.inlineReactionPillRight,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {REACTION_OPTIONS.map((emoji) => (
        <Pressable
          key={emoji}
          style={({ pressed }) => [styles.inlineEmojiItem, pressed && { transform: [{ scale: 1.3 }] }]}
          onPress={() => onSelect(emoji)}
        >
          <Text style={styles.inlineEmojiText}>{emoji}</Text>
        </Pressable>
      ))}
    </Animated.View>
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
  const scrollViewRef = useRef<ScrollView>(null);

  const resolvedAvatar =
    contactAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName || 'User')}&background=FFB43B&color=fff`;

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [bookingReadOnly, setBookingReadOnly] = useState(false);
  const [activeBookingMsgId, setActiveBookingMsgId] = useState<string | null>(null);
  const [activeBookingDetails, setActiveBookingDetails] = useState<any>(null);

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
          id: Date.now().toString(),
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

      fetchChatThread(effectiveToken, partnerId)
        .then((items) => {
          if (!isMounted) return;

          if (items && items.length > 0) {
            const mapped: ChatMessage[] = items.map((m) => {
              let displayedReaction = m.my_reaction || undefined;
              if (!displayedReaction && m.reaction_summary) {
                for (const [emoji, count] of Object.entries(m.reaction_summary)) {
                  if (count > 0) {
                    displayedReaction = emoji;
                    break;
                  }
                }
              }

              return {
                id: m.chat_message_id,
                sender: m.is_sender ? ('me' as const) : ('other' as const),
                text: m.message_payload || undefined,
                imageUri: m.image_url || undefined,
                reaction: displayedReaction,
                time: formatTimeOnly(m.createdAt),
                avatar: m.is_sender ? undefined : resolvedAvatar,
              };
            });

            setMessages((prev) => {
              if (prev.length !== mapped.length) return mapped;
              const prevLastId = prev[prev.length - 1]?.id;
              const newLastId = mapped[mapped.length - 1]?.id;
              if (prevLastId !== newLastId) return mapped;

              const hasChanges = prev.some((msg, idx) => {
                const nextMsg = mapped[idx];
                return (
                  !nextMsg ||
                  msg.reaction !== nextMsg.reaction ||
                  msg.imageUri !== nextMsg.imageUri ||
                  msg.text !== nextMsg.text
                );
              });

              if (hasChanges) return mapped;
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
            const tempId = Date.now().toString();
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
                  id: '1',
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
            id: '1',
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

    const timeString = formatTimeOnly();
    const tempId = Date.now().toString();

    const newMessage: ChatMessage = {
      id: tempId,
      sender: 'me',
      text: trimmed,
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
      sendChatMessage(effectiveToken, partnerId, trimmed)
        .then((res) => {
          // Update temp message ID to real DB ID
          if (res?.data?.chat_message_id) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === tempId ? { ...msg, id: res.data.chat_message_id } : msg))
            );
          }
          // Update inbox preview in chatStore
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

      const tempId = `temp-img-${Date.now()}`;
      const timeString = formatTimeOnly();

      const newMsg: ChatMessage = {
        id: tempId,
        sender: 'me',
        imageUri: imageUri,
        time: timeString,
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

  const handleSelectReaction = (emoji: string) => {
    if (!reactingMessageId) return;
    const targetId = reactingMessageId;
    setReactingMessageId(null);

    // Optimistically toggle reaction locally
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === targetId
          ? { ...msg, reaction: msg.reaction === emoji ? undefined : emoji }
          : msg
      )
    );

    if (!effectiveToken) return;
    if (targetId.startsWith('temp-')) return;

    reactToChatMessage(effectiveToken, targetId, emoji)
      .then((res) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === targetId
              ? { ...msg, reaction: res.data?.my_reaction ?? undefined }
              : msg
          )
        );
      })
      .catch((err) => {
        console.warn('[ChatDetailScreen] reaction failed:', err);
      });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Pressable onPress={onClose} style={styles.backBtn} hitSlop={10}>
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
                <Text style={styles.contactSub}>{isOnline ? 'Online now' : 'Offline'}</Text>
                <Text style={{ color: '#C4C4C4', fontSize: 10 }}>•</Text>
                <View style={styles.headerRoleBadge}>
                  <Text style={styles.headerRoleBadgeText}>{contactRole}</Text>
                </View>
              </View>
            </View>
          </Pressable>

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
        </View>

        {/* Chat Body Container with backdrop press to dismiss reaction interface */}
        <Pressable 
          style={{ flex: 1 }} 
          onPress={() => {
            if (reactingMessageId) {
              setReactingMessageId(null);
            }
          }}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatBody}
            contentContainerStyle={styles.chatBodyContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          >
            {/* Date Separator Pill */}
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>
                Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>

            {/* Messages */}
            {messages.map((item) => {
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

              if (item.sender === 'other') {
                return (
                  <View key={item.id} style={styles.leftMessageRow}>
                    <Pressable
                      onPress={() => {
                        if (partnerId) {
                          setProfileModalVisible(true);
                        }
                      }}
                      hitSlop={6}
                    >
                      <Image source={{ uri: item.avatar || contactAvatar || resolvedAvatar }} style={styles.msgAvatar} />
                    </Pressable>
                    <View style={styles.leftMessageCol}>
                      {reactingMessageId === item.id ? (
                        <SmoothReactionPill align="left" onSelect={handleSelectReaction} />
                      ) : null}

                      <Pressable
                        onLongPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                        delayLongPress={250}
                      >
                        {item.imageUri && !item.text ? (
                          <View style={styles.imageBubbleContainer}>
                            <View style={styles.imageBubbleFrame}>
                              <Pressable
                                onPress={() => setSelectedImageUri(item.imageUri || null)}
                                onLongPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                                delayLongPress={250}
                              >
                                <Image source={{ uri: item.imageUri }} style={styles.chatImage} resizeMode="cover" />
                              </Pressable>
                            </View>
                            {item.reaction ? (
                              <Pressable
                                style={styles.reactionBadgeLeft}
                                onPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                                hitSlop={8}
                              >
                                <Text style={styles.reactionBadgeText}>{item.reaction}</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        ) : item.imageUri && item.text ? (
                          <View style={[styles.leftBubble, styles.bubbleWithImage]}>
                            <View style={styles.imageHeaderFrame}>
                              <Pressable
                                onPress={() => setSelectedImageUri(item.imageUri || null)}
                                onLongPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                                delayLongPress={250}
                              >
                                <Image source={{ uri: item.imageUri }} style={styles.chatImageWithCaption} resizeMode="cover" />
                              </Pressable>
                            </View>
                            <Text style={[styles.leftMsgText, styles.imageCaptionText]}>{item.text}</Text>
                            {item.reaction ? (
                              <Pressable
                                style={styles.reactionBadgeLeft}
                                onPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                                hitSlop={8}
                              >
                                <Text style={styles.reactionBadgeText}>{item.reaction}</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        ) : (
                          <View style={[styles.leftBubble, item.isTyping && styles.typingBubble]}>
                            {item.text ? (
                              <Text style={[styles.leftMsgText, item.isTyping && styles.typingText]}>
                                {item.text}
                              </Text>
                            ) : null}
                            {item.reaction ? (
                              <Pressable
                                style={styles.reactionBadgeLeft}
                                onPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                                hitSlop={8}
                              >
                                <Text style={styles.reactionBadgeText}>{item.reaction}</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        )}
                      </Pressable>

                      {item.time ? <Text style={styles.leftTimeText}>{item.time}</Text> : null}
                    </View>
                  </View>
                );
              }

              // Right Message (me)
              return (
                <View key={item.id} style={styles.rightMessageRow}>
                  {reactingMessageId === item.id ? (
                    <SmoothReactionPill align="right" onSelect={handleSelectReaction} />
                  ) : null}

                  <Pressable
                    onLongPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                    delayLongPress={250}
                  >
                    {item.imageUri && !item.text ? (
                      <View style={styles.imageBubbleContainer}>
                        <View style={styles.imageBubbleFrame}>
                          <Pressable
                            onPress={() => setSelectedImageUri(item.imageUri || null)}
                            onLongPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                            delayLongPress={250}
                          >
                            <Image source={{ uri: item.imageUri }} style={styles.chatImage} resizeMode="cover" />
                          </Pressable>
                        </View>
                        {item.reaction ? (
                          <Pressable
                            style={styles.reactionBadgeRight}
                            onPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                            hitSlop={8}
                          >
                            <Text style={styles.reactionBadgeText}>{item.reaction}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : item.imageUri && item.text ? (
                      <View style={[styles.rightBubble, styles.bubbleWithImage]}>
                        <View style={styles.imageHeaderFrame}>
                          <Pressable
                            onPress={() => setSelectedImageUri(item.imageUri || null)}
                            onLongPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                            delayLongPress={250}
                          >
                            <Image source={{ uri: item.imageUri }} style={styles.chatImageWithCaption} resizeMode="cover" />
                          </Pressable>
                        </View>
                        <Text style={[styles.rightMsgText, styles.imageCaptionText]}>{item.text}</Text>
                        {item.reaction ? (
                          <Pressable
                            style={styles.reactionBadgeRight}
                            onPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                            hitSlop={8}
                          >
                            <Text style={styles.reactionBadgeText}>{item.reaction}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : (
                      <View style={styles.rightBubble}>
                        {item.text ? <Text style={styles.rightMsgText}>{item.text}</Text> : null}
                        {item.reaction ? (
                          <Pressable
                            style={styles.reactionBadgeRight}
                            onPress={() => setReactingMessageId(reactingMessageId === item.id ? null : item.id)}
                            hitSlop={8}
                          >
                            <Text style={styles.reactionBadgeText}>{item.reaction}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    )}
                  </Pressable>

                  <Text style={styles.rightTimeText}>{item.time}</Text>
                </View>
              );
            })}
          </ScrollView>
        </Pressable>

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
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            value={inputMessage}
            onChangeText={setInputMessage}
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
        readOnly={bookingReadOnly}
        isConfirmed={activeBookingMsgId ? messages.find((m) => m.id === activeBookingMsgId)?.bookingInfo?.isConfirmed : false}
        userRole={userRole}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 12,
    maxWidth: '78%',
  },
  rightBubble: {
    backgroundColor: '#FFB43B',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    height: 280,
    borderRadius: 18,
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
  reactionBadgeLeft: {
    position: 'absolute',
    bottom: -8,
    right: -4,
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
  reactionBadgeRight: {
    position: 'absolute',
    bottom: -8,
    right: -4,
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
