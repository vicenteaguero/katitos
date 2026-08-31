import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Somewhere to drop a file — and, tapped, the same file picker as always.
 *
 * On a computer she drags a worksheet in from the desktop; on a phone she
 * taps and picks. One control, both gestures. `accept` is honoured for a drop
 * as it is for a pick.
 */
export function Dropzone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  children,
  className,
  activeClassName = 'ring-2 ring-gold',
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const accepts = (file: File) => {
    if (!accept) return true;
    return accept.split(',').some((rule) => {
      const r = rule.trim().toLowerCase();
      if (!r) return false;
      if (r.startsWith('.')) return file.name.toLowerCase().endsWith(r);
      if (r.endsWith('/*'))
        return file.type.toLowerCase().startsWith(r.slice(0, -1));
      return file.type.toLowerCase() === r;
    });
  };

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter(accepts);
    if (!files.length) return;
    onFiles(multiple ? files : files.slice(0, 1));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) take(e.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          input.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'lift-press cursor-pointer rounded-lg transition',
        over && activeClassName,
        disabled && 'opacity-50',
        className
      )}
    >
      {children}
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          take(e.target.files);
          // reset so picking the same file again still fires onChange
          e.target.value = '';
        }}
      />
    </div>
  );
}
