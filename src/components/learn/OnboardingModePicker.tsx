import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../context/ThemeContext';

export type OnboardingMode = 'start_from_zero' | 'assessment';

type Props = {
  value: OnboardingMode;
  onChange: (mode: OnboardingMode) => void;
};

const OPTIONS: {
  key: OnboardingMode;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: 'start_from_zero',
    title: 'С нуля',
    subtitle: 'Сразу дорожная карта без входного теста',
    icon: 'map-outline',
  },
  {
    key: 'assessment',
    title: 'Через тест',
    subtitle: 'Сначала оценка уровня, затем персональный план',
    icon: 'clipboard-outline',
  },
];

export function OnboardingModePicker({ value, onChange }: Props) {
  const { colors } = useAppTheme();
  const s = styles(colors);

  return (
    <View style={s.wrap}>
      {OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            style={[s.card, active && s.cardActive]}
            onPress={() => onChange(opt.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <View style={[s.iconWrap, active && s.iconWrapActive]}>
              <Ionicons name={opt.icon} size={26} color={active ? colors.accent : colors.ink3} />
            </View>
            <View style={s.textCol}>
              <Text style={[s.title, active && s.titleActive]}>{opt.title}</Text>
              <Text style={s.subtitle}>{opt.subtitle}</Text>
            </View>
            {active ? <Ionicons name="checkmark-circle" size={22} color={colors.accent} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      backgroundColor: colors.surface2,
    },
    cardActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentMuted,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    iconWrapActive: { borderColor: colors.accent, backgroundColor: colors.surface },
    textCol: { flex: 1, minWidth: 0 },
    title: { fontSize: 17, fontWeight: '700', color: colors.ink },
    titleActive: { color: colors.accent },
    subtitle: { fontSize: 13, color: colors.ink3, marginTop: 4, lineHeight: 18 },
  });
}
