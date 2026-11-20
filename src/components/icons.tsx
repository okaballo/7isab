import {
  IconBolt, IconBook, IconBus, IconCoffee, IconDeviceGamepad2, IconGift, IconHeartbeat, IconHome2,
  IconPhone, IconPigMoney, IconPlane, IconSchool, IconShirt, IconShoppingCart, IconToolsKitchen2, IconWallet, IconWifi,
  type Icon,
} from '@tabler/icons-react';

/** Envelope icons. The DB stores the key; unknown keys fall back to a wallet. */
export const ENVELOPE_ICONS: Record<string, Icon> = {
  'home-2': IconHome2,
  bolt: IconBolt,
  'tools-kitchen-2': IconToolsKitchen2,
  bus: IconBus,
  'device-gamepad-2': IconDeviceGamepad2,
  'pig-money': IconPigMoney,
  'shopping-cart': IconShoppingCart,
  coffee: IconCoffee,
  book: IconBook,
  school: IconSchool,
  heartbeat: IconHeartbeat,
  phone: IconPhone,
  wifi: IconWifi,
  shirt: IconShirt,
  gift: IconGift,
  plane: IconPlane,
  wallet: IconWallet,
};

export function EnvIcon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const C = ENVELOPE_ICONS[name] ?? IconWallet;
  return <C size={size} stroke={1.75} color={color} aria-hidden />;
}
