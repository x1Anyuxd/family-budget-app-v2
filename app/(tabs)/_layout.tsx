import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useBudget } from '@/lib/budget-context';
import { getI18n } from '@/lib/i18n';

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useBudget();
  const i18n = getI18n(settings.locale);
  const bottomPadding = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: i18n.tabs.home,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: i18n.tabs.records,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="list.bullet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: i18n.tabs.statistics,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: i18n.tabs.budget,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="target" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: i18n.tabs.settings,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gear" color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-transaction"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="receipt-result"
        options={{ href: null }}
      />
    </Tabs>
  );
}
