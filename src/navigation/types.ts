import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminUserDetail: { userId: string };
  AdminPosts: undefined;
  AdminPostDetail: { postId: string };
  AdminPrompts: undefined;
  AdminPromptDetail: { promptKey: string };
  AdminSystem: undefined;
};

export type VacanciesStackParamList = {
  VacanciesList: undefined;
  VacancyDetail: { id: string };
  VacancyInterviewPrep: { id: string };
  VacancyAssessment: { id: string };
};

export type CommunityStackParamList = {
  CommunityFeed: undefined;
  Leaderboard: undefined;
  DailyTasks: undefined;
};

export type LearnStackParamList = {
  LearnHub: undefined;
  CareerDirections: undefined;
  CareerSessionSetup: {
    directionKey: string;
    directionLabel: string;
    defaultTargetRole?: string;
  };
  CareerSessions: undefined;
  CareerAssessment: { sessionId: string };
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

export type MainTabParamList = {
  Home: undefined;
  Vacancies: NavigatorScreenParams<VacanciesStackParamList>;
  Learn: NavigatorScreenParams<LearnStackParamList>;
  Community: NavigatorScreenParams<CommunityStackParamList>;
  Profile: undefined;
};
