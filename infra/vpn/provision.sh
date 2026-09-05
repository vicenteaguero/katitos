#!/usr/bin/env bash
#
# Katitos VPN — turn a fresh Ubuntu 24.04 box into one of her exit servers.
#
# Idempotent: run it again after a reboot, a kernel upgrade, or a half-finished
# first attempt, and it converges. That is deliberate — the day this matters is
# a day something already went wrong, and a script you are afraid to re-run is
# no use then.
#
# What it does NOT do: create her tunnel. The inbounds live in 3x-ui and are
# made by hand once, in the panel, because that is where they are also edited,
# rotated and revoked. See docs/vpn-setup.md.
#
#   curl -fsSL <raw url>/provision.sh -o provision.sh
#   chmod +x provision.sh
#   SSH_PORT=52201 PANEL_PORT=41100 ./provision.sh
#
set -euo pipefail

# ── Settings ────────────────────────────────────────────────────────────────
# Every one of these can be overridden from the environment. The defaults are
# deliberately not 22 / 2053 / "admin": a box that answers on the obvious ports
# with the obvious names is found by scanners within the hour, and a censor
# fingerprinting a panel is one more way to lose the address.
SSH_PORT="${SSH_PORT:-52201}"
PANEL_PORT="${PANEL_PORT:-41100}"
PANEL_PATH="${PANEL_PATH:-}"       # random if empty
PANEL_USER="${PANEL_USER:-}"       # random if empty
PANEL_PASS="${PANEL_PASS:-}"       # random if empty
AWG_PORT="${AWG_PORT:-51820}"
AWG_NET="${AWG_NET:-10.77.0.1/24}"
# The public port her clients dial for Xray. 443 because everything else on the
# internet is on 443, and a port nobody else uses is a signal in itself.
XRAY_PORT="${XRAY_PORT:-443}"
# The second transport gets its own port rather than sharing 443 through
# fallbacks. Two independent inbounds fail independently; one inbound with a
# clever fallback chain fails all at once, and is harder to reason about at
# 3am from another continent.
XRAY_PORT2="${XRAY_PORT2:-8443}"

STATE_DIR=/etc/katitos-vpn
LOG_TAG="katitos-vpn"

say() { printf '\n\033[1;35m▸ %s\033[0m\n' "$*"; }
ok()  { printf '  \033[0;32m✓\033[0m %s\n' "$*"; }
die() { printf '\n\033[0;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
rnd() { tr -dc 'a-zA-Z0-9' </dev/urandom | head -c "${1:-24}"; }

# ── Preflight ───────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "run as root"
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || die "this expects Ubuntu 24.04 — got ${PRETTY_NAME:-unknown}"
[[ "${VERSION_ID:-}" == "24.04" ]] || echo "  ! not 24.04 (${VERSION_ID}); the Amnezia PPA may not have a build"

# Locking yourself out is the one mistake with no undo. If root has no
# authorized key, hardening sshd would strand you the moment it reloads.
[[ -s /root/.ssh/authorized_keys ]] || \
  die "no key in /root/.ssh/authorized_keys — add one and re-run, or you will lock yourself out"

mkdir -p "$STATE_DIR" && chmod 700 "$STATE_DIR"

# ── Base ────────────────────────────────────────────────────────────────────
say "Base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  curl ca-certificates gnupg2 ufw fail2ban jq qrencode \
  software-properties-common python3-launchpadlib \
  "linux-headers-$(uname -r)" >/dev/null
ok "installed"

# ── Kernel tuning ───────────────────────────────────────────────────────────
# BBR plus fq is the single biggest win available here, and it is the right
# congestion control for exactly this shape of traffic: one long fat path with
# real loss, where the default (cubic) reads loss as congestion and backs off
# when it should not. Her 90 ms to Helsinki is not the problem; how the sender
# reacts to a lost packet across it is.
say "Kernel network tuning"
cat >/etc/sysctl.d/99-katitos-vpn.conf <<'EOF'
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
# Forwarding, because the box routes her traffic rather than terminating it.
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
# Bigger buffers: the bandwidth-delay product over ~90 ms is far past defaults.
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_mtu_probing = 1
net.ipv4.tcp_slow_start_after_idle = 0
net.core.somaxconn = 8192
net.ipv4.tcp_max_syn_backlog = 8192
EOF
sysctl --system >/dev/null
[[ "$(sysctl -n net.ipv4.tcp_congestion_control)" == "bbr" ]] \
  && ok "bbr + fq active" || echo "  ! bbr not active — check kernel"

# ── Firewall ────────────────────────────────────────────────────────────────
say "Firewall"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow "$SSH_PORT"/tcp   comment 'ssh'    >/dev/null
ufw allow "$XRAY_PORT"/tcp  comment 'xray xhttp'  >/dev/null
ufw allow "$XRAY_PORT2"/tcp comment 'xray reality' >/dev/null
ufw allow "$PANEL_PORT"/tcp comment 'panel'  >/dev/null
ufw allow "$AWG_PORT"/udp   comment 'awg'    >/dev/null
ufw --force enable >/dev/null
ok "open: $SSH_PORT/tcp $XRAY_PORT/tcp $XRAY_PORT2/tcp $PANEL_PORT/tcp $AWG_PORT/udp"

# ── SSH ─────────────────────────────────────────────────────────────────────
say "SSH"
cat >/etc/ssh/sshd_config.d/99-katitos.conf <<EOF
Port $SSH_PORT
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
MaxAuthTries 3
EOF
# Ubuntu 24.04 boots sshd from a socket unit, which pins the port independently
# of sshd_config — edit only the file and the new port silently never opens.
if systemctl is-enabled --quiet ssh.socket 2>/dev/null; then
  mkdir -p /etc/systemd/system/ssh.socket.d
  printf '[Socket]\nListenStream=\nListenStream=%s\n' "$SSH_PORT" \
    >/etc/systemd/system/ssh.socket.d/override.conf
  systemctl daemon-reload && systemctl restart ssh.socket
else
  systemctl restart ssh
fi
ok "key-only, port $SSH_PORT"

say "fail2ban"
cat >/etc/fail2ban/jail.d/katitos.conf <<EOF
[sshd]
enabled  = true
port     = $SSH_PORT
maxretry = 4
bantime  = 2h
findtime = 30m
EOF
systemctl enable --now fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban
ok "sshd jail armed"

# ── 3x-ui ───────────────────────────────────────────────────────────────────
# The panel ships its own Xray-core, so this is also how Xray gets installed and
# kept current. Credentials are set from the CLI rather than the installer's
# prompts so the whole run stays non-interactive and re-runnable.
say "3x-ui"
if ! command -v x-ui >/dev/null 2>&1; then
  bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh) </dev/null
  ok "installed"
