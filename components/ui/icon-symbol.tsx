import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

const iconMap = {
  'house.fill': 'home',
  'list.bullet': 'list',
  'chart.bar.fill': 'bar-chart',
  target: 'track-changes',
  gear: 'settings',
  'plus.circle.fill': 'add-circle',
  'note.text': 'sticky-note-2',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.up': 'expand-less',
  'chevron.down': 'expand-more',
  restaurant: 'restaurant',
  'directions-car': 'directions-car',
  'shopping-bag': 'shopping-bag',
  home: 'home',
  movie: 'movie',
  'local-hospital': 'local-hospital',
  school: 'school',
  bolt: 'bolt',
  checkroom: 'checkroom',
  'more-horiz': 'more-horiz',
  work: 'work',
  'trending-up': 'trending-up',
  'card-giftcard': 'card-giftcard',
  'attach-money': 'attach-money',
  xmark: 'close',
  camera: 'photo-camera',
  photo: 'photo-library',
  calendar: 'calendar-month',
  'info.circle': 'info',
  heart: 'favorite',
  'person.crop.circle': 'account-circle',
  checkmark: 'check',
  'arrow.down.doc': 'download',
  paintbrush: 'palette',
  pencil: 'edit',
  trash: 'delete',
  'arrow.left': 'arrow-back',
} as const satisfies Record<string, ComponentProps<typeof MaterialIcons>['name']>;

type IconName = keyof typeof iconMap | ComponentProps<typeof MaterialIcons>['name'];

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight,
}: {
  name: IconName;
  size?: number;
  color: string;
  style?: StyleProp<TextStyle | ViewStyle>;
  weight?: string;
}) {
  const mappedName = (iconMap[name as keyof typeof iconMap] ?? name) as ComponentProps<typeof MaterialIcons>['name'];
  return <MaterialIcons name={mappedName} size={size} color={color} style={style} />;
}
