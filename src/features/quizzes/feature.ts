import { HelpCircle } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { QuizzesListRoute } from './routes/quizzes-list.route';
import { QuizPlayRoute } from './routes/quiz-play.route';

export const quizzesFeature = defineFeature({
  id: 'quizzes',
  title: 'Quizzes',
  basePath: '/quizzes',
  routes: [
    { index: true, Component: QuizzesListRoute },
    { path: ':deckId', Component: QuizPlayRoute },
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
