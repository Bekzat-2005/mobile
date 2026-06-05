import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StudyLessonPayload, StudyRoadmapPayload } from '../api/study';

/** Тот же ключ, что на вебе (StudyPage.vue). */
export const STUDY_STORAGE_KEY = 'skillo_study_page_state_v1';

export type StudyPageState = {
  directionInput: string;
  preferredLanguage: string;
  roadmap: StudyRoadmapPayload | null;
  selectedTopicId: string;
  lessonCache: Record<string, StudyLessonPayload>;
};

function emptyState(): StudyPageState {
  return {
    directionInput: '',
    preferredLanguage: 'Russian',
    roadmap: null,
    selectedTopicId: '',
    lessonCache: {},
  };
}

export async function loadStudyPageState(): Promise<StudyPageState | null> {
  try {
    const raw = await AsyncStorage.getItem(STUDY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudyPageState>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      directionInput: typeof parsed.directionInput === 'string' ? parsed.directionInput : '',
      preferredLanguage:
        parsed.preferredLanguage === 'English' || parsed.preferredLanguage === 'Russian'
          ? parsed.preferredLanguage
          : 'Russian',
      roadmap:
        parsed.roadmap && typeof parsed.roadmap === 'object' && Array.isArray(parsed.roadmap.sections)
          ? (parsed.roadmap as StudyRoadmapPayload)
          : null,
      selectedTopicId: typeof parsed.selectedTopicId === 'string' ? parsed.selectedTopicId : '',
      lessonCache:
        parsed.lessonCache && typeof parsed.lessonCache === 'object'
          ? (parsed.lessonCache as Record<string, StudyLessonPayload>)
          : {},
    };
  } catch {
    await AsyncStorage.removeItem(STUDY_STORAGE_KEY);
    return null;
  }
}

export async function saveStudyPageState(state: StudyPageState): Promise<void> {
  try {
    if (!state.roadmap && !state.directionInput.trim()) {
      await AsyncStorage.removeItem(STUDY_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // квота или недоступное хранилище — не ломаем экран
  }
}

export async function clearStudyPageState(): Promise<void> {
  await AsyncStorage.removeItem(STUDY_STORAGE_KEY);
}

/** Краткая подпись для хаба «Развитие». */
export function studyResumeLabel(state: StudyPageState | null): string | null {
  if (!state?.roadmap) return null;
  const dir = state.roadmap.directionLabel || state.directionInput.trim();
  const title = state.roadmap.roadmapTitle?.trim();
  if (dir) return dir;
  if (title) return title;
  return state.directionInput.trim() || null;
}

export { emptyState };
