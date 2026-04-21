import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useBudget } from '@/lib/budget-context';
import { getI18n } from '@/lib/i18n';

export function SwipeDeleteRow({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const colors = useColors();
  const { settings } = useBudget();
  const i18n = getI18n(settings.locale);

  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <Pressable onPress={onDelete} style={[styles.deleteAction, { backgroundColor: colors.error }]}> 
          <IconSymbol name="trash" size={18} color="#fff" />
          <Text style={styles.deleteText}>{i18n.common.delete}</Text>
        </Pressable>
      )}
    >
      <View>{children}</View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    width: 82,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
