# Katitos VPN - design

An exit server so she has working internet from Russia, plus a small Katitos
feature to see its status.

**Status: the Katitos half is built and gated shut. No server exists yet.**
Last updated 2026-09-05.

---

## What this is, and what it is not

|                    | Katitos VPN                   | Workstation VPN                               |
| :----------------- | :---------------------------- | :-------------------------------------------- |
| Who it is for      | Her                           | Me                                            |
| Purpose            | **Have internet at all**      | Work abroad **as if I were in Chile**         |
| Where it must exit | Near her. Anywhere but Russia | **Chile, mandatory.** That is the whole point |
| Where it lives     | A small VPS in Europe         | The Lenovo at home, `~/dev/workstation`       |
| Cost               | ~4–5 €/month                  | Zero, already exists                          |

They share tooling and nothing else. **Do not merge them, and do not let one do
the other's job.** An earlier draft of this document put the Lenovo in her server
list as an automatic failover, on the argument that a residential Chilean IP is
not in any bulk blocklist. That was true and beside the point: this project exists
so that her internet is **fast**, and 495 ms is not fast, it is a hostage
negotiation. A path she would never willingly use is not a failover.

Her spare is a **second rented box in an unrelated range**, not my house.

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
- ⚠️ **The mechanism**, measured on MTS Novosibirsk - her city - in November 2025:
  opening roughly twelve TLS connections **with the same SNI** in a short window
  triggers a ~120 s freeze where the handshake stops reaching the server.
  Multiplexing collapses many logical streams into few TCP connections and never
  reaches the threshold. Connections with no SNI are unaffected. Changing
  fingerprint mid-freeze **escalates** the penalty to ~600 s.
  _This specific mechanism is the weakest claim here - one community analysis that
  self-flags as hypothesis. The practical conclusion (use mux) is solid regardless._
- **IP prefix reputation is central.** RKN blocked whole hosting-provider ranges in
  April 2025 (AWS, Hetzner, DigitalOcean, GoDaddy, Ionos, Kamatera). Hetzner and
  DigitalOcean ranges appear by name in measured mobile filtering.
- **Anything behind Cloudflare is dead.** Since June 2025 the major Russian
  operators cap server-to-client transfer at ~16 KB per connection, across
  HTTP/1.1, HTTP/2 and HTTP/3. Confirmed by Cloudflare itself.
- **QUIC censorship is port-agnostic and unidirectional.** QUIC v2 remains
  uncensored because the parser is incomplete - a real but fragile gap. Do not
  build on it.

### The principle that matters more than any recipe

AmneziaWG shipped 3.1 on 31 Aug 2026 specifically against the June–July blocking.
Their own diagnosis is the sentence to remember: censors now assess _"the connection
as a whole, as a data flow, together with the endpoint"_ - packet sizes,
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

| Role          | Where                                                                                  | Notes                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary**   | Small VPS in **Helsinki** - see the latency table below                                | ~4–5 €/month. Pick an uncommon provider in a clean range. **Not Hetzner, not DigitalOcean, not Aeza, not a free tier**                          |
| **Secondary** | A second small VPS, **different provider, different country** - Stockholm or Frankfurt | Another ~4–5 €/month, and the only kind of spare worth having: a different company, a different address range, a different day of being noticed |

Both are hers from day one, in that order, in her config. The point of the second
box is not capacity, it is that the two are **unrelated to each other**: one
provider's ranges getting swept must not be the end of both.

There is no usable free option, and this was checked:

| Option                                    | Why not                                                                                                                               |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| Oracle Always Free                        | **Withdrew from Russia in 2022**; reclaims instances idle 7 days (a one-person proxy trips this); free tier silently halved June 2026 |
| Google Cloud                              | Free VM is **US-only** with **1 GB/month egress**. A VPN spends egress, not compute                                                   |
| Fly.io, AWS                               | No permanent free compute since 2024 and 2025                                                                                         |
| Cloudflare Workers, Vercel, Railway, Deno | **Terms explicitly prohibit** VPN/proxy use                                                                                           |
| Koyeb, Render, Zeabur, Replit             | Sleep on inactivity                                                                                                                   |

### Where, measured - 5 September 2026

Her ISPs route **west**, and the question is closed. Measured round trip from
Novosibirsk:

| To           |      Ping |                                            |
| :----------- | --------: | :----------------------------------------- |
| Moscow       |     42 ms | the floor. Everything else pays this first |
| **Helsinki** | **68 ms** | **the answer**                             |
| Stockholm    |     78 ms |                                            |
| Frankfurt    |     81 ms |                                            |
| Amsterdam    |     85 ms |                                            |
| Tokyo        |     88 ms | _worse than three European cities_         |
| Istanbul     |    102 ms |                                            |
| Seoul        |    251 ms |                                            |
| Hong Kong    |    309 ms |                                            |

Tokyo losing to Helsinki is the whole proof. Novosibirsk is ~5,000 km from Tokyo
and ~3,500 km from Helsinki in a straight line; 88 ms east is only possible if the
traffic goes up to Moscow and comes back. Seoul at 251 ms and Hong Kong at 309 ms
put it beyond argument - those are neighbours, priced like the far side of the
planet. Russian forums have complained about Rostelecom hauling Asian traffic
through Europe for years, and the operator keeps calling it temporary.

