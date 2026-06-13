import { HelpCircle } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const quizzesFeature = defineFeature({
  id: 'quizzes',
  title: 'Quizzes',
  basePath: '/quizzes',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/quizzes-list.route').then((m) => ({
          Component: m.QuizzesListRoute,
        })),
    },
    {
      path: ':deckId',
      lazy: () =>
        import('./routes/quiz-play.route').then((m) => ({
          Component: m.QuizPlayRoute,
        })),
    },
  ],
  nav: [
    {
      label: 'Quizzes',
      icon: HelpCircle,
      to: '/quizzes',
      order: 30,
      placement: 'primary',
    },
  ],
});