else
  ok "already installed"
fi

if [[ ! -f "$STATE_DIR/panel.env" ]]; then
  PANEL_USER="${PANEL_USER:-$(rnd 12)}"
  PANEL_PASS="${PANEL_PASS:-$(rnd 28)}"
  PANEL_PATH="${PANEL_PATH:-$(rnd 20)}"
  x-ui setting -username "$PANEL_USER" -password "$PANEL_PASS" >/dev/null
  x-ui setting -port "$PANEL_PORT" -webBasePath "/$PANEL_PATH/" >/dev/null
  cat >"$STATE_DIR/panel.env" <<EOF
PANEL_USER=$PANEL_USER
PANEL_PASS=$PANEL_PASS
PANEL_PORT=$PANEL_PORT
PANEL_PATH=$PANEL_PATH
EOF
  chmod 600 "$STATE_DIR/panel.env"
  ok "credentials written to $STATE_DIR/panel.env"
else
  # Never regenerate: the panel password is in his password manager by now, and
  # silently rotating it on a re-run is a lockout with extra steps.
  ok "credentials already set (see $STATE_DIR/panel.env)"
fi
systemctl restart x-ui
systemctl enable x-ui >/dev/null 2>&1 || true

# ── AmneziaWG ───────────────────────────────────────────────────────────────
# The second, unrelated technology. Not a backup in the "worse copy" sense — a
# different detection surface, so that one advance in DPI does not take both.
say "AmneziaWG"
if ! modinfo amneziawg >/dev/null 2>&1; then
  add-apt-repository -y ppa:amnezia/ppa >/dev/null 2>&1
  apt-get update -qq
  apt-get install -y -qq amneziawg amneziawg-tools >/dev/null
fi
modinfo amneziawg >/dev/null 2>&1 && ok "kernel module present" \
  || die "amneziawg module did not build — check 'dkms status' and that linux-headers match $(uname -r)"

AWG_DIR=/etc/amnezia/amneziawg
mkdir -p "$AWG_DIR" && chmod 700 "$AWG_DIR"
if [[ ! -f "$AWG_DIR/awg0.conf" ]]; then
  umask 077
  awg genkey >"$AWG_DIR/server.key"
  awg pubkey <"$AWG_DIR/server.key" >"$AWG_DIR/server.pub"
  IFACE="$(ip -4 route show default | awk '{print $5; exit}')"

  # The obfuscation parameters. Jc/Jmin/Jmax add junk packets before the
  # handshake; S1/S2 pad the two handshake messages; H1..H4 replace WireGuard's
  # four fixed message-type constants. Randomised per server ON PURPOSE — two
  # boxes sharing a signature is two boxes blocked at once, which is the whole
  # thing this design is trying not to do.
  H1=$((RANDOM * RANDOM % 2000000000 + 5))
  H2=$((H1 + 1 + RANDOM % 1000)); H3=$((H2 + 1 + RANDOM % 1000)); H4=$((H3 + 1 + RANDOM % 1000))
  cat >"$AWG_DIR/awg0.conf" <<EOF
[Interface]
Address = $AWG_NET
ListenPort = $AWG_PORT
PrivateKey = $(cat "$AWG_DIR/server.key")

Jc = $((3 + RANDOM % 8))
Jmin = 50
Jmax = 1000
S1 = $((15 + RANDOM % 100))
S2 = $((15 + RANDOM % 100))
H1 = $H1
H2 = $H2
H3 = $H3
H4 = $H4

