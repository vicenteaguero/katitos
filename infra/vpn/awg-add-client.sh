#!/usr/bin/env bash
#
# Katitos VPN — add one device to AmneziaWG and print its config + QR.
#
#   ./awg-add-client.sh anastasia-iphone
#
# One run per DEVICE, not per person: two devices sharing a key cannot both be
# connected, and revoking one would revoke the other.
#
# Xray/3x-ui has its own users, managed in the panel. This is only the second,
# unrelated tunnel — the one that keeps working when the first is what got
# detected.
set -euo pipefail

NAME="${1:?usage: awg-add-client.sh <device-name>}"
AWG_DIR=/etc/amnezia/amneziawg
CONF="$AWG_DIR/awg0.conf"
OUT_DIR="$AWG_DIR/clients"

[[ $EUID -eq 0 ]] || { echo "run as root" >&2; exit 1; }
[[ -f "$CONF" ]] || { echo "no $CONF — run provision.sh first" >&2; exit 1; }
mkdir -p "$OUT_DIR" && chmod 700 "$OUT_DIR"
[[ -e "$OUT_DIR/$NAME.conf" ]] && { echo "$NAME already exists" >&2; exit 1; }

SERVER_PUB=$(cat "$AWG_DIR/server.pub")
PORT=$(awk -F' *= *' '/^ListenPort/ {print $2}' "$CONF")
NET=$(awk -F' *= *' '/^Address/ {print $2}' "$CONF")
BASE=$(cut -d. -f1-3 <<<"$NET")   # 10.77.0, from "10.77.0.1/24"

# Next free host in the /24. Starts at .2 — .1 is the server itself.
used=$(grep -oE '^AllowedIPs *= *[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' "$CONF" \
  | awk -F. '{print $4}' || true)
next=2
while grep -qx "$next" <<<"$used"; do next=$((next + 1)); done
[[ $next -lt 255 ]] || { echo "/24 is full" >&2; exit 1; }
CLIENT_IP="$BASE.$next"

umask 077
KEY=$(awg genkey)
PUB=$(awg pubkey <<<"$KEY")
PSK=$(awg genpsk)   # pre-shared key: a second, symmetric layer on the handshake

# The obfuscation values MUST match the server's exactly — they are not
# preferences, they are the shape of the packets. Copy, never regenerate.
mapfile -t OBF < <(grep -E '^(Jc|Jmin|Jmax|S1|S2|H1|H2|H3|H4) *=' "$CONF")

cat >>"$CONF" <<EOF

# $NAME — added $(date -u +%Y-%m-%d)
[Peer]
PublicKey = $PUB
PresharedKey = $PSK
AllowedIPs = $CLIENT_IP/32
EOF

ENDPOINT="${ENDPOINT:-$(curl -fsS --max-time 5 https://api.ipify.org)}"

cat >"$OUT_DIR/$NAME.conf" <<EOF
[Interface]
PrivateKey = $KEY
Address = $CLIENT_IP/32
DNS = 1.1.1.1, 8.8.8.8
$(printf '%s\n' "${OBF[@]}")

[Peer]
PublicKey = $SERVER_PUB
PresharedKey = $PSK
Endpoint = $ENDPOINT:$PORT
AllowedIPs = 0.0.0.0/0, ::/0
# A keepalive at all is what makes this survive carrier-grade NAT, which every
# Russian mobile network is. 25 s is the usual floor before the mapping is gone.
PersistentKeepalive = 25
EOF
chmod 600 "$OUT_DIR/$NAME.conf"

# Apply without dropping anyone already connected. `awg-quick down/up` would
# have cut her off mid-call to add a device that is not even hers.
awg syncconf awg0 <(awg-quick strip awg0)

echo
qrencode -t ansiutf8 <"$OUT_DIR/$NAME.conf"
echo
echo "  $OUT_DIR/$NAME.conf   ($CLIENT_IP)"
echo "  Scan it with AmneziaVPN, or import the file."
echo "  Do not send this over anything public — it IS the tunnel."
echo
