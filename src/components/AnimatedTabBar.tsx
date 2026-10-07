import type { Tabs } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, fontSizes, minTouchTarget, radius, spacing, useTheme, withAlpha } from '@/theme';

export type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const BAR_HEIGHT = 64;
const BAR_MARGIN = spacing.lg;
const PILL_INSET = spacing.xs + 2;
const PILL_HEIGHT = 48;
const ICON_SIZE = 22;
const LABEL_GAP = spacing.xs + 2;

// Reanimated springs take a perceptual duration; the real one is about 1.5x longer, so
// 307 ms is roughly the 460 ms slide the PRD asks for. A damping ratio close to 1 settles
// smoothly with only a hint of overshoot.
export const SLIDE_SPRING = { duration: 307, dampingRatio: 0.9 } as const;

// Peak extra icon scale halfway through a switch: a small bounce, not a wobble.
const ICON_BUMP = 0.12;

// Floating shadow under the capsule. The web wants boxShadow (shadow* props are deprecated
// there); Android and iOS keep the native shadow props and elevation, unchanged.
export function barShadow(color: string): ViewStyle {
  if (Platform.OS === 'web') {
    return { boxShadow: `0px 8px 24px ${withAlpha(color, 0.12)}` };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  };
}

// Space screens must leave at the bottom so content is not hidden behind the capsule.
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + BAR_MARGIN + insets.bottom + spacing.md;
}

type TabItemProps = {
  index: number;
  // Animated tab index shared by the whole bar; drives every animation on the UI thread.
  position: SharedValue<number>;
  label: string;
  accessibilityLabel: string;
  focused: boolean;
  renderIcon: (color: string) => ReactNode;
  onPressIn: (index: number) => void;
  onPressOut: (index: number) => void;
  onPress: (index: number) => void;
  onLongPress: (index: number) => void;
};

function TabItem({
  index,
  position,
  label,
  accessibilityLabel,
  focused,
  renderIcon,
  onPressIn,
  onPressOut,
  onPress,
  onLongPress,
}: TabItemProps) {
  const { colors } = useTheme();
  // Measured once from the label's own layout; never animated.
  const labelWidth = useSharedValue(0);

  // 1 when this tab sits under the pill, 0 when the pill is a full slot away.
  const contentStyle = useAnimatedStyle(() => {
    const active = Math.max(0, 1 - Math.abs(position.get() - index));
    // Inactive: shift right so the icon alone is centered. Active: icon and label centered.
    const shift = ((labelWidth.get() + LABEL_GAP) / 2) * (1 - active);
    return { transform: [{ translateX: shift }] };
  });
  const iconStyle = useAnimatedStyle(() => {
    const active = Math.max(0, 1 - Math.abs(position.get() - index));
    // Bump peaks mid-switch and settles at 1 on both ends.
    return { transform: [{ scale: 1 + ICON_BUMP * 4 * active * (1 - active) }] };
  });
  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - Math.abs(position.get() - index)),
  }));
  const idleIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, 1 - Math.abs(position.get() - index)),
  }));
  const labelStyle = useAnimatedStyle(() => {
    const active = Math.max(0, 1 - Math.abs(position.get() - index));
    return {
      opacity: active,
      transform: [
        { translateX: interpolate(active, [0, 1], [-LABEL_GAP, 0]) },
        { scale: interpolate(active, [0, 1], [0.85, 1]) },
      ],
    };
  });

  return (
    <Pressable
      onPressIn={() => onPressIn(index)}
      onPressOut={() => onPressOut(index)}
      onPress={() => onPress(index)}
      onLongPress={() => onLongPress(index)}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      style={styles.item}>
      <Animated.View style={[styles.itemContent, contentStyle]}>
        <Animated.View style={[styles.icon, iconStyle]}>
          <Animated.View style={[styles.iconLayer, idleIconStyle]}>
            {renderIcon(colors.textMuted)}
          </Animated.View>
          <Animated.View style={[styles.iconLayer, activeIconStyle]}>
            {renderIcon(colors.onAccent)}
          </Animated.View>
        </Animated.View>
        <Animated.View
          style={labelStyle}
          onLayout={(e: LayoutChangeEvent) => {
            if (labelWidth.get() === 0) labelWidth.set(e.nativeEvent.layout.width);
          }}>
          <Text numberOfLines={1} style={[styles.label, { color: colors.onAccent }]}>
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
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

  const position = useSharedValue(state.index);
  // Tab the pill is heading to; lets onPressIn start the slide before navigation runs.
  const target = useRef(state.index);
  const pressed = useRef<number | null>(null);

  const moveTo = (index: number) => {
    target.current = index;
    position.set(reduceMotion ? index : withSpring(index, SLIDE_SPRING));
  };

  // Follow navigation that did not come from a tap (back button, deep link, cancelled tap).
  useEffect(() => {
    if (target.current !== state.index) moveTo(state.index);
  });

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() * slotWidth }],
  }));

  const onPressIn = (index: number) => {
    pressed.current = null;
    if (index !== state.index) moveTo(index);
  };

  const onPress = (index: number) => {
    pressed.current = index;
    const route = state.routes[index];
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (index === state.index) return;
    if (event.defaultPrevented) moveTo(state.index);
    else navigation.navigate(route.name, route.params);
  };

  // A press that ends without onPress (finger dragged away) puts the pill back.
  const onPressOut = (index: number) => {
    requestAnimationFrame(() => {
      if (pressed.current !== index && target.current === index) moveTo(state.index);
    });
  };

  const onLongPress = (index: number) => {
    const route = state.routes[index];
    if (route) navigation.emit({ type: 'tabLongPress', target: route.key });
  };

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + BAR_MARGIN }]}>
      <View
        testID="tab-bar"
        accessibilityRole="tablist"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.bar, { backgroundColor: colors.surface }, barShadow(colors.text)]}>
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
          return (
            <TabItem
              key={route.key}
              index={index}
              position={position}
              label={label}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              focused={focused}
              renderIcon={(color) =>
                options.tabBarIcon?.({ focused, color, size: ICON_SIZE }) ?? null
              }
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={onPress}
              onLongPress={onLongPress}
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
    // Taps outside the capsule reach the screen underneath.
    pointerEvents: 'box-none',
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    position: 'absolute',
    left: PILL_INSET,
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
    borderRadius: radius.pill,
  },
  item: {
    flex: 1,
    height: BAR_HEIGHT,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LABEL_GAP,
  },
  icon: {
    width: ICON_SIZE + 2,
    height: ICON_SIZE + 2,
  },
  iconLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.small,
  },
});
