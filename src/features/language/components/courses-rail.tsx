import { NavLink } from 'react-router';
import { cn } from '@kernel/lib';
import { SectionLabel } from '@kernel/ui';
import { useCourses } from '../api/courses.queries';
import { LANG_FLAGS, type Lang } from '../types';

/** Every course, down the left of the desk - the one open is lit. */
export function CoursesRail({ currentId }: { currentId?: string }) {
  const { data: courses } = useCourses();
  return (
    <nav aria-label="Courses" className="space-y-0.5">
      <SectionLabel as="p" className="px-2">
        Courses
      </SectionLabel>
      {(courses ?? []).map((c) => (
        <NavLink
          key={c.id}
          to={`/language/course/${c.id}`}
          className={({ isActive }) =>
            cn(
              'flex min-h-[40px] items-center gap-2 rounded px-2 py-1.5 font-sans text-[13px] font-semibold transition-colors hover:bg-fg/5',
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
