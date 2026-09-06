/** One server as `vpn_status()` hands it over: config and health in one row. */
export interface VpnServer {
  id: string;
  label: string;
  city: string | null;
  /** ISO 3166-1 alpha-2, for the flag. */
  country: string | null;
  role: 'primary' | 'standby' | 'home';
  /** Transports this box serves: 'xhttp' | 'reality' | 'awg'. */
  protocols: string[];
  sort: number;
  last_beat: string | null;
  /** Reported in within the last three minutes. */
  alive: boolean;
  clients: number | null;
  load1: number | null;
  mem_pct: number | null;
  /** 0–1. Beats received over beats expected in the window. */
  uptime_24h: number | null;
  uptime_7d: number | null;
}

/** My own subscription row. Hers is invisible to me, and mine to her. */
export interface VpnClient {
  user_id: string;
  label: string;
  sub_url: string | null;
  /** The spare profile, unrelated transport. */
  alt_url: string | null;
  issued_at: string;
  revoked_at: string | null;
}

export const PROTOCOL_LABELS: Record<string, string> = {
  xhttp: 'XHTTP',
  reality: 'Reality',
  awg: 'AmneziaWG',
};

export const ROLE_LABELS: Record<VpnServer['role'], string> = {
  primary: 'Main',
  standby: 'Spare',
  home: 'Home',
};
