import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '../../context/ThemeContext';

type ChipOption = { value: string; label: string };

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: React.ReactNode;
  error?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
};

export function LearnFieldLabel({ children }: { children: string }) {
  const { colors } = useAppTheme();
  return <Text style={fieldLabelStyle(colors)}>{children}</Text>;
}

export function LearnChipGrid({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: ChipOption[];
  value: string;
  onChange: (v: string) => void;
  columns?: 2 | 3;
}) {
  const { colors } = useAppTheme();
  const s = chipStyles(colors);
  const basis = columns === 3 ? '31%' : '48%';

  return (
    <View style={s.grid}>
      {options.map((opt) => {
        const on = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[s.chip, { flexBasis: basis }, on && s.chipOn]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[s.chipTxt, on && s.chipTxtOn]} numberOfLines={2}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LearnSetupModal({
  visible,
  title,
  description,
  onClose,
  children,
  error,
  primaryLabel,
  onPrimary,
  primaryLoading = false,
  primaryDisabled = false,
}: Props) {
  const { colors } = useAppTheme();
  const s = modalStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Закрыть" />
        <View style={s.card}>
          <View style={s.cardHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>{title}</Text>
              {description ? (
                <Text style={s.desc} numberOfLines={6}>
                  {description}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
              <Ionicons name="close" size={24} color={colors.ink3} />
            </Pressable>
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
            {error ? <Text style={s.err}>{error}</Text> : null}
          </ScrollView>

          <View style={s.actions}>
            <Pressable style={s.cancel} onPress={onClose}>
              <Text style={s.cancelTxt}>Отмена</Text>
            </Pressable>
            <Pressable
              style={[s.primary, (primaryLoading || primaryDisabled) && s.primaryDisabled]}
              disabled={primaryLoading || primaryDisabled}
              onPress={onPrimary}
            >
              <Text style={s.primaryTxt}>{primaryLoading ? '…' : primaryLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function learnListCardStyle(colors: ReturnType<typeof useAppTheme>['colors']): StyleProp<ViewStyle> {
  return {
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.surface2,
  };
}

function fieldLabelStyle(colors: ReturnType<typeof useAppTheme>['colors']) {
  return {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    color: colors.ink3,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
    marginTop: 4,
  };
}

function chipStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexGrow: 1,
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipOn: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    chipTxt: { fontSize: 13, fontWeight: '500', color: colors.ink2, textAlign: 'center' },
    chipTxtOn: { color: colors.ink, fontWeight: '700' },
  });
}

function modalStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'center', padding: 20 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      maxHeight: '88%',
      overflow: 'hidden',
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    closeBtn: { padding: 4 },
    title: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
    desc: { fontSize: 14, color: colors.ink2, lineHeight: 20, marginTop: 8 },
    scroll: { maxHeight: 360 },
    scrollContent: { paddingHorizontal: 18, paddingVertical: 14 },
    err: { color: colors.danger, fontSize: 13, marginTop: 12, lineHeight: 18 },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.surface2,
    },
    cancel: { paddingVertical: 12, paddingHorizontal: 14 },
    cancelTxt: { fontSize: 15, color: colors.ink2, fontWeight: '600' },
    primary: {
      backgroundColor: colors.ink,
      paddingVertical: 12,
      paddingHorizontal: 22,
      minWidth: 120,
      alignItems: 'center',
    },
    primaryDisabled: { opacity: 0.55 },
    primaryTxt: { color: colors.surface, fontWeight: '700', fontSize: 15 },
  });
}
