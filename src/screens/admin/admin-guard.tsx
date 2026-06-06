import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { adminStyles } from './admin-styles';

export function AdminAccessDenied() {
  const { colors } = useAppTheme();
  const s = adminStyles(colors);
  return (
    <SafeAreaView style={s.centered}>
      <Text style={s.lead}>Доступ только для администраторов.</Text>
    </SafeAreaView>
  );
}

export function useRequireAdmin(): { isAdmin: boolean; token: string | null } {
  const { user, token } = useAuth();
  return { isAdmin: user?.role === 'admin', token };
}
