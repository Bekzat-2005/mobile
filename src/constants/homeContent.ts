export const HERO_BADGE = 'AI-платформа для IT-специалистов';
export const HERO_TITLE = 'Skillo';
export const HERO_LEDE =
  'Персональный roadmap, Study Lab, интервью и аналитика прогресса — в одном рабочем пространстве.';

export const heroMeta = [
  { value: 'AI', label: 'маршрут' },
  { value: '24/7', label: 'ассистент' },
  { value: '1', label: 'следующий шаг' },
] as const;

export type HomeShowcaseCard = {
  eyebrow: string;
  title: string;
  text: string;
  tone: 'light' | 'dark';
};

export const showcaseCards: HomeShowcaseCard[] = [
  {
    eyebrow: 'Roadmap',
    title: 'Маршрут\nбез хаоса.',
    text: 'Skillo собирает цель, уровень и темп в короткий план, который легко выполнять каждый день.',
    tone: 'light',
  },
  {
    eyebrow: 'AI-наставник',
    title: 'Ответы\nв нужный момент.',
    text: 'Ассистент помогает с темой, задачей, ошибкой и подготовкой к интервью без лишнего шума.',
    tone: 'dark',
  },
];

export type HomeFeatureTile = {
  title: string;
  text: string;
  theme: 'neutral' | 'accent' | 'dark';
};

export const featureTiles: HomeFeatureTile[] = [
  {
    title: 'Оценка навыков',
    text: 'Точная диагностика перед планом.',
    theme: 'neutral',
  },
  {
    title: 'Dashboard',
    text: 'Прогресс, слабые темы и фокус.',
    theme: 'accent',
  },
  {
    title: 'Интервью',
    text: 'Голосовая практика и AI-разбор.',
    theme: 'dark',
  },
  {
    title: 'Рабочий ритм',
    text: 'Фокус, практика и следующий шаг.',
    theme: 'neutral',
  },
];

export const TILES_BADGE = 'Платформа';
export const TILES_TITLE = 'Все инструменты\nв одном месте.';

export type HomeEcoItem = {
  icon: string;
  title: string;
  text: string;
};

export const ecosystem: HomeEcoItem[] = [
  { icon: '🎯', title: 'Карьера', text: 'Роли, направления и персональные сессии.' },
  { icon: '📚', title: 'Обучение', text: 'Теория, код, практика и контроль знаний.' },
  { icon: '📊', title: 'Аналитика', text: 'Слабые темы, динамика и следующий фокус.' },
  { icon: '🏆', title: 'Сообщество', text: 'Рейтинг, задания и публичный прогресс.' },
];

export const ECOSYSTEM_BADGE = 'Единый продукт';
export const ECOSYSTEM_TITLE = 'Skillo работает\nкак система.';

export const CTA_BADGE = 'Старт';
export const CTA_TITLE = 'Первый маршрут\nоткрыть сегодня.';

export function getPrimaryActionLabel(isSignedIn: boolean) {
  return isSignedIn ? 'Открыть' : 'Начать бесплатно';
}

export function getSecondaryActionLabel(isSignedIn: boolean) {
  return isSignedIn ? 'Ассистент' : 'Подробнее';
}

export const SHOWCASE_TRY_LABEL = 'Попробовать';
export const SHOWCASE_DETAILS_LABEL = 'Подробнее';
export const GOOGLE_BUTTON_LABEL = 'Google';
