/** Karing on the App Store - iPhone, iPad and Mac are the same listing. */
const APP_STORE = 'https://apps.apple.com/app/karing/id6472431552';
/** Windows, Android and Linux builds. Their own site, never an aggregator. */
const OTHER = 'https://karing.app/en/download';

function AppleMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

/**
 * The store badge people already know how to read.
 *
 * Deliberately NOT styled like the rest of the app: this is the one control on
 * the page whose job is to be instantly recognisable as "the App Store", and
 * making it wine-and-gold would cost her the half second of recognition that
 * is the entire point.
 */
export function AppStoreButton() {
  return (
    <a
      href={APP_STORE}
      target="_blank"
      rel="noreferrer"
      className="lift-press inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white"
      style={{ border: '1px solid rgba(255,255,255,.25)' }}
    >
      <AppleMark className="h-7 w-7" />
      <span className="leading-tight">
        <span className="block font-sans text-[10px] uppercase tracking-wide opacity-80">
          Download on the
        </span>
        <span className="block font-sans text-lg font-semibold leading-tight">
          App Store
        </span>
      </span>
    </a>
  );
}

/** Everything that is not an Apple device - same profile, same app. */
export function OtherPlatformsLink() {
  return (
    <a
      href={OTHER}
      target="_blank"
      rel="noreferrer"
      className="font-sans text-xs text-muted underline decoration-gold underline-offset-4"
    >
      Windows or Android
    </a>
  );
}
