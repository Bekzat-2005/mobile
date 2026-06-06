import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '../context/ThemeContext';

type Props = {
  visible: boolean;
  message?: string;
};

export function AiProcessingOverlay({ visible, message = 'AI анализирует данные... ✨' }: Props) {
  const { colors } = useAppTheme();
  const s = styles(colors);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.toast}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={s.text}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: Platform.OS === 'ios' ? 48 : 32,
      paddingHorizontal: 24,
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.ink,
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 16,
      maxWidth: 360,
      width: '100%',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        },
        android: { elevation: 8 },
        default: {},
      }),
    },
    text: {
      flex: 1,
      color: colors.surface,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
  });
}
