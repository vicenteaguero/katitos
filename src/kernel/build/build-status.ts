/**
 * Am I looking at the newest version?
 *
 * Pure comparison so the answer is testable: the hook does the fetching, this
 * decides what the two stamps mean together.
 */

export interface BuildStamp {
  /** Full commit sha the bundle was built from. */
  sha: string;
  /** First 7 of it — what a person actually reads and compares. */
  short: string;
  /** Branch name at build time. */
  ref: string;
  /** Subject line of that commit. */
  subject: string;
  /** ISO date of the commit, or null if git was unavailable. */
  committedAt: string | null;
  /** ISO date the bundle was built. */
  builtAt: string;
  /** package.json version at build time. */
  version: string;
  /** 'production' | 'preview' | 'development' on Vercel, 'local' otherwise. */
  env: string;
  /** The build had uncommitted changes in it — it matches no commit. */
  dirty: boolean;
}

export type BuildState =
  /** Still asking the server. */
  | 'checking'
  /** Running exactly what the server is serving. */
  | 'current'
  /** The server has moved on — this app is behind. */
  | 'stale'
  /** Built from a working tree with uncommitted changes. */
  | 'dirty'
  /** Could not ask (offline, or the server predates version.json). */
  | 'unknown';

/**
 * `dirty` outranks `stale` on purpose: if the running build contains
 * uncommitted work, "you are behind the server" is not the useful sentence —
 * "this build matches no commit at all" is.
 */
export function compareBuilds(
  local: BuildStamp,
  server: BuildStamp | null | undefined,
  { checking = false }: { checking?: boolean } = {}
): BuildState {
  if (local.dirty) return 'dirty';
  if (checking) return 'checking';
  if (!server?.sha || server.sha === 'unknown') return 'unknown';
  if (local.sha === 'unknown') return 'unknown';
  return server.sha === local.sha ? 'current' : 'stale';
}

/** What that state says, in the app's own voice. */
export const BUILD_STATE_LABEL: Record<BuildState, string> = {
  checking: 'Checking…',
  current: 'You have the newest version',
  stale: 'A newer version is waiting',
  dirty: 'Built with changes that are not committed',
  unknown: 'Could not check right now',
};

/**
 * Should the app take the newer version by itself, right now?
 *
 * The service worker installs a new build and then waits, which means a phone
 * can sit three deploys behind and look completely normal — you only find out
 * when something does not work. So the app stops asking and just updates.
 *
 * `triedSha` is the version we already tried to apply this session. Without it
 * a build that installs but cannot take over (a service worker error, a browser
 * that never fires controllerchange) would reload the app forever.
 */
export function shouldAutoUpdate(
  state: BuildState,
  server: BuildStamp | null | undefined,
  triedSha: string | null
): boolean {
  if (state !== 'stale' || !server?.sha) return false;
  return server.sha !== triedSha;
}
