import { apiRequest } from './client';

/** Ответ POST /api/study/roadmap — структура как на веб-странице «Обучение». */
export type StudyRoadmapTopic = {
  id: string;
  title: string;
  summary: string;
  whyItMatters?: string;
  difficulty?: string;
  keyIdeas?: string[];
};

export type StudyRoadmapSection = {
  id: string;
  title: string;
  description: string;
  outcome: string;
  topics: StudyRoadmapTopic[];
};

export type StudyRoadmapPayload = {
  directionLabel?: string;
  roadmapTitle: string;
  roadmapSummary: string;
  studyApproach: string;
  totalSections?: number;
  totalTopics?: number;
  sections: StudyRoadmapSection[];
};

export type StudyTheoryBlock = {
  title?: string;
  body?: string;
  takeaway?: string;
};

export type StudyLessonPayload = {
  lessonTitle?: string;
  summary?: string;
  theoryBlocks?: StudyTheoryBlock[];
  codeExample?: {
    title?: string;
    language?: string;
    filename?: string;
    code?: string;
    explanation?: string;
  };
  codeHighlights?: string[];
  practiceChecks?: string[];
  nextStep?: string;
};

export function generateStudyRoadmap(
  payload: { direction: string; preferredLanguage: string },
  token: string,
) {
  return apiRequest<{ roadmap: StudyRoadmapPayload; generation: Record<string, unknown> }>(
    '/api/study/roadmap',
    {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    },
  );
}

/** Урок по теме — как POST /api/study/lesson на вебе (StudyPage). */
export function generateStudyLesson(
  payload: {
    direction: string;
    preferredLanguage: string;
    roadmapTitle: string;
    roadmapSummary: string;
    section: Pick<StudyRoadmapSection, 'title' | 'description' | 'outcome'>;
    topic: StudyRoadmapTopic;
    previousTopicTitle?: string;
    nextTopicTitle?: string;
  },
  token: string,
) {
  return apiRequest<{ lesson: StudyLessonPayload; generation: Record<string, unknown> }>(
    '/api/study/lesson',
    {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    },
  );
}