**So: Helsinki, and no ping test needed.** These numbers come from a datacentre
node, so add roughly 20–30 ms for her flat; the ORDER is what decides, and it does
not move.

_(19 RIPE Atlas probes are live on her actual ISPs - Novotelecom AS31200,
Sibirskie Seti AS34757, Rostelecom AS12389 - if this ever needs measuring from a
real Novosibirsk household rather than a rack.)_

### Protocols

| Priority | Transport                         | Why                                                                                                            |
| :------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| 1        | **VLESS + REALITY over gRPC**     | HTTP/2 multiplexes many streams over one TLS connection and one SNI - which is what the measured filter counts |
| 2        | VLESS + REALITY over TCP + Vision | Still fine where the newer filter has not been applied                                                         |
| 3        | **AmneziaWG 3.1**                 | Unrelated technology, different detection surface                                                              |

### Why not XHTTP, which this document used to lead with

**Her client cannot run it.** Karing - the one app still in the Russian App
Store - ships the **sing-box core only**, and sing-box has no XHTTP transport;
its author has said he does not plan one. XHTTP is an Xray-only transport.

That is not a detail to design around later. It rules out the transport
entirely for the person this is for, and it was found the way these things are
always found: the server was verified end-to-end with an _Xray_ client, which
proved a path she will never take. **Verify with the core she actually runs.**

gRPC is the other half of what the community moved to after the February and
June 2026 waves, and it gets the property that mattered: HTTP/2 carries many
logical streams over a single TLS connection, so the connection-count filter
measured on MTS Novosibirsk never sees a burst.

### The Xray version is pinned, and must stay pinned

**26.6.27.** Xray **26.7.x breaks REALITY against every sing-box client** -
`reality verification failed`, on both transports, silently. Reproduced here on
26.7.28 and fixed by downgrading; it matches the reports against 26.7.11, and
the open Karing issue about 3x-ui servers.

An automatic panel update of the Xray core would take her internet down with no
message and no obvious cause. Treat a core upgrade as a change to test, never
as maintenance.

All three configured from the start. Switching is a profile change in her app, not
a support call.

**XHTTP runs on top of REALITY, not only on top of TLS** - tested on Xray-core
v26.3.27 on 24–25 August 2026. That matters more than it sounds: REALITY borrows a
real third party's certificate and SNI, so the transport that is currently
surviving best **needs no domain of ours at all**.

### No domain, on purpose

An earlier draft assumed a throwaway domain was required. It is not, and buying
one would be worse than free:

- **The tunnel doesn't need it.** REALITY presents someone else's certificate.
- **The subscription URL doesn't need it either.** Let's Encrypt has issued
  certificates for bare IP addresses since July 2025, generally available since
  **15 January 2026** - 160-hour certs that renew themselves. HTTPS on an IP, no
  domain, no DNS.
- **And a TLS connection to an IP carries no SNI**, which is the one field the
  measured MTS Novosibirsk freeze keys on. Connections with no SNI were the ones
  it did not touch.

A domain of ours would add ten dollars a year, a DNS record, and one more thing
that can be burned and traced - in exchange for nothing.

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

_Android is much easier - Hiddify, Happ and AmneziaVPN are still on Play. Do not
install NekoBox from Play; that listing has been third-party controlled since 2024._

⚠️ **Keep the client updated.** A March 2026 disclosure found that nearly all mobile
xray/sing-box clients exposed an **unauthenticated local SOCKS5 proxy**, and in one
case a local API that let any other app on the phone dump the full config - keys,
server address and SNI. Fixed only in current versions.

⚠️ Fake "free VPN" APKs carrying banking trojans are circulating. Send one direct
link, never an aggregator.

### How the config reaches her

**A subscription URL served by the VPN infrastructure - not by Katitos.** Her client
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
  That alert needs a channel that works in Russia without a tunnel - SMS, or
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
  interpreted broadly - the second known case was **a single link** in a WhatsApp
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

~4–5 €/month per box, and the recommendation is two of them in unrelated ranges:
**~8–10 €/month, all in.** No domain (see above), no licences, nothing else.

This is **Katitos hosting**, not an expense of the workstation project - the
zero-cost rule there was written for a dev box, not for her internet.

---

## Verify before building

1. **She installs Karing** and confirms it is still in the Russian App Store on her
   account.
2. ~~She runs a ping to Frankfurt and to Tokyo.~~ **Answered** - see the latency
   table. Her traffic goes west through Moscow, Tokyo is slower than three
   European cities, and the destination is Helsinki.
3. **Decide on the ~8–10 €/month** for two boxes. Nothing else is blocking.

---

## Open questions

- ~~Whether her ISPs in Novosibirsk and Krasnoyarsk route west or east.~~ West,
  through Moscow. Measured 5 September 2026; Krasnoyarsk is further east and can
  only be more so.
- Which VPS provider has clean address space and is not already filtered. Needs
  checking at purchase time, not from here.
- ⚠️ Whether mobile international-traffic metering (a proposed 15 GB/month cap) ever
  came into force. Proposed for May 2026 and postponed; treat any claim that it is
  live as unverified.
