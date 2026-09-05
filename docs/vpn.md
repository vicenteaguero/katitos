# Katitos VPN — design

An exit server so she has working internet from Russia, plus a small Katitos
feature to see its status.

**Status: design only. Nothing built.** Last updated 2026-09-05.

---

## What this is, and what it is not

|                    | Katitos VPN                   | Workstation VPN                               |
| :----------------- | :---------------------------- | :-------------------------------------------- |
| Who it is for      | Her                           | Me                                            |
| Purpose            | **Have internet at all**      | Work abroad **as if I were in Chile**         |
| Where it must exit | Near her. Anywhere but Russia | **Chile, mandatory.** That is the whole point |
| Where it lives     | A small VPS in Europe         | The Lenovo at home, `~/dev/workstation`       |
| Cost               | ~4–5 €/month                  | Zero, already exists                          |

They share tooling and nothing else. **Do not merge them.** The Chilean box is
useless as her daily path (≈495 ms round trip) and the European box is useless for
my case (wrong country).

The one place they touch: **my home server is a second entry in her server list**,
so her client fails over to it automatically. Not to save money — because a
residential Chilean IP is not in any bulk blocklist, which is exactly what survives
when datacentre ranges get swept.

---

## What actually gets things blocked in Russia, 2026

> Confidence warning for everything below. Measuring Russia from outside is
> structurally weak right now: OONI has published nothing on Russia since December 2024. Much of this rests on community field reports, not systematic measurement.
> Points marked ⚠️ are weaker still.

### The thing no design can fix

**Whitelist mode is the normal state of Russian mobile internet, not an emergency.**
In August 2026, 1,717 of 1,733 recorded outage events were whitelist mode rather
than full shutdown. Over 60% of all mobile sessions in H1 2026 ran under whitelist
restriction. Unrestricted session share in July 2026: 49% in Moscow, 12% in border
regions.

Whitelisting is **default-deny at the operator's own DPI, keyed on IP and ASN
ranges**. It is not protocol detection. If the server's IP is not on the permitted
list, nothing establishes, whatever the tunnel.

**Set the expectation up front: this works on her home connection. During whitelist
episodes on mobile, nothing will work, and it will not be a configuration problem.**

### What changed for protocols

- **Reality over bare TCP is no longer the safe default.** Mass failures on
  17 Feb 2026 across wired ISPs, with sessions dropping after a minute or never
  establishing, and a second wave in June 2026. The community default moved to
  **XHTTP or gRPC with multiplexing**.
- ⚠️ **The mechanism**, measured on MTS Novosibirsk — her city — in November 2025:
  opening roughly twelve TLS connections **with the same SNI** in a short window
  triggers a ~120 s freeze where the handshake stops reaching the server.
  Multiplexing collapses many logical streams into few TCP connections and never
  reaches the threshold. Connections with no SNI are unaffected. Changing
  fingerprint mid-freeze **escalates** the penalty to ~600 s.
  _This specific mechanism is the weakest claim here — one community analysis that
  self-flags as hypothesis. The practical conclusion (use mux) is solid regardless._
- **IP prefix reputation is central.** RKN blocked whole hosting-provider ranges in
  April 2025 (AWS, Hetzner, DigitalOcean, GoDaddy, Ionos, Kamatera). Hetzner and
  DigitalOcean ranges appear by name in measured mobile filtering.
- **Anything behind Cloudflare is dead.** Since June 2025 the major Russian
  operators cap server-to-client transfer at ~16 KB per connection, across
  HTTP/1.1, HTTP/2 and HTTP/3. Confirmed by Cloudflare itself.
- **QUIC censorship is port-agnostic and unidirectional.** QUIC v2 remains
  uncensored because the parser is incomplete — a real but fragile gap. Do not
  build on it.

### The principle that matters more than any recipe

AmneziaWG shipped 3.1 on 31 Aug 2026 specifically against the June–July blocking.
Their own diagnosis is the sentence to remember: censors now assess _"the connection
as a whole, as a data flow, together with the endpoint"_ — packet sizes,
inter-packet timing, handshake patterns, keepalives, connection counts. Their
conclusion: _"changing one or even several parameters isn't enough."_

So the goal is not to find the magic protocol. It is to **have two unrelated
technologies and expect to keep moving.**

