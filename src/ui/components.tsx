import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type TextProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { space, useTheme } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const VARIANTS = {
  hero: { fontSize: 40, lineHeight: 46, fontWeight: '800' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

export function Txt({ variant = 'body', muted, style, ...props }: TextProps & { variant?: keyof typeof VARIANTS; muted?: boolean }) {
  const { colors } = useTheme();
  return <Text {...props} style={[VARIANTS[variant], { color: muted ? colors.textMuted : colors.text }, style]} />;
}

/** Scrolling page with the safe-area padding. */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl, paddingHorizontal: space.lg, gap: space.lg };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: colors.bg }, padding]}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={padding} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: ViewStyle; tone?: 'good' | 'over' | 'primary' }) {
  const { colors } = useTheme();
  const backgroundColor = tone === 'good' ? colors.goodSoft : tone === 'over' ? colors.overSoft : tone === 'primary' ? colors.primarySoft : colors.surface;
  return <View style={[{ backgroundColor, borderRadius: 16, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: colors.border }, style]}>{children}</View>;
}

export function Button({ title, onPress, kind = 'primary', disabled, icon }: { title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'plain'; disabled?: boolean; icon?: IconName }) {
  const { colors } = useTheme();
  const bg = kind === 'primary' ? colors.primary : kind === 'secondary' ? colors.surfaceAlt : 'transparent';
  const fg = kind === 'primary' ? colors.primaryText : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1, minHeight: 48, borderRadius: 12, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm })}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Txt variant="label" style={{ color: fg, fontSize: 15 }}>
        {title}
      </Txt>
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[{ minHeight: 48, borderRadius: 12, paddingHorizontal: space.md, backgroundColor: colors.surfaceAlt, color: colors.text, fontSize: 15 }, props.multiline && { paddingTop: space.md, minHeight: 88, textAlignVertical: 'top' }, props.style]}
    />
  );
}

/** − value + in fixed steps, clamped to [min, max]. */
export function Stepper({ value, onChange, step, min, max, format }: { value: number; onChange: (v: number) => void; step: number; min: number; max: number; format: (v: number) => string }) {
  const { colors } = useTheme();
  const btn = (icon: IconName, next: number, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={next < min || next > max}
      onPress={() => onChange(next)}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {btn('remove', value - step, 'Less')}
      <Txt variant="title">{format(value)}</Txt>
      {btn('add', value + step, 'More')}
    </View>
  );
}

/** Progress ring: fills toward 100%, then turns the "over" colour. */
export function Ring({ progress, size = 200, children }: { progress: number; size?: number; children?: ReactNode }) {
  const { colors } = useTheme();
  const stroke = 16;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const shown = Math.min(1, Math.max(0, progress));
  const color = progress > 1 ? colors.over : progress > 0.8 ? colors.over + 'CC' : colors.primary;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - shown)} />
      </Svg>
      {children}
    </View>
  );
}

export function Row({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const content = <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 }, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {content}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ paddingHorizontal: space.md, minHeight: 36, justifyContent: 'center', borderRadius: 18, backgroundColor: selected ? colors.primary : colors.surfaceAlt }}
    >
      <Txt variant="label" style={{ color: selected ? colors.primaryText : colors.text }}>
        {label}
      </Txt>
    </Pressable>
  );
}
