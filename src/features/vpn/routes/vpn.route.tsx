import { useEffect, useState } from 'react';
import { Check, Copy, QrCode } from 'lucide-react';
import { Button, Empty, PageHeader, Sheet, Spinner } from '@kernel/ui';
import { useMyVpnClient, useVpnStatus } from '../api/vpn.queries';
import { lastSeen, uptimeText } from '../lib/health';
import { PROTOCOL_LABELS, ROLE_LABELS, type VpnServer } from '../types';

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
function SubQr({ url }: { url: string }) {
  const [png, setPng] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then((m) =>
        m.toDataURL(url, { margin: 1, width: 512, errorCorrectionLevel: 'M' })
      )
      .then((d) => alive && setPng(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [url]);

  if (failed)
    return <p className="font-sans text-sm text-muted">Couldn’t draw it.</p>;
  if (!png) return <Spinner />;
  return (
    <img
      src={png}
      alt="Your subscription, as a QR code"
      className="mx-auto w-full max-w-64 rounded-lg bg-white p-2"
    />
  );
}

/**
 * Her internet, when it works.
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
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!me?.sub_url) return;
    await navigator.clipboard.writeText(me.sub_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

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

      {me?.sub_url && !me.revoked_at && (
        <div className="mt-4 flex gap-2">
          <Button onClick={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4" /> My QR
          </Button>
          <Button variant="ghost" onClick={copy}>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      )}

      {/*
        The one thing she should know before she blames the servers. During a
        whitelist episode her operator lets through a short list of Russian
        sites and nothing else, whatever tunnel is running — every dot on this
        page can be green while her phone has no internet. Saying so here is
        cheaper than her wondering.
      */}
      <p className="mt-4 font-sans text-xs leading-relaxed text-muted">
        If everything here is green and your phone still won’t load anything,
        it’s your mobile operator, not these servers. Try wifi — and tell me.
      </p>

      <Sheet open={qrOpen} onClose={() => setQrOpen(false)} title="Your QR">
        <p className="mb-3 font-sans text-sm text-muted">
          Open the app, tap +, scan this. Don’t send it to anyone — it’s yours.
        </p>
        {me?.sub_url && <SubQr url={me.sub_url} />}
      </Sheet>
    </div>
  );
}
