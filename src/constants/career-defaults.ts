/** Базовый профиль как в skillo-fe CareerPlannerPage (разумные значения по умолчанию). */
export const defaultCareerProfile = {
  experienceLevel: 'junior',
  weeklyHours: 12,
  englishLevel: 'intermediate',
  goalTimelineMonths: 9,
  learningStyle: 'balanced',
  portfolioStatus: 'none',
  employmentGoal: 'first_job',
  preferredLanguage: 'Russian',
  currentSkills: '',
  notes: '',
};

export const skillTargetLevels = [
  { value: 'trainee', label: 'Стажёр' },
  { value: 'junior', label: 'Начинающий' },
  { value: 'junior_plus', label: 'Начинающий+' },
  { value: 'middle', label: 'Средний' },
] as const;
