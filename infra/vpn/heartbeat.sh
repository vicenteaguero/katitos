#!/usr/bin/env bash
#
# Katitos VPN — one line a minute, from the box to Supabase.
#
# The reporting goes this way round on purpose. The obvious design is a monitor
# that pings the servers; that monitor would be a datacentre IP touching her
# endpoints on a fixed schedule, forever, which is a pattern a censor can see
# from orbit. A box that dials out looks like a box using the internet.
#
# Installed by provision.sh as /usr/local/bin/katitos-beat and fired by
# katitos-beat.timer. Reads its config from /etc/katitos-vpn/beat.env.
#
# It must never be able to take the server down. No `set -e`: a curl that fails
# is a missing dot on a dashboard in Chile, and losing the tunnel over it would
# be the tail wagging the dog.
set -uo pipefail

: "${SERVER_ID:?SERVER_ID missing from beat.env}"
: "${BEAT_URL:?BEAT_URL missing from beat.env}"
: "${BEAT_SECRET:?BEAT_SECRET missing from beat.env}"

XRAY_PORT="${XRAY_PORT:-443}"

uptime_s=$(cut -d. -f1 /proc/uptime)
load1=$(cut -d' ' -f1 /proc/loadavg)

# Memory in use as the kernel actually means it: total minus AVAILABLE, not
# minus free. "Free" excludes cache and would report a healthy box at 95%.
read -r mem_total mem_avail < <(awk '
  /^MemTotal:/     {t=$2}
  /^MemAvailable:/ {a=$2}
  END {print t, a}' /proc/meminfo)
# The parentheses are load-bearing: inside a print/printf, awk reads a bare `>`
# as output redirection, so `printf "%.1f", t > 0 ? …` silently writes to a file
# named "0" and emits nothing. That is why the first beats reported 0% memory.
mem_pct=$(awk -v t="$mem_total" -v a="$mem_avail" \
  'BEGIN {printf "%.1f", (t > 0 ? (t - a) * 100 / t : 0)}')

# Established connections on the proxy port ≈ how many of her devices are on.
# Approximate by nature: one phone browsing is several connections, and mux
# collapses many streams into few. Read it as "is anyone there", not as a count.
clients=$(ss -Htn state established "sport = :$XRAY_PORT" 2>/dev/null | wc -l)

# Cumulative counters on the default interface. Only differences between two
# beats mean anything; a reboot resets them, which is why uptime rides along.
iface=$(ip -4 route show default | awk '{print $5; exit}')
read -r rx tx < <(awk -v i="$iface:" '$1 == i {print $2, $10}' /proc/net/dev)

payload=$(printf '{"server_id":"%s","uptime_s":%s,"load1":%s,"mem_pct":%s,"clients":%s,"rx_bytes":%s,"tx_bytes":%s}' \
  "$SERVER_ID" "${uptime_s:-0}" "${load1:-0}" "${mem_pct:-0}" \
  "${clients:-0}" "${rx:-0}" "${tx:-0}")

# --max-time so a hung request cannot pile timers on top of each other, and the
# secret in a header rather than the URL so it stays out of every proxy log
# between here and there.
code=$(curl -fsS --max-time 15 -o /dev/null -w '%{http_code}' \
  -X POST "$BEAT_URL" \
  -H 'content-type: application/json' \
  -H "x-beat-secret: $BEAT_SECRET" \
  -d "$payload" 2>/dev/null)

if [[ "$code" != "200" ]]; then
  # journalctl -u katitos-beat is where this lands. 401 = wrong secret,
  # 400 = SERVER_ID is not a row in vpn_servers.
  logger -t katitos-beat "beat failed: http ${code:-none}"
  exit 0
fi
