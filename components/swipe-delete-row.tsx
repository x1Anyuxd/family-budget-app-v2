import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useBudget } from '@/lib/budget-context';
import { getI18n } from '@/lib/i18n';

type SwipeAction = {
  key: string;
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
};

export function SwipeDeleteRow({
  children,
  onDelete,
  leftActions,
  rightActions,
}: {
  children: React.ReactNode;
  onDelete?: () => void;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
}) {
  const colors = useColors();
  const { settings } = useBudget();
  const i18n = getI18n(settings.locale);

  const mergedRightActions = rightActions ?? (onDelete
    ? [
        {
          key: 'delete',
          label: i18n.common.delete,
          icon: 'trash',
          color: colors.error,
          onPress: onDelete,
        },
      ]
    : []);

  const renderActions = (actions: SwipeAction[]) => {
    if (!actions.length) return <View />;
    return (
      <View style={styles.actionsWrap}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            style={[styles.actionButton, { backgroundColor: action.color }]}
          >
            <IconSymbol name={action.icon as any} size={18} color="#fff" />
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <Swipeable
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={leftActions?.length ? () => renderActions(leftActions) : undefined}
      renderRightActions={mergedRightActions.length ? () => renderActions(mergedRightActions) : undefined}
    >
      <View>{children}</View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsWrap: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 82,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
