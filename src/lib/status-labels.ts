/** Единый перевод статусов и служебных ключей с бэкенда. */

const COMMON: Record<string, string> = {
  ready: 'Не начато',
  draft: 'Черновик',
  in_progress: 'В процессе',
  completed: 'Завершено',
  abandoned: 'Остановлено',
  failed: 'Ошибка',
  cancelled: 'Отменено',
  pending: 'Ожидание',
  active: 'Активен',
  banned: 'Заблокирован',
  invited: 'Приглашён',
  rejected: 'Отклонён',
};

const CAREER: Record<string, string> = {
  assessment_ready: 'Готов к тесту',
  awaiting_skill_confirmation: 'Подтверждение навыков',
  roadmap_generating: 'Генерация плана',
  roadmap_ready: 'План готов',
  roadmap_failed: 'Ошибка плана',
};

const TOPIC: Record<string, string> = {
  locked: 'Заблокировано',
  available: 'Доступно',
};

const ONBOARDING: Record<string, string> = {
  assessment: 'Через тест',
  start_from_zero: 'С нуля',
};

const LEVEL: Record<string, string> = {
  trainee: 'Стажёр',
  junior: 'Начинающий',
  junior_plus: 'Начинающий+',
  hard_junior: 'Уверенный начинающий',
  middle: 'Средний',
  senior: 'Старший',
  zero: 'С нуля',
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

const ROLE: Record<string, string> = {
  user: 'Участник',
  company: 'Компания',
  admin: 'Администратор',
};

const USER_STATUS: Record<string, string> = {
  active: 'Активен',
  suspended: 'Приостановлен',
  banned: 'Заблокирован',
};

function pick(maps: Record<string, string>[], key: string): string | undefined {
  for (const map of maps) {
    if (map[key]) return map[key];
  }
  return undefined;
}

/** Универсальный статус (сессии, заявки, общие). */
export function formatStatus(status?: string | null, fallback = '—'): string {
  if (!status) return fallback;
  const key = String(status).trim();
  return pick([COMMON, CAREER, TOPIC], key) || key.replace(/_/g, ' ');
}

export function formatCareerStatus(status?: string | null): string {
  return formatStatus(status);
}

export function formatSkillStatus(status?: string | null): string {
  if (!status) return '—';
  const key = String(status);
  return pick([COMMON], key) || formatStatus(key);
}

export function formatInterviewStatus(status?: string | null): string {
  if (!status) return '—';
  const key = String(status);
  if (key === 'ready') return 'Готова к старту';
  if (key === 'in_progress') return 'В процессе';
  if (key === 'completed') return 'Завершена';
  return formatStatus(key);
}

export function formatVacancyApplicationStatus(status?: string | null): string {
  return formatStatus(status);
}

export function formatTopicStatus(status?: string | null): string {
  if (!status || status === '') return 'Доступно';
  return pick([TOPIC, COMMON], String(status)) || formatStatus(status);
}

export function formatOnboardingMode(mode?: string | null): string {
  if (!mode) return '—';
  return ONBOARDING[String(mode)] || formatStatus(mode);
}

export function formatSkillLevel(level?: string | null): string {
  if (!level) return '—';
  return LEVEL[String(level)] || String(level);
}

export function formatUserRole(role?: string | null): string {
  if (!role) return '—';
  return ROLE[String(role)] || String(role);
}

export function formatUserStatus(status?: string | null): string {
  if (!status) return '—';
  return USER_STATUS[String(status)] || formatStatus(status);
}
