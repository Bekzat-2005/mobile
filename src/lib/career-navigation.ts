import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { LearnStackParamList } from '../navigation/types';

export function sessionIdOf(session: Record<string, unknown>): string {
  return String(session.id ?? session._id ?? '');
}

type LearnNavigation = NativeStackNavigationProp<LearnStackParamList, keyof LearnStackParamList>;

export function navigateToCareerSession(
  navigation: LearnNavigation,
  session: Record<string, unknown>,
  options?: { replace?: boolean },
) {
  const id = sessionIdOf(session);
  const status = String(session.status || '');

  if (status === 'assessment_ready' || status === 'awaiting_skill_confirmation') {
    if (options?.replace) {
      navigation.replace('CareerAssessment', { sessionId: id });
    } else {
      navigation.navigate('CareerAssessment', { sessionId: id });
    }
    return;
  }

  if (options?.replace) {
    navigation.replace('CareerSessionDetail', { sessionId: id });
  } else {
    navigation.navigate('CareerSessionDetail', { sessionId: id });
  }
}
