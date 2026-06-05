import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useAppTheme } from '../context/ThemeContext';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import CommunityScreen from '../screens/main/CommunityScreen';
import HomeScreen from '../screens/main/HomeScreen';
import DailyTasksScreen from '../screens/main/DailyTasksScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import AdminDashboardScreen from '../screens/main/AdminDashboardScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { FloatingAssistant } from '../components/FloatingAssistant';
import VacanciesScreen from '../screens/main/VacanciesScreen';
import VacancyAssessmentScreen from '../screens/main/VacancyAssessmentScreen';
import VacancyDetailScreen from '../screens/main/VacancyDetailScreen';
import VacancyInterviewPrepScreen from '../screens/main/VacancyInterviewPrepScreen';
import CareerDirectionsScreen from '../screens/learn/CareerDirectionsScreen';
import CareerSessionSetupScreen from '../screens/learn/CareerSessionSetupScreen';
import CareerSessionDetailScreen from '../screens/learn/CareerSessionDetailScreen';
import CareerSessionsScreen from '../screens/learn/CareerSessionsScreen';
import InterviewHubScreen from '../screens/learn/InterviewHubScreen';
import InterviewSessionDetailScreen from '../screens/learn/InterviewSessionDetailScreen';
import AnalyticsScreen from '../screens/learn/AnalyticsScreen';
import AssistantScreen from '../screens/learn/AssistantScreen';
import LearnHubScreen from '../screens/learn/LearnHubScreen';
import SkillDomainsScreen from '../screens/learn/SkillDomainsScreen';
import SkillSessionDetailScreen from '../screens/learn/SkillSessionDetailScreen';
import SkillSessionsScreen from '../screens/learn/SkillSessionsScreen';
import StudyRoadmapScreen from '../screens/learn/StudyRoadmapScreen';

import type {
  CommunityStackParamList,
  LearnStackParamList,
  RootStackParamList,
  VacanciesStackParamList,
} from './types';

const Tab = createBottomTabNavigator();
const VacancyStack = createNativeStackNavigator<VacanciesStackParamList>();
const CommunityStack = createNativeStackNavigator<CommunityStackParamList>();
const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function stackScreenOpts(colors: ReturnType<typeof useAppTheme>['colors']) {
  return {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.ink,
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: '600' as const },
  };
}

function VacanciesStackNav() {
  const { colors } = useAppTheme();
  const o = stackScreenOpts(colors);
  return (
    <VacancyStack.Navigator screenOptions={o}>
      <VacancyStack.Screen name="VacanciesList" component={VacanciesScreen} options={{ title: 'Вакансии' }} />
      <VacancyStack.Screen name="VacancyDetail" component={VacancyDetailScreen} options={{ title: '' }} />
      <VacancyStack.Screen
        name="VacancyInterviewPrep"
        component={VacancyInterviewPrepScreen}
        options={{ title: 'Подготовка' }}
      />
      <VacancyStack.Screen
        name="VacancyAssessment"
        component={VacancyAssessmentScreen}
        options={{ title: 'Оценка' }}
      />
    </VacancyStack.Navigator>
  );
}

function CommunityStackNav() {
  const { colors } = useAppTheme();
  const o = stackScreenOpts(colors);
  return (
    <CommunityStack.Navigator screenOptions={o}>
      <CommunityStack.Screen
        name="CommunityFeed"
        component={CommunityScreen}
        options={{ headerShown: false }}
      />
      <CommunityStack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Лидерборд' }} />
      <CommunityStack.Screen name="DailyTasks" component={DailyTasksScreen} options={{ title: 'Ежедневные задания' }} />
    </CommunityStack.Navigator>
  );
}

function LearnStackNav() {
  const { colors } = useAppTheme();
  const o = stackScreenOpts(colors);
  return (
    <LearnStack.Navigator screenOptions={o} initialRouteName="LearnHub">
      <LearnStack.Screen name="LearnHub" component={LearnHubScreen} options={{ title: 'Развитие' }} />
      <LearnStack.Screen name="CareerDirections" component={CareerDirectionsScreen} options={{ title: 'План развития' }} />
      <LearnStack.Screen name="CareerSessionSetup" component={CareerSessionSetupScreen} options={{ title: 'Создание плана' }} />
      <LearnStack.Screen name="CareerSessions" component={CareerSessionsScreen} options={{ title: 'Мои планы' }} />
      <LearnStack.Screen name="CareerSessionDetail" component={CareerSessionDetailScreen} options={{ title: 'Сессия' }} />
      <LearnStack.Screen name="SkillDomains" component={SkillDomainsScreen} options={{ title: 'Оценка навыков' }} />
      <LearnStack.Screen name="SkillSessions" component={SkillSessionsScreen} options={{ title: 'Мои оценки' }} />
      <LearnStack.Screen name="SkillSessionDetail" component={SkillSessionDetailScreen} options={{ title: 'Оценка' }} />
      <LearnStack.Screen name="StudyRoadmap" component={StudyRoadmapScreen} options={{ title: 'Обучение' }} />
      <LearnStack.Screen name="InterviewHub" component={InterviewHubScreen} options={{ title: 'Интервью' }} />
      <LearnStack.Screen name="InterviewSessionDetail" component={InterviewSessionDetailScreen} options={{ title: 'Сессия' }} />
      <LearnStack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Аналитика' }} />
      <LearnStack.Screen name="Assistant" component={AssistantScreen} options={{ title: 'Ассистент' }} />
    </LearnStack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useAppTheme();
  return (
    <>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.ink3,
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'home-outline',
            Vacancies: 'briefcase-outline',
            Learn: 'school-outline',
            Community: 'people-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={map[route.name] || 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Главная' }} />
      <Tab.Screen name="Vacancies" component={VacanciesStackNav} options={{ title: 'Вакансии' }} />
      <Tab.Screen name="Learn" component={LearnStackNav} options={{ title: 'Развитие' }} />
      <Tab.Screen name="Community" component={CommunityStackNav} options={{ title: 'Сообщество' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
    <FloatingAssistant />
    </>
  );
}

export default function AppNavigator() {
  const { colors, mode } = useAppTheme();
  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
  const merged = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      background: colors.surface,
      card: colors.surface,
      text: colors.ink,
      border: colors.line,
      primary: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={merged}>
      <RootStack.Navigator screenOptions={stackScreenOpts(colors)}>
        <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <RootStack.Screen name="Login" component={LoginScreen} options={{ title: 'Вход' }} />
        <RootStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Регистрация' }} />
        <RootStack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Админ-панель' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
