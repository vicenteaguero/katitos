import { NavLink } from 'react-router';
import { cn } from '@kernel/lib';
import { useCourses } from '../api/courses.queries';
import { LANG_FLAGS, type Lang } from '../types';

/** Every course, down the left of the desk — the one open is lit. */
export function CoursesRail({ currentId }: { currentId?: string }) {
  const { data: courses } = useCourses();
  return (
    <nav aria-label="Courses" className="space-y-1">
      <p className="eyebrow px-2 pb-1">Courses</p>
      {(courses ?? []).map((c) => (
        <NavLink
          key={c.id}
          to={`/language/course/${c.id}`}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded px-2 py-1.5 font-sans text-sm transition-colors hover:bg-fg/5',
              isActive || c.id === currentId
                ? 'bg-surface-2 text-fg'
                : 'text-muted'
            )
          }
        >
          <span>{c.emoji ?? LANG_FLAGS[c.target_lang as Lang] ?? '📘'}</span>
          <span className="min-w-0 flex-1 truncate">{c.title}</span>
        </NavLink>
      ))}
    </nav>
  );
}
