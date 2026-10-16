import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { c, radius, space, type } from '../theme';
import { Icon, type IconName } from './icons';

export function Screen({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[{ paddingBottom: insets.bottom + space[12], gap: space[4] }, padded && { padding: space[4] }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {children}
    </ScrollView>
  );
}

export function Label({ children, color, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.label, color ? { color } : null, style]}>{children}</Text>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={type.h1}>{children}</Text>;
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.h2, style]}>{children}</Text>;
}

type Variant = 'primary' | 'outline' | 'subtle' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'outline',
  icon,
  small,
  disabled,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { height: small ? 36 : 48, backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={v.fg} /> : null}
      <Text style={[type.button, { color: v.fg, fontSize: small ? 12 : 13 }]}>{title}</Text>
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: c.ember, fg: c.onEmber, border: c.ember },
  outline: { bg: 'transparent', fg: c.ink, border: c.borderStrong },
  subtle: { bg: c.surface, fg: c.ink2, border: c.border },
  ghost: { bg: 'transparent', fg: c.emberText, border: 'transparent' },
  danger: { bg: 'transparent', fg: c.critical, border: c.border },
};

export function IconButton({ name, onPress, label, color = c.ink, size = 20 }: { name: IconName; onPress: () => void; label: string; color?: string; size?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.8 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Label style={{ fontSize: 10 }}>{label}</Label>
      <Text style={[type.data, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.seg}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segItem, on && { backgroundColor: c.border }]}
          >
            <Text style={[type.label, { color: on ? c.ink : c.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: c.dawn, borderColor: c.ember }]}
    >
      <Text style={[type.label, { color: selected ? c.ink : c.ink2 }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space[2] }, style]}>{children}</View>;
}

export function ListRow({
  title,
  detail,
  value,
  onPress,
  right,
  last,
}: {
  title: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  last?: boolean;
}) {
  const content = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.body}>{title}</Text>
        {detail ? <Text style={[type.bodySm, { color: c.muted, fontSize: 13 }]}>{detail}</Text> : null}
      </View>
      {value ? <Text style={[type.data, { color: c.muted }]}>{value}</Text> : null}
      {right}
      {onPress && !right ? <Icon name="right" size={16} color={c.muted} /> : null}
    </>
  );
  const style = [styles.listRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }];
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, pressed && { backgroundColor: c.sunken }]}>
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

export function ToggleRow({ title, detail, value, onChange, last }: { title: string; detail?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <ListRow
      title={title}
      detail={detail}
      last={last}
      right={
        <Switch
          accessibilityLabel={title}
          value={value}
          onValueChange={onChange}
          trackColor={{ false: c.sunken, true: c.dawn }}
          thumbColor={value ? c.ember : c.muted}
          ios_backgroundColor={c.sunken}
        />
      }
    />
  );
}

export function Empty({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={type.h3}>{title}</Text>
      {body ? <Text style={[type.bodySm, { textAlign: 'center' }]}>{body}</Text> : null}
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space[4],
    gap: space[3],
  },
  seg: { flexDirection: 'row', backgroundColor: c.sunken, borderRadius: radius.md, padding: 3, gap: 3 },
  segItem: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: space[2] },
  chip: { borderWidth: 1, borderColor: c.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 52, paddingHorizontal: space[4], paddingVertical: space[2] },
  empty: {
    alignItems: 'center',
    gap: space[3],
    padding: space[8],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border,
    borderRadius: radius.lg,
  },
});
