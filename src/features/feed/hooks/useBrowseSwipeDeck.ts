import { useCallback, useEffect, useRef } from 'react';
import { Animated, PanResponder, useWindowDimensions } from 'react-native';

export function useBrowseSwipeDeck(itemId: string | number | undefined, onSwipe: (interested: boolean) => void) {
  const { width } = useWindowDimensions();
  const position = useRef(new Animated.ValueXY()).current;
  const current = useRef({ itemId, onSwipe, width });
  current.current = { itemId, onSwipe, width };
  const busy = useRef(false);
  const version = useRef(0);

  useEffect(() => {
    version.current++;
    busy.current = false;
    position.stopAnimation();
    position.setValue({ x: 0, y: 0 });
    return () => { version.current++; position.stopAnimation(); };
  }, [itemId, position]);

  const swipeCard = useCallback((direction: 'left' | 'right') => {
    if (busy.current || current.current.itemId === undefined) return;
    busy.current = true;
    const request = version.current;
    const handleSwipe = current.current.onSwipe;
    Animated.timing(position, { toValue: { x: (direction === 'right' ? 1 : -1) * current.current.width * 1.5, y: 0 }, duration: 250, useNativeDriver: false }).start(({ finished }) => {
      if (finished && request === version.current) handleSwipe(direction === 'right');
      if (request === version.current) { busy.current = false; position.setValue({ x: 0, y: 0 }); }
    });
  }, [position]);

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => !busy.current && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => { if (!busy.current) position.setValue({ x: gesture.dx, y: 0 }); },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > current.current.width * 0.25) swipeCard(gesture.dx > 0 ? 'right' : 'left');
      else Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();
    },
    onPanResponderTerminate: () => { if (!busy.current) position.setValue({ x: 0, y: 0 }); },
  })).current;
  const rotateCard = position.x.interpolate({ inputRange: [-width / 2, 0, width / 2], outputRange: ['-10deg', '0deg', '10deg'], extrapolate: 'clamp' });
  return { position, rotateCard, panHandlers: responder.panHandlers, swipeCard };
}
