import { Languages } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const languageFeature = defineFeature({
  id: 'language',
  title: 'Language',
  basePath: '/language',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/courses.route').then((m) => ({
          Component: m.CoursesRoute,
        })),
    },
    {
      path: 'course/:courseId',
      lazy: () =>
        import('./routes/course.route').then((m) => ({
          Component: m.CourseRoute,
        })),
    },
    {
      path: 'lesson/:lessonId',
      lazy: () =>
        import('./routes/lesson.route').then((m) => ({
          Component: m.LessonRoute,
        })),
    },
    {
      path: 'build/:lessonId',
      lazy: () =>
        import('./routes/build.route').then((m) => ({
          Component: m.BuildRoute,
        })),
    },
    {
      path: 'teach/:lessonId',
      lazy: () =>
        import('./routes/teach.route').then((m) => ({
          Component: m.TeachRoute,
        })),
    },
    {
      path: 'mark/:lessonId',
      lazy: () =>
        import('./routes/mark.route').then((m) => ({ Component: m.MarkRoute })),
    },
    {
      path: 'dictionary',
      lazy: () =>
        import('./routes/dictionary.route').then((m) => ({
          Component: m.DictionaryRoute,
        })),
    },
    {
      path: 'alphabet',
      lazy: () =>
        import('./routes/alphabet.route').then((m) => ({
          Component: m.AlphabetRoute,
        })),
    },
    {
      path: 'study',
      lazy: () =>
        import('./routes/study.route').then((m) => ({
          Component: m.StudyRoute,
        })),
    },
  ],
  nav: [
    {
      label: 'Language',
      icon: Languages,
      to: '/language',
      order: 220,
    },
  ],
});