PostUp = iptables -t nat -A POSTROUTING -s ${AWG_NET%/*}/24 -o $IFACE -j MASQUERADE
PostUp = iptables -A FORWARD -i awg0 -o $IFACE -j ACCEPT
PostUp = iptables -A FORWARD -i $IFACE -o awg0 -m state --state RELATED,ESTABLISHED -j ACCEPT
# She has no business reaching this box's own neighbours. Without these three
# lines anyone holding her config can reach the provider's internal network.
PostUp = iptables -I FORWARD -i awg0 -d 10.0.0.0/8 -j DROP
PostUp = iptables -I FORWARD -i awg0 -d 172.16.0.0/12 -j DROP
PostUp = iptables -I FORWARD -i awg0 -d 192.168.0.0/16 -j DROP
PostDown = iptables -t nat -D POSTROUTING -s ${AWG_NET%/*}/24 -o $IFACE -j MASQUERADE
PostDown = iptables -D FORWARD -i awg0 -o $IFACE -j ACCEPT
PostDown = iptables -D FORWARD -i $IFACE -o awg0 -m state --state RELATED,ESTABLISHED -j ACCEPT
PostDown = iptables -D FORWARD -i awg0 -d 10.0.0.0/8 -j DROP
PostDown = iptables -D FORWARD -i awg0 -d 172.16.0.0/12 -j DROP
PostDown = iptables -D FORWARD -i awg0 -d 192.168.0.0/16 -j DROP
EOF
  chmod 600 "$AWG_DIR/awg0.conf"
  ok "awg0 generated with its own obfuscation signature"
else
  ok "awg0.conf already exists — left alone"
fi
systemctl enable --now awg-quick@awg0 >/dev/null 2>&1 || systemctl restart awg-quick@awg0
awg show awg0 >/dev/null 2>&1 && ok "awg0 up on $AWG_PORT/udp"

# ── Heartbeat ───────────────────────────────────────────────────────────────
say "Heartbeat"
install -m 700 "$(dirname "$0")/heartbeat.sh" /usr/local/bin/katitos-beat 2>/dev/null \
  || curl -fsSL "${BEAT_SCRIPT_URL:-}" -o /usr/local/bin/katitos-beat 2>/dev/null \
  || echo "  ! heartbeat.sh not found next to this script — copy it to /usr/local/bin/katitos-beat by hand"
chmod 700 /usr/local/bin/katitos-beat 2>/dev/null || true

if [[ ! -f "$STATE_DIR/beat.env" ]]; then
  cat >"$STATE_DIR/beat.env" <<'EOF'
# Fill these in, then: systemctl enable --now katitos-beat.timer
# SERVER_ID is the uuid of this box's row in Supabase's vpn_servers.
SERVER_ID=
BEAT_URL=https://<project-ref>.supabase.co/functions/v1/vpn-heartbeat
BEAT_SECRET=
EOF
  chmod 600 "$STATE_DIR/beat.env"
  ok "template written — fill $STATE_DIR/beat.env"
else
  ok "beat.env already filled"
fi

cat >/etc/systemd/system/katitos-beat.service <<EOF
[Unit]
Description=Katitos VPN heartbeat
After=network-online.target

[Service]
Type=oneshot
EnvironmentFile=$STATE_DIR/beat.env
ExecStart=/usr/local/bin/katitos-beat
EOF
cat >/etc/systemd/system/katitos-beat.timer <<'EOF'
[Unit]
Description=Katitos VPN heartbeat, once a minute

[Timer]
OnBootSec=45s
OnUnitActiveSec=60s
# Without this every server on earth beats on the same second. 10s of jitter
# costs nothing and keeps them from arriving as a thundering herd.
RandomizedDelaySec=10s
AccuracySec=1s

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
if grep -q '^SERVER_ID=.\+' "$STATE_DIR/beat.env"; then
  systemctl enable --now katitos-beat.timer >/dev/null
  ok "beating every minute"
else
  ok "timer installed, waiting on beat.env"
fi

# ── Unattended security updates ─────────────────────────────────────────────
say "Automatic security updates"
apt-get install -y -qq unattended-upgrades >/dev/null
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true
ok "on"

# ── Done ────────────────────────────────────────────────────────────────────
IP4="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo '?')"
# shellcheck disable=SC1091
source "$STATE_DIR/panel.env"
cat <<EOF

  ─────────────────────────────────────────────
  Panel   https://$IP4:$PANEL_PORT/$PANEL_PATH/
  User    $PANEL_USER
  Pass    $PANEL_PASS
  SSH     ssh -p $SSH_PORT root@$IP4
  AWG     $AWG_PORT/udp   pubkey $(cat "$AWG_DIR/server.pub" 2>/dev/null || echo '?')
  ─────────────────────────────────────────────

  Next, and only by hand: the inbounds in the panel.
  See docs/vpn-setup.md, step 4.

  Before you close this terminal, open a SECOND one and confirm
  'ssh -p $SSH_PORT root@$IP4' works. This session is the only way back in
  if it does not.

EOF
