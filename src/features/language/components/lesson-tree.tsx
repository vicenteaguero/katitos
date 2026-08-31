import { Link, NavLink } from 'react-router';
import { BookMarked, ChevronLeft } from 'lucide-react';
import { cn } from '@kernel/lib';
import { useCourse, useUnits } from '../api/courses.queries';

/**
 * The course, as a tree — the desk's left rail.
 *
 * Units and their lessons, the one she is on lit up, every other one a click
 * away without going back through the course screen. A phone never shows it;
 * there the course screen is the tree.
 */
export function LessonTree({
  courseId,
  currentId,
  /** Where a click goes: to write the lesson, or to read it. */
  mode,
}: {
  courseId: string;
  currentId?: string;
  mode: 'build' | 'read';
}) {
  const { data: course } = useCourse(courseId);
  const { data: units } = useUnits(courseId);
  if (!course) return null;
  const base = mode === 'build' ? '/language/build' : '/language/lesson';

  return (
    <nav aria-label="Lessons" className="space-y-3">
      <Link
        to={`/language/course/${courseId}`}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 font-sans text-xs text-muted hover:bg-fg/5 hover:text-fg"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> The course
      </Link>
      <p className="truncate px-2 font-display text-lg font-semibold text-fg">
        <span className="mr-1.5">{course.emoji ?? '📘'}</span>
        {course.title}
      </p>
      {(units ?? []).map((unit) => (
        <section key={unit.id}>
          <p className="eyebrow px-2">{unit.title}</p>
          <ul className="mt-1 space-y-0.5">
            {unit.lessons.map((lesson) => (
              <li key={lesson.id}>
                <NavLink
                  to={`${base}/${lesson.id}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded px-2 py-1.5 font-sans text-sm transition-colors hover:bg-fg/5',
                      isActive || lesson.id === currentId
                        ? 'bg-surface-2 text-fg'
                        : 'text-muted',
                      lesson.status === 'draft' && 'italic'
                    )
                  }
                >
                  <span className="min-w-0 flex-1 truncate">
                    {lesson.title}
                  </span>
                  {lesson.status === 'draft' && (
                    <span className="shrink-0 text-[0.6rem] uppercase tracking-[0.12em] text-muted">
                      draft
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Link
        to="/language/dictionary"
        className="flex items-center gap-1.5 rounded px-2 py-1.5 font-sans text-xs text-muted hover:bg-fg/5 hover:text-fg"
      >
        <BookMarked className="h-3.5 w-3.5" /> Dictionary
      </Link>
    </nav>
  );
}