---

## Design principles

1. **Stay out of flagged address space.** No free tiers, no Hetzner, no
   DigitalOcean. Their ranges are the most fingerprinted space that exists.
2. **Do not generate the pattern that trips DPI.** Multiplexing, always.
3. **Two unrelated technologies**, so a single detection advance does not take
   everything down.
4. **Several servers in her config from day one.** Failover must not require
   fetching anything.
5. **Split tunnelling is mandatory**, not a nicety. See below.
6. **Keep the critical path off anything that needs the VPN to load.** Katitos
   included.
7. **Assume mobile whitelist episodes defeat all of it**, and say so in advance.

---

## Architecture

### Servers

| Role          | Where                                             | Notes                                                                                                        |
| :------------ | :------------------------------------------------ | :----------------------------------------------------------------------------------------------------------- |
| **Primary**   | Small VPS in **Helsinki, Amsterdam or Frankfurt** | ~4–5 €/month. Pick an uncommon provider in a clean range. **Not Hetzner, not DigitalOcean, not a free tier** |
| **Secondary** | The Lenovo at home, Curicó                        | Slow (~495 ms) but a residential IP that bulk sweeps do not touch. Automatic failover target                 |

There is no usable free option, and this was checked:

| Option                                    | Why not                                                                                                                               |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| Oracle Always Free                        | **Withdrew from Russia in 2022**; reclaims instances idle 7 days (a one-person proxy trips this); free tier silently halved June 2026 |
| Google Cloud                              | Free VM is **US-only** with **1 GB/month egress**. A VPN spends egress, not compute                                                   |
| Fly.io, AWS                               | No permanent free compute since 2024 and 2025                                                                                         |
| Cloudflare Workers, Vercel, Railway, Deno | **Terms explicitly prohibit** VPN/proxy use                                                                                           |
| Koyeb, Render, Zeabur, Replit             | Sleep on inactivity                                                                                                                   |

### Protocols

| Priority | Transport                | Why                                                    |
| :------- | :----------------------- | :----------------------------------------------------- |
| 1        | **VLESS + XHTTP + mux**  | What survived the February and June waves              |
| 2        | VLESS + Reality over TCP | Still fine where the newer filter has not been applied |
| 3        | **AmneziaWG 3.1**        | Unrelated technology, different detection surface      |

All three configured from the start. Switching is a profile change in her app, not
a support call.

### Per-user rules

- **Her own client identifier**, separate from mine, so it can be revoked alone.
- **All private address ranges blocked for her.** Without this, anyone holding her
  config reaches my home router, my containers and my LAN SSH. Mine keeps private
  access because I want to reach home from abroad. Same server, two permission sets.
- **Split tunnel: Russian destinations go direct.** Since April 2026, blocking VPN
  users is a **formal condition** for a Russian service to be included in the mobile
  whitelist, and roughly twenty large services enforce it. If her Russian traffic
  goes through the tunnel, those services stop working.
- **Her bank stays off the tunnel, without exception.** In August 2026 foreign CAs
  revoked certificates for Sberbank, VTB and Russian Railways. Russian banking now
  lives in its own trust world; leave it there.

---

## Her side

### App: Karing

Apple removes these apps from the **Russian** App Store on RKN request without a
court order: 171 in 2024, **1,213 in 2025**. On 28 March 2026 it took Streisand,
V2Box, v2RayTun and Happ in one sweep.

**Karing is still in the Russian App Store** (checked 2026-09-05), free, Russian
interface. It installs with no tricks: no region change, no second Apple ID.

Fallbacks if it goes: TestFlight, which is still in the Russian store and needs no
region change, though builds expire after 90 days; or a separate US Apple ID with
payment method "None", signing out **only** of Media & Purchases, never iCloud.

_Android is much easier — Hiddify, Happ and AmneziaVPN are still on Play. Do not
install NekoBox from Play; that listing has been third-party controlled since 2024._

⚠️ **Keep the client updated.** A March 2026 disclosure found that nearly all mobile
xray/sing-box clients exposed an **unauthenticated local SOCKS5 proxy**, and in one
case a local API that let any other app on the phone dump the full config — keys,
server address and SNI. Fixed only in current versions.

⚠️ Fake "free VPN" APKs carrying banking trojans are circulating. Send one direct
link, never an aggregator.

