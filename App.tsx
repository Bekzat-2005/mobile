import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { fonts } from './src/theme/colors';

function patchDefaultFont() {
  const textDefaults = (Text as unknown as { defaultProps?: { style?: object } }).defaultProps ?? {};
  (Text as unknown as { defaultProps: { style?: object } }).defaultProps = {
    ...textDefaults,
    style: [{ fontFamily: fonts.regular }, textDefaults.style],
  };
  const inputDefaults = (TextInput as unknown as { defaultProps?: { style?: object } }).defaultProps ?? {};
  (TextInput as unknown as { defaultProps: { style?: object } }).defaultProps = {
    ...inputDefaults,
    style: [{ fontFamily: fonts.regular }, inputDefaults.style],
  };
}

function Gate() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const { colors, mode } = useAppTheme();

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator color={colors.accentSolid} />
      </View>
    );
  }

  patchDefaultFont();

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
