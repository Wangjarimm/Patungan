import type { Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, fontSizes, minTouchTarget, radius, spacing, useTheme } from '@/theme';

export type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const BAR_HEIGHT = 64;
const BAR_MARGIN = spacing.lg;
const PILL_INSET = spacing.xs + 2;
const LABEL_GAP = spacing.xs + 2;

// Reanimated springs take a perceptual duration; the real one is about 1.5x longer.
// 307 ms perceptual is roughly the 460 ms slide the PRD asks for.
export const SLIDE_SPRING = { duration: 307, dampingRatio: 0.72 } as const;
const BOUNCE_UP = { duration: 120, dampingRatio: 0.6 } as const;
const BOUNCE_DOWN = { duration: 220, dampingRatio: 0.5 } as const;

// Space screens must leave at the bottom so content is not hidden behind the capsule.
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + BAR_MARGIN + insets.bottom + spacing.md;
}

type TabItemProps = {
  label: string;
  accessibilityLabel: string;
  focused: boolean;
  reduceMotion: boolean;
  renderIcon: (color: string) => ReactNode;
  onPress: () => void;
  onLongPress: () => void;
};

function TabItem({
  label,
  accessibilityLabel,
  focused,
  reduceMotion,
  renderIcon,
  onPress,
  onLongPress,
}: TabItemProps) {
  const { colors } = useTheme();
  const [labelWidth, setLabelWidth] = useState(0);
  const progress = useSharedValue(focused ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = focused ? 1 : 0;
      return;
    }
    progress.value = withSpring(focused ? 1 : 0, SLIDE_SPRING);
    if (focused) {
      // Small bounce when the tab becomes active.
      scale.value = withSequence(withSpring(1.18, BOUNCE_UP), withSpring(1, BOUNCE_DOWN));
    }
  }, [focused, reduceMotion, progress, scale]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  // The label widens from nothing into its measured width.
  const labelStyle = useAnimatedStyle(() => ({
    width: labelWidth * progress.value,
    marginLeft: LABEL_GAP * progress.value,
    opacity: progress.value,
  }));

  const color = focused ? colors.onAccent : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      style={styles.item}>
      <View style={styles.itemContent}>
        <Animated.View style={iconStyle}>{renderIcon(color)}</Animated.View>
        <Animated.View style={[styles.labelClip, labelStyle]}>
          <Text numberOfLines={1} style={[styles.label, { color: colors.onAccent }]}>
            {label}
          </Text>
        </Animated.View>
      </View>
      {/* Invisible copy to measure the label's natural width. */}
      <Text
        style={[styles.label, styles.measure]}
        onLayout={(e: LayoutChangeEvent) => setLabelWidth(e.nativeEvent.layout.width)}
        accessible={false}
        importantForAccessibility="no-hide-descendants">
        {label}
      </Text>
    </Pressable>
  );
}

// Floating capsule with an accent pill that springs to the active tab (PRD section 6).
export function AnimatedTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const slotWidth = state.routes.length > 0 ? width / state.routes.length : 0;
  const offset = useSharedValue(0);

  useEffect(() => {
    const target = state.index * slotWidth;
    offset.value = reduceMotion || slotWidth === 0 ? target : withSpring(target, SLIDE_SPRING);
  }, [state.index, slotWidth, reduceMotion, offset]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: insets.bottom + BAR_MARGIN }]}>
      <View
        testID="tab-bar"
        accessibilityRole="tablist"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.bar, { backgroundColor: colors.surface, shadowColor: colors.text }]}>
        {slotWidth > 0 ? (
          <Animated.View
            testID="tab-pill"
            style={[
              styles.pill,
              { width: slotWidth - PILL_INSET * 2, backgroundColor: colors.accent },
              pillStyle,
            ]}
          />
        ) : null}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const label = options.title ?? route.name;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TabItem
              key={route.key}
              label={label}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              focused={focused}
              reduceMotion={reduceMotion}
              renderIcon={(color) => options.tabBarIcon?.({ focused, color, size: 22 }) ?? null}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: BAR_MARGIN,
    right: BAR_MARGIN,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  pill: {
    position: 'absolute',
    left: PILL_INSET,
    top: (BAR_HEIGHT - 48) / 2,
    height: 48,
    borderRadius: radius.pill,
  },
  item: {
    flex: 1,
    height: BAR_HEIGHT,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelClip: {
    overflow: 'hidden',
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.small,
  },
  measure: {
    position: 'absolute',
    opacity: 0,
  },
});
