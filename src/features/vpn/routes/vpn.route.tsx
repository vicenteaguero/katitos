import { useEffect, useState } from 'react';
import { Check, Copy, QrCode } from 'lucide-react';
import { Button, Empty, PageHeader, Sheet, Spinner } from '@kernel/ui';
import { useMyVpnClient, useVpnStatus } from '../api/vpn.queries';
import { lastSeen, uptimeText } from '../lib/health';
import { PROTOCOL_LABELS, ROLE_LABELS, type VpnServer } from '../types';

/** The app that is still in the Russian App Store. Checked 5 September 2026. */
const APP_URL = 'https://apps.apple.com/app/karing/id6472431552';

/** 🇫🇮 from "FI". Two regional-indicator letters, no flag asset to ship. */
const flag = (cc: string | null) =>
  cc && /^[A-Z]{2}$/.test(cc)
    ? String.fromCodePoint(
        ...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
      )
    : '';

function Row({ s }: { s: VpnServer }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          s.alive ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
        aria-label={s.alive ? 'up' : 'not reporting'}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-lg text-fg">
          {flag(s.country)} {s.label}
          <span className="ml-2 font-sans text-xs text-muted">
            {ROLE_LABELS[s.role]}
          </span>
        </span>
        <span className="block truncate font-sans text-xs text-muted">
          {lastSeen(s.last_beat)}
          {s.protocols.length > 0 &&
            ` · ${s.protocols.map((p) => PROTOCOL_LABELS[p] ?? p).join(' · ')}`}
        </span>
      </span>
      <span className="shrink-0 text-right font-sans text-xs tabular-nums text-muted">
        <span className="block text-fg">{uptimeText(s.uptime_24h)}</span>
        24 h
      </span>
      <span className="shrink-0 text-right font-sans text-xs tabular-nums text-muted">
        <span className="block text-fg">{uptimeText(s.uptime_7d)}</span>7 d
      </span>
    </li>
  );
}

/** The QR, drawn only when she asks for it — the encoder is 40 kB. */
function Qr({ value }: { value: string }) {
  const [png, setPng] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then((m) =>
        m.toDataURL(value, { margin: 1, width: 512, errorCorrectionLevel: 'M' })
      )
      .then((d) => alive && setPng(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [value]);

  if (failed)
    return <p className="font-sans text-sm text-muted">Couldn’t draw it.</p>;
  if (!png) return <Spinner />;
  return (
    <img
      src={png}
      alt="Your profile, as a QR code"
      className="mx-auto w-full max-w-64 rounded-lg bg-white p-2"
    />
  );
}

/** One profile: what it is for, and the two ways to get it into the app. */
function Profile({
  title,
  hint,
  url,
  onQr,
}: {
  title: string;
  hint: string;
  url: string;
  onQr: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg text-fg">{title}</span>
        <span className="block font-sans text-xs text-muted">{hint}</span>
      </span>
      <Button variant="ghost" onClick={onQr} aria-label={`QR for ${title}`}>
        <QrCode className="h-4 w-4" />
      </Button>
      <Button variant="ghost" onClick={copy} aria-label={`Copy ${title}`}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

/**
 * Her internet: whether it is awake, and how to get on it.
 *
 * Read-only by design. There is no "restart it" button and there never will
 * be: the moment she would need one is the moment this page will not load,
 * because Katitos does not reach Russia without the tunnel it is describing.
 * When it is really down, the channel is a message to me, on whatever still
 * works over there.
 */
export function VpnRoute() {
  const { data: servers, isLoading } = useVpnStatus();
  const { data: me } = useMyVpnClient();
  const [qr, setQr] = useState<string | null>(null);

  const live = me && !me.revoked_at;

  return (
    <div>
      <PageHeader subtitle="Where you come out, and whether it’s awake." />

      {isLoading && <Spinner />}

      {!isLoading && (!servers || servers.length === 0) && (
        <Empty
          title="Nothing set up yet"
          hint="No exit servers have been added."
        />
      )}

      {servers && servers.length > 0 && (
        <ul className="divide-y divide-line">
          {servers.map((s) => (
            <Row key={s.id} s={s} />
          ))}
        </ul>
      )}

      {live && (
        <section className="mt-5">
          <h2 className="font-display text-xl text-fg">Getting on it</h2>

          <ol className="mt-2 space-y-3 font-sans text-sm text-fg">
            <li>
              <span className="text-muted">1 ·</span> Install{' '}
              <a
                href={APP_URL}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-gold underline-offset-2"
              >
                Karing
              </a>
              , then come back here.
            </li>
            <li>
              <span className="text-muted">2 ·</span> Open it, tap{' '}
              <span className="font-semibold">+</span>, and scan or paste one of
              these:
              {/* Two, in the order she should reach for them. The spare is not
                  a lesser copy — it is a different transport, so the day the
                  first one stops connecting is the day this one still does. */}
              <div className="mt-1 divide-y divide-line">
                {me.sub_url && (
                  <Profile
                    title="Main"
                    hint="Use this one"
                    url={me.sub_url}
                    onQr={() => setQr(me.sub_url)}
                  />
                )}
                {me.alt_url && (
                  <Profile
                    title="Spare"
                    hint="Only if the main one stops connecting"
                    url={me.alt_url}
                    onQr={() => setQr(me.alt_url)}
                  />
                )}
              </div>
            </li>
            <li>
              <span className="text-muted">3 ·</span> Turn it on. That’s it —
              nothing to type.
            </li>
          </ol>

          {/* The two rules that keep her ordinary life working. Both exist
              because of things done to Russian users, not because of anything
              about this setup: services that must refuse VPN traffic to stay
              in the mobile whitelist, and banks whose certificates only her
              own country trusts now. */}
          <p className="mt-4 font-sans text-xs leading-relaxed text-muted">
            Two things stay <span className="text-fg">off</span> the tunnel, and
            I’ve set them that way: Russian sites, and your bank. They break if
            they go through it.
          </p>
          <p className="mt-2 font-sans text-xs leading-relaxed text-muted">
            Don’t forward these to anyone — they’re yours, and they’re the whole
            key.
          </p>
        </section>
      )}

      {/*
        The one thing she should know before she blames the servers. During a
        whitelist episode her operator lets through a short list of Russian
        sites and nothing else, whatever tunnel is running — every dot on this
        page can be green while her phone has no internet. Saying so here is
        cheaper than her wondering.
      */}
      <p className="mt-5 font-sans text-xs leading-relaxed text-muted">
        If everything above is green and your phone still won’t load anything,
        it’s your mobile operator, not these servers. Try wifi — and tell me.
      </p>

      <Sheet open={!!qr} onClose={() => setQr(null)} title="Scan this">
        <p className="mb-3 font-sans text-sm text-muted">
          In Karing: tap +, then scan.
        </p>
        {qr && <Qr value={qr} />}
      </Sheet>
    </div>
  );
}
