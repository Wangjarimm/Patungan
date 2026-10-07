import { Tabs } from 'expo-router';

import { HistoryIcon, HomeIcon, ProfileIcon } from '@/components/tab-icons';
import { fonts, fontSizes, minTouchTarget, useTheme } from '@/theme';

// Plain tab bar for now; the floating animated capsule (AnimatedTabBar) comes in phase 2.
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          minHeight: minTouchTarget,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyStrong, fontSize: fontSizes.caption },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarAccessibilityLabel: 'Beranda',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="riwayat"
        options={{
          title: 'Riwayat',
          tabBarAccessibilityLabel: 'Riwayat',
          tabBarIcon: ({ color }) => <HistoryIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarAccessibilityLabel: 'Profil',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
