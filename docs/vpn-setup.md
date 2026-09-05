# Katitos VPN — the build, start to finish

The runbook for turning money into her working internet. Design and reasoning
live in [vpn.md](vpn.md); this is only the doing.

> **Status: written, never run.** Every command here comes from current upstream
> documentation, and the scripts pass a syntax check, but no part of this has
> touched a real server yet. The first run IS the test. Expect to fix two or
> three things, and expect them to be in steps 4 and 5.

**Time:** about 90 minutes, of which 10 are yours and the rest is waiting.
**Cost:** ~5 €/month for one box, ~10 € for the pair. No domain — see vpn.md.

---

## 0. What exists at the end

- A box in Helsinki she exits through, ~90–100 ms from her flat.
- **Two unrelated tunnels on it**: Xray (VLESS) and AmneziaWG. If one is
  detected, the other is a different technology, not a copy.
- **Two Xray transports**: XHTTP+REALITY on 443, TCP+REALITY+Vision on 8443.
  Switching is a tap in her app.
- A heartbeat into Supabase, and the Katitos page that reads it.

What does **not** exist at the end: any guarantee. See the failure table in
vpn.md. This survives being blocked; it does not avoid it forever.

---

## 1. Buy the box

[UpCloud](https://upcloud.com) → Sign up → Deploy a server.

| Field    | Value                                                                                                                                      |
| :------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| Location | **Helsinki, Finland (fi-hel1 or fi-hel2)**                                                                                                 |
| Plan     | Smallest — 1 vCPU / 1 GB / ~2 TB transfer, ~5 €/month                                                                                      |
| OS       | **Ubuntu 24.04 LTS** — not Debian. The AmneziaWG kernel module comes from an Ubuntu PPA; on Debian you point it at a `focal` repo and hope |
| SSH keys | **Paste your public key.** Do not choose a password login                                                                                  |
| IPv4     | Yes, and note the address                                                                                                                  |

Your public key, if you need it: `cat ~/.ssh/id_ed25519.pub` — and if that file
does not exist, `ssh-keygen -t ed25519` first.

Pay with the Chilean card. Nothing here needs crypto or a Russian card.

> **Do not buy a second box yet.** Get one working end to end first. The spare
> is step 8, and it is fifteen minutes once you have done it once.

### The UpCloud trial will lock you out — deposit first

UpCloud's 7-day trial locks its own network firewall on, above the server, and
trial accounts cannot edit it:

| Direction | Open during trial      |
| :-------- | :--------------------- |
| Inbound   | 22, 80, 443, 3389      |
| Outbound  | 53, 80, 443, 8080, 123 |

Plus a 100 Mbit/s cap. Against this design that means **SSH on 52201 never
answers** — `provision.sh` moves the port, sshd reloads, and the box is gone —
and it also kills the AmneziaWG port, the second Xray inbound and the panel. The
heartbeat survives, because it dials out on 443.

The unlock is a **one-time $10 deposit**, which is the same money the box costs
anyway; trial credit is kept, so it becomes roughly four months of the small
plan. **Deposit before deploying.**

If you really do want to test on the trial first, then: `SSH_PORT=22
./provision.sh`, XHTTP+REALITY on 443 only, panel over an SSH tunnel
(`ssh -L 41100:localhost:41100 …`), and no AmneziaWG. That tests the main path
and nothing else — do not read a good result there as the design working.

---

## 2. Provision it

From your machine, in this repo:

```bash
scp -r infra/vpn root@<IP>:/root/
ssh root@<IP>
```

On the box:

```bash
cd /root/vpn
chmod +x *.sh
./provision.sh
```

Roughly ten minutes. It does the base hardening (key-only SSH on a non-standard
port, ufw, fail2ban, unattended security updates), turns on **BBR** — the single
biggest speed win available on a long path like hers — installs 3x-ui with
random credentials, builds the AmneziaWG kernel module, and lays down the
heartbeat timer.

It prints a panel URL, a username and a password. **Put them in your password
manager now**; they are also in `/etc/katitos-vpn/panel.env`, on a box you might
one day lose.

### Before you close that terminal

```bash
# In a SECOND terminal, on your machine:
ssh -p 52201 root@<IP>
```

If that fails, fix it from the still-open first session. Once both are closed
and the port is wrong, the box is gone and you buy another one.

---

## 3. Wire up the heartbeat

**On your machine**, deploy the function and set its secret:

```bash
BEAT_SECRET=$(openssl rand -hex 32); echo "$BEAT_SECRET"   # keep this
supabase functions deploy vpn-heartbeat --no-verify-jwt
supabase secrets set VPN_BEAT_SECRET="$BEAT_SECRET"
```

`--no-verify-jwt` is required and is the point: the caller is a bash script on a
VPS, not a signed-in phone. Its door is the secret in a header instead.

Then create the server's row — Supabase dashboard → SQL editor:

```sql
insert into public.vpn_servers (label, city, country, role, protocols, sort)
values ('Helsinki', 'Helsinki', 'FI', 'primary', '{xhttp,reality,awg}', 10)
returning id;
```

Copy that uuid. **On the box:**

```bash
nano /etc/katitos-vpn/beat.env      # SERVER_ID, BEAT_URL, BEAT_SECRET
systemctl enable --now katitos-beat.timer
systemctl start katitos-beat && journalctl -u katitos-beat -n 20
```

A silent run is a good run. `beat failed: http 401` is a wrong secret;
`http 400` is a SERVER_ID that is not a row.

---

## 4. The Xray inbounds, in the panel

Open `https://<IP>:<PANEL_PORT>/<PANEL_PATH>/`. The browser will warn about the
certificate — it is self-signed, that is expected here, accept it once.

**First: pick a REALITY destination.** REALITY works by borrowing a real site's
certificate, so a probe that pokes at your server gets that site and believes it.
The site must be:

- reachable from Russia and **not blocked** (test from her connection if unsure),
- **not behind Cloudflare** — Russian operators cap Cloudflare responses at ~16 KB
  since June 2025, which breaks it,
- TLS 1.3 + X25519 + HTTP/2,
- ideally hosted in or near Finland, so the geography is not absurd.

Check a candidate:

```bash
openssl s_client -connect www.example.com:443 -tls1_3 -alpn h2 </dev/null 2>&1 \
  | grep -E 'Protocol|ALPN|Server public key'
```

You want `TLSv1.3`, `ALPN protocol: h2`, and an X25519 key. Nordic corporate
sites are the easy hunting ground. Avoid anything Russian, anything American and
political, and anything already famous as a REALITY dest.

### Inbound A — XHTTP + REALITY, port 443

This is the one that survived the February and June 2026 waves. Add Inbound:

| Field            | Value                                        |
| :--------------- | :------------------------------------------- |
| Protocol         | VLESS                                        |
| Port             | 443                                          |
| Transport        | **XHTTP**                                    |
| Mode             | `auto`                                       |
| Path             | something ordinary, e.g. `/assets`           |
| Security         | **REALITY**                                  |
| Dest / SNI       | your chosen site, `:443`                     |
| uTLS fingerprint | **`firefox`** — see below                    |
| Flow             | leave empty (Vision does not apply to XHTTP) |

> **Not Chrome, not Safari, not iOS.** The Xray-core issue tracking 2026 Russian
> blocking lists those three fingerprints as _suspicious_ to the censor, while
> Firefox, Edge and the Android clients pass on most operators. This one dropdown
> is worth more than most of the rest of this page.

XHTTP multiplexes by default (XMUX) and **you must not also turn on mux.cool** —
they fight. The multiplexing is the point: the measured MTS Novosibirsk filter
trips on roughly twelve TLS connections to the same SNI in a short window, and
XHTTP never gets near that.

### Inbound B — TCP + REALITY + Vision, port 8443

The fallback profile, on its own port so the two fail independently.

| Field            | Value              |
| :--------------- | :----------------- |
| Protocol         | VLESS              |
| Port             | 8443               |
| Transport        | TCP                |
| Security         | REALITY            |
| Dest / SNI       | same site is fine  |
| uTLS fingerprint | `firefox`          |
| Flow             | `xtls-rprx-vision` |

### Then, once, in panel settings

- **Xray Settings → routing:** enable the rule that blocks private IP ranges
  (`geoip:private`) as a destination. Without it, anyone holding her config
  reaches the provider's internal network from inside.
- Create **one client per person**, not per device — Xray clients can hold
  several devices. Hers is separate from yours so it can be revoked alone.
- **Subscription:** leave it off for now. Her config carries both servers from
  the start, which is what actually does the failover; the subscription URL only
  matters for _adding_ servers later, and it needs a certificate. Step 8.

---

## 5. AmneziaWG — her second tunnel

```bash
./awg-add-client.sh anastasia-iphone
```

Prints a QR and writes the config. One run per **device** here, unlike Xray —
two devices on one key cannot both connect.

The obfuscation values (`Jc`, `S1`, `H1`…) are randomised per server and copied
into the client automatically. They are not preferences, they are the shape of
the packets: server and client must match exactly, and two of your servers must
**not** match each other.

---

## 6. Her phone

**App: Karing**, still in the Russian App Store as of 5 September 2026. Free,
Russian interface, no region change, no second Apple ID. (Apple removed 1,213
apps from the Russian store on RKN request in 2025 — Streisand, V2Box, v2RayTun
and Happ all went in one sweep on 28 March 2026. Karing is what is left.)

For AmneziaWG she needs **AmneziaVPN**, separately.

Send her, in one message, over something private:

1. The App Store link — **a direct link, never an aggregator.** Fake "free VPN"
   APKs carrying banking trojans are circulating.
2. The two `vless://` links from the panel (the copy button next to her client).
3. The AmneziaWG QR from step 5.

Instruction, and this is the whole of it: _open the app, tap +, paste, enable._

### The three rules that go with it

- **Russian sites go direct, not through the tunnel.** Since April 2026, blocking
  VPN users is a formal condition for a Russian service to be in the mobile
  whitelist, and around twenty large ones enforce it. In Karing: route
  `geosite:category-ru` and `geoip:ru` **direct**.
- **Her bank never goes through the tunnel.** Not "preferably" — never. Foreign
  CAs revoked certificates for Sberbank, VTB and Russian Railways in August 2026;
  Russian banking lives in its own trust world now. Add its domain as direct.
- **Keep the app updated.** A March 2026 disclosure found nearly every mobile
  xray/sing-box client exposing an unauthenticated local SOCKS5 proxy, and in one
  case a local API that let any other app on the phone dump the whole config.
  Fixed only in current versions.

And the one social rule, which matters more than any of the above: **using it is
fine, talking about it publicly is not.** Advertising or recommending
circumvention tools costs a private citizen 50,000–80,000 ₽ and is enforced
broadly — the second known case was a single link in a WhatsApp Business
catalogue. No posting the config, no forwarding it in open channels.

---

## 7. Open it in Katitos

Once a green dot appears — meaning the box has actually reported in:

1. `src/app/features.registry.ts` → add `'vpn'` to the `OPEN` set.
2. `src/app/changelog.ts` → a new entry at the top, in her words. One line about
   what she can now do, nothing about servers or protocols.
3. Bump `package.json`.
4. Push. Vercel deploys.

Her page then shows which server she is on, whether it is awake, and its uptime.
It has no button that touches anything, on purpose: the moment she would need one
is the moment Katitos will not load for her.

---

## 8. Day two

**The spare, and this is the important one.** Repeat steps 1–5 at a _different
company in a different country_ — Stockholm (78 ms) or Frankfurt (81 ms). Add
both servers to her client. That is the failover: when one stops answering, her
app moves to the next in seconds, having fetched nothing from anyone.

**When a server is burned.** Symptom: connections stop establishing while the
heartbeat stays green — the box is healthy, the path to it is not. Mark it
retired (`update public.vpn_servers set retired_at = now() where id = '…'`), buy
a replacement, and run steps 1–5 again. Fifteen minutes.

**Rotating her config.** Delete her client in the panel, make a new one, send the
new link. Instant and total.

**A subscription URL, when you want one.** Once there are two or more servers,
serving a list beats sending links. It needs HTTPS, and since 15 January 2026
Let's Encrypt issues certificates for bare IP addresses — no domain:

```bash
acme.sh --issue --server letsencrypt -d <IP> \
  --certificate-profile shortlived --days 3 -w /var/www/html
```

`--days 3` is not paranoia: IP certificates are valid for 160 hours, so the
renewal check has to run far more often than the usual 90-day habit.

---

## When something is wrong

| Symptom                         | Where to look                                                                                                                                           |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No dot in Katitos               | `journalctl -u katitos-beat -n 50` on the box                                                                                                           |
| Dot green, no internet for her  | **Her operator.** Whitelist episode, or the tunnel is blocked while the box is fine. Have her try wifi vs mobile data — that one test separates the two |
| Connects, then dies after ~60 s | The February 2026 pattern. Switch her to the other profile                                                                                              |
| Nothing connects, both profiles | The IP is burned. Step 8                                                                                                                                |
| Panel unreachable               | ufw, or you changed the port. `ssh` in and `x-ui settings`                                                                                              |

The rule underneath all of it, from Amnezia's own post-mortem on the June–July
2026 blocking: censors now judge _"the connection as a whole, as a data flow,
together with the endpoint"_, so _"changing one or even several parameters isn't
enough."_ Nothing here is final. Budget an evening every few months, not a
one-time setup.
