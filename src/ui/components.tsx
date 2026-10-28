import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type TextProps, type ViewStyle } from 'react-native';
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
  const { colors, dark } = useTheme();
  const backgroundColor = tone === 'good' ? colors.goodSoft : tone === 'over' ? colors.overSoft : tone === 'primary' ? colors.primarySoft : colors.surface;
  return (
    <View
      style={[
        { backgroundColor, borderRadius: 20, padding: space.lg, gap: space.sm },
        // Depth instead of outlines in light mode; outlines in dark, where shadows don't show.
        dark ? { borderWidth: 1, borderColor: colors.border } : { shadowColor: '#1C1A17', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A section title above a group of cards, with an optional action on the right. */
export function Section({ title, action, onAction, meta }: { title: string; action?: string; onAction?: () => void; meta?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: space.sm, paddingHorizontal: space.xs }}>
      <Txt variant="label" style={{ color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 12 }}>
        {title}
      </Txt>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Txt variant="label" style={{ color: colors.primary }}>
            {action}
          </Txt>
        </Pressable>
      ) : meta ? (
        <Txt variant="label" muted>
          {meta}
        </Txt>
      ) : null}
    </View>
  );
}

/** A compact figure with an icon: streak, freezes, time won back. */
export function StatChip({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.sm, borderRadius: 14, backgroundColor: colors.surfaceAlt }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Txt variant="heading">{value}</Txt>
      <Txt variant="caption" muted>
        {label}
      </Txt>
    </View>
  );
}

/** Shown while a screen's first load runs: never a blank page. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Txt muted>{label}</Txt>
      </View>
    </Screen>
  );
}

/** A load that failed, with the reason and a way to try again. */
export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.lg }}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
        <Txt variant="heading" style={{ textAlign: 'center' }}>
          Couldn't load this screen
        </Txt>
        <Txt muted style={{ textAlign: 'center' }}>
          {error.message}
        </Txt>
        <Button title="Try again" icon="refresh" onPress={onRetry} />
      </View>
    </Screen>
  );
}

/** A thin bar for "how much of": per-app time, progress to a goal. */
export function Bar({ fraction, color }: { fraction: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' }}>
      <View style={{ height: 6, borderRadius: 3, width: `${Math.min(100, Math.max(0, fraction * 100))}%`, backgroundColor: color ?? colors.primary }} />
    </View>
  );
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

/** For screens pushed on top of the tabs: the way back, since their header is hidden. */
export function BackBar({ title }: { title?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={12}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1, marginLeft: -space.xs })}
    >
      <Ionicons name="chevron-back" size={24} color={colors.primary} />
      <Txt variant="label" style={{ color: colors.primary, fontSize: 15 }}>
        {title ?? 'Back'}
      </Txt>
    </Pressable>
  );
}