### How the config reaches her

**A subscription URL served by the VPN infrastructure — not by Katitos.** Her client
fetches it hourly and updates itself.

**Katitos cannot host this.** Katitos does not load from Russia without a VPN, so
the sequence fails exactly when it matters: server down, no tunnel, cannot fetch a
new list. Fine for routine rotation, useless in the emergency. The subscription
lives on the European server, which is reachable by definition.

**The real failover is not the URL.** Her config carries **several servers from the
start**; when one stops responding the client moves to the next in seconds, fetching
nothing. The subscription URL exists to _add_ servers over time.

Onboarding is three things in one message: an app link, a subscription URL, a QR
code. Instruction: open app, tap plus, scan, enable. Nothing typed.

---

## What Katitos actually does

A **dashboard for when things work**. Nice to have, deliberately not load-bearing.

- Which server she is exiting through, and how fast it is.
- When each server last reported in.
- A button to re-issue her config and show a fresh QR.
- Sits next to the existing couple widgets.

**Explicitly not in Katitos:**

- **The "it's down" button.** If it is down she cannot open Katitos to press it.
  That alert needs a channel that works in Russia without a tunnel — SMS, or
  whatever local messenger works for her.
- **The subscription URL.** See above.
- **Anything her connection depends on.** If Katitos is down, her internet does not
  notice.

Implementation shape, once built: a servers table and a heartbeat table in Supabase,
the workstation and the VPS writing a timestamp every minute, and one feature folder
with a widget. Small, and it follows the existing registry pattern.

---

## Operations

- **Rotation.** When a server is blocked, mark it inactive and add a replacement.
  Her client picks it up within the hour, or fails over instantly if it was already
  in her list.
- **Heartbeat.** Each server writes a timestamp every minute; the dashboard reads it.
  No polling from outside, which would add a datacentre IP repeatedly touching the
  endpoints.
- **Expect to keep moving.** Per Amnezia's own framing, no configuration is final.
  Budget occasional evenings, not a one-time setup.

---

## Legal note for her

Not legal advice; the facts as verified in September 2026, because she is the one
carrying the risk and should decide knowing them.

- **Using a VPN is not an offence.** No criminal or administrative article
  penalises personal use. A Duma committee vice-chair said so explicitly in July
  2026, and in April 2026 the interior ministry's cybercrime directorate publicly
  denied that police check phones for VPN apps. **Zero known cases.**
- **The widely circulated 200,000 ₽ user fine is false.** It comes from a July 2025
  draft that was not adopted.
- **The real exposure is publicity.** Advertising or recommending circumvention
  tools carries **50,000–80,000 ₽** for a private citizen, enforced actively and
  interpreted broadly — the second known case was **a single link** in a WhatsApp
  Business catalogue.
- **Searching for listed extremist material** carries 3,000–5,000 ₽ and requires
  proven intent. Five known sanctions nationwide through June 2026. VPN use is not
  the offence there.
- **VPN is an aggravating factor** if a criminal case already exists for something
  else. Documented in drug cases since late 2025.

**The one rule worth remembering: using it is fine, talking about it publicly is
not.** No posting the config, no forwarding it in open channels, no recommending
the app in writing in public.

---

## Cost

~4–5 €/month for the European VPS. Everything else is free.

This is **Katitos hosting**, not an expense of the workstation project — the
zero-cost rule there was written for a dev box, not for her internet.

---

## Verify before building

1. **She installs Karing** and confirms it is still in the Russian App Store on her
   account.
2. **She runs a ping** to Frankfurt and to Tokyo. Russian internet is Moscow-centric
   and most traffic, even from Siberia, exits via Moscow — but some Siberian ISPs
   route east through China or Mongolia, in which case Tokyo wins by a lot. Five
   minutes, and it decides where to rent.
3. **Decide on the 4–5 €/month.** Nothing else is blocking.

---

## Open questions

- Whether her ISPs in Novosibirsk and Krasnoyarsk route west or east.
- Which VPS provider has clean address space and is not already filtered. Needs
  checking at purchase time, not from here.
- ⚠️ Whether mobile international-traffic metering (a proposed 15 GB/month cap) ever
  came into force. Proposed for May 2026 and postponed; treat any claim that it is
  live as unverified.
