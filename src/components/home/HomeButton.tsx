import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { homeLayout, homeRadius, homeTypography, useHomeTheme, type HomeThemeColors } from '../../theme/theme';

type Variant = 'primary' | 'ghost' | 'ghostLight' | 'outline';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'default' | 'large';
  disabled?: boolean;
  loading?: boolean;
  showGoogleIcon?: boolean;
  fullWidth?: boolean;
};

export function HomeButton({
  label,
  onPress,
  variant = 'ghost',
  size = 'default',
  disabled = false,
  loading = false,
  showGoogleIcon = false,
  fullWidth = true,
}: Props) {
  const { colors } = useHomeTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const isLarge = size === 'large';
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      style={({ pressed }) => [
        s.base,
        isLarge && s.large,
        variant === 'primary' && s.primary,
        variant === 'ghost' && s.ghost,
        variant === 'ghostLight' && s.ghostLight,
        variant === 'outline' && s.outline,
        fullWidth && s.fullWidth,
        (disabled || loading) && s.disabled,
        pressed && !disabled && !loading && s.pressed,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.primaryBtnText : colors.ink2} />
      ) : (
        <View style={s.inner}>
          {showGoogleIcon ? (
            <Ionicons name="logo-google" size={16} color={colors.ink2} />
          ) : null}
          <Text
            style={[
              s.label,
              isLarge && s.labelLarge,
              isPrimary && s.labelPrimary,
              variant === 'ghost' && s.labelGhost,
              variant === 'ghostLight' && s.labelGhostLight,
              variant === 'outline' && s.labelOutline,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function styles(colors: HomeThemeColors) {
  return StyleSheet.create({
    base: {
      height: homeLayout.btnHeight,
      paddingHorizontal: homeLayout.btnPaddingH,
      borderRadius: homeRadius.btn,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    large: {
      height: homeLayout.btnHeightLarge,
      paddingHorizontal: homeLayout.btnPaddingHLarge,
    },
    fullWidth: {
      width: '100%',
    },
    primary: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    ghost: {
      borderColor: colors.line,
      backgroundColor: 'transparent',
    },
    ghostLight: {
      borderColor: 'rgba(255,255,255,0.25)',
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    outline: {
      borderColor: colors.line,
      backgroundColor: 'transparent',
    },
    disabled: {
      opacity: 0.6,
    },
    pressed: {
      opacity: 0.92,
    },
    inner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      fontSize: homeTypography.btn.fontSize,
      fontWeight: homeTypography.btn.fontWeight,
      color: colors.ink,
    },
    labelLarge: {
      fontSize: homeTypography.btnLarge.fontSize,
    },
    labelPrimary: {
      color: colors.primaryBtnText,
    },
    labelGhost: {
      color: colors.ink2,
    },
    labelGhostLight: {
      color: 'rgba(255,255,255,0.85)',
    },
    labelOutline: {
      color: colors.ink2,
    },
  });
}
