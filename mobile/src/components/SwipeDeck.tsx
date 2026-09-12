import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors } from '@/theme';

export type SwipeDirection = 'left' | 'right';
export interface SwipeDeckHandle {
  swipe: (dir: SwipeDirection) => void;
}

interface Props<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderCard: (item: T, isTop: boolean) => React.ReactNode;
  onSwipe: (item: T, dir: SwipeDirection) => void;
  onTap?: (item: T) => void;
  empty?: React.ReactNode;
  likeLabel?: string;
  passLabel?: string;
}

const { width: W } = Dimensions.get('window');
const THRESHOLD = 120;

function SwipeDeckInner<T>(
  { data, keyExtractor, renderCard, onSwipe, onTap, empty, likeLabel = 'LIKE', passLabel = 'PASS' }: Props<T>,
  ref: React.ForwardedRef<SwipeDeckHandle>,
) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const top = data[0];

  const finish = useCallback((dir: SwipeDirection) => {
    const item = data[0];
    x.value = 0;
    y.value = 0;
    if (item !== undefined) onSwipe(item, dir);
  }, [data, onSwipe, x, y]);

  const flyOut = useCallback((dir: SwipeDirection) => {
    'worklet';
    const target = dir === 'right' ? W * 1.5 : -W * 1.5;
    x.value = withTiming(target, { duration: 260 }, (done) => {
      if (done) scheduleOnRN(finish, dir);
    });
  }, [finish, x]);

  useImperativeHandle(ref, () => ({
    swipe: (dir) => {
      if (data.length === 0) return;
      flyOut(dir);
    },
  }), [data.length, flyOut]);

  const pan = Gesture.Pan()
    .minDistance(8)
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY * 0.5;
    })
    .onEnd((e) => {
      const fling = Math.abs(e.velocityX) > 900;
      if (x.value > THRESHOLD || (fling && e.velocityX > 0)) flyOut('right');
      else if (x.value < -THRESHOLD || (fling && e.velocityX < 0)) flyOut('left');
      else {
        x.value = withSpring(0, { damping: 18 });
        y.value = withSpring(0, { damping: 18 });
      }
    });

  const tap = Gesture.Tap().onEnd(() => {
    if (onTap && top !== undefined) scheduleOnRN(onTap, top);
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-W, 0, W], [-15, 0, 15])}deg` },
    ],
  }));
  const nextStyle = useAnimatedStyle(() => {
    const p = interpolate(Math.abs(x.value), [0, THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { transform: [{ scale: 0.95 + 0.05 * p }, { translateY: 10 - 10 * p }] };
  });
  const likeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, THRESHOLD], [0, 1], Extrapolation.CLAMP) }));
  const passStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-THRESHOLD, 0], [1, 0], Extrapolation.CLAMP) }));

  if (data.length === 0) return <View style={styles.deck}>{empty}</View>;

  const visible = data.slice(0, 3);
  return (
    <View style={styles.deck}>
      {visible.map((item, i) => {
        const isTop = i === 0;
        const key = keyExtractor(item);
        if (isTop) {
          return (
            <GestureDetector key={key} gesture={gesture}>
              <Animated.View style={[styles.card, { zIndex: 10 }, topStyle]}>
                {renderCard(item, true)}
                <Animated.View style={[styles.stamp, styles.like, likeStyle]}><Text style={[styles.stampText, { color: colors.success }]}>{likeLabel}</Text></Animated.View>
                <Animated.View style={[styles.stamp, styles.pass, passStyle]}><Text style={[styles.stampText, { color: colors.danger }]}>{passLabel}</Text></Animated.View>
              </Animated.View>
            </GestureDetector>
          );
        }
        return (
          <Animated.View key={key} pointerEvents="none" style={[styles.card, { zIndex: 10 - i }, i === 1 ? nextStyle : styles.third]}>
            {renderCard(item, false)}
          </Animated.View>
        );
      })}
    </View>
  );
}

export const SwipeDeck = forwardRef(SwipeDeckInner) as <T>(p: Props<T> & { ref?: React.Ref<SwipeDeckHandle> }) => React.ReactElement;

const styles = StyleSheet.create({
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', width: '100%', height: '100%' },
  third: { transform: [{ scale: 0.9 }, { translateY: 20 }] },
  stamp: { position: 'absolute', top: 28, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 3, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.85)' },
  like: { left: 20, borderColor: colors.success, transform: [{ rotate: '-15deg' }] },
  pass: { right: 20, borderColor: colors.danger, transform: [{ rotate: '15deg' }] },
  stampText: { fontSize: 28, fontWeight: '900', letterSpacing: 2 },
});
