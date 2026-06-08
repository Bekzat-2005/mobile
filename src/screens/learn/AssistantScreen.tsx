import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';

import { useAssistantOverlay } from '../../context/AssistantOverlayContext';
import type { LearnStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<LearnStackParamList, 'Assistant'>;

/** Legacy route: opens overlay chat instead of full-screen UI. */
export default function AssistantScreen({ navigation }: Props) {
  const { open } = useAssistantOverlay();

  useEffect(() => {
    open();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, open]);

  return null;
}
