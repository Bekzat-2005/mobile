export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
};

export type VacanciesStackParamList = {
  VacanciesList: undefined;
  VacancyDetail: { id: string };
};

export type CommunityStackParamList = {
  CommunityFeed: undefined;
  Leaderboard: undefined;
  DailyTasks: undefined;
};

export type LearnStackParamList = {
  LearnHub: undefined;
  CareerDirections: undefined;
  CareerSessions: undefined;
  CareerSessionDetail: { sessionId: string };
  SkillDomains: undefined;
  SkillSessions: undefined;
  SkillSessionDetail: { sessionId: string };
  StudyRoadmap: undefined;
  InterviewHub: undefined;
  InterviewSessionDetail: { sessionId: string };
  Analytics: undefined;
  Assistant: undefined;
};
