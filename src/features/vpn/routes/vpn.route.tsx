import { useEffect, useState } from 'react';
import { Copy, Check, RotateCw, QrCode } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@kernel/query';
import { Button, Sheet, Spinner } from '@kernel/ui';
import { useMyVpnClient, useVpnStatus, useWhereAmI } from '../api/vpn.queries';
import { lastSeen, uptimeText } from '../lib/health';
import { PROTOCOL_LABELS, ROLE_LABELS, type VpnServer } from '../types';
import {
  AppStoreButton,
  OtherPlatformsLink,
} from '../components/store-buttons';

/** 🇫🇮 from "FI". Two regional-indicator letters, no flag asset to ship. */
const flag = (cc: string | null | undefined) =>
  cc && /^[A-Z]{2}$/.test(cc)
    ? String.fromCodePoint(
        ...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
      )
    : '';

/** The QR, drawn only when asked for - the encoder is 40 kB. */
function Qr({ value }: { value: string }) {
  const [png, setPng] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then((m) =>
        m.toDataURL(value, { margin: 1, width: 640, errorCorrectionLevel: 'M' })
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
      alt="Your code"
      className="mx-auto w-full max-w-72 rounded-lg bg-white p-3"
    />
  );
}

/** The QR plus a copy button, for when a camera isn't the easy way. */
function CodeSheet({
  url,
  open,
  onClose,
  title,
  hint,
}: {
  url: string;
  open: boolean;
  onClose: () => void;
  title: string;
  hint: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="mb-3 font-sans text-sm text-muted">{hint}</p>
      <Qr value={url} />
      <div className="mt-3 flex justify-center">
        <Button
          variant="ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? 'Copied' : 'Copy instead'}
        </Button>
      </div>
      <p className="mt-3 font-sans text-xs text-muted">
        This one is yours. Don’t send it to anyone.
      </p>
    </Sheet>
  );
}

/**
 * One server. `detail` is the whole difference between the two readers: she
 * gets "awake", he gets the uptime, the protocols and how long ago it spoke.
 * A percentage means nothing to someone who cannot act on it.
 */
function ServerRow({ s, detail }: { s: VpnServer; detail: boolean }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          s.alive ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-sm text-fg">
          {flag(s.country)} {s.label}
          {detail && (
            <span className="ml-2 text-xs text-muted">
              {ROLE_LABELS[s.role]}
            </span>
          )}
        </span>
        <span className="block truncate font-sans text-xs text-muted">
          {detail
            ? `${lastSeen(s.last_beat)}${
                s.protocols.length
                  ? ` - ${s.protocols.map((p) => PROTOCOL_LABELS[p] ?? p).join(' - ')}`
                  : ''
              }${s.clients != null ? ` - ${s.clients} conn` : ''}`
            : s.alive
              ? 'Awake'
              : 'Not answering'}
        </span>
      </span>
      {detail && (
        <span className="shrink-0 font-sans text-xs tabular-nums text-muted">
          {uptimeText(s.uptime_24h)} / {uptimeText(s.uptime_7d)}
        </span>
      )}
    </li>
  );
}

/**
 * Her internet.
 *
 * The first draft of this page was a dashboard: uptime percentages, protocol
 * names, last-heartbeat times, two columns of numbers. All true, all useless
 * to the person it is for - she does not want to audit a fleet, she wants to
 * know whether Instagram is going to load.
 *
 * So the page answers exactly one question in the largest type on it, and
 * everything else is either the next thing to tap or hidden behind "not
 * working?". The numbers still exist; they moved to the bottom, behind
 * `is_admin`, where the person who can act on them will look.
 */
export function VpnRoute() {
  const { self } = usePartner();
  const { data: where, isLoading: whereLoading, isFetching } = useWhereAmI();
  const { data: me } = useMyVpnClient();
  const { data: servers } = useVpnStatus();
  const qc = useQueryClient();
  const [sheet, setSheet] = useState<'main' | 'spare' | null>(null);
  const [help, setHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const on = where?.on_tunnel === true;

  // Switching the VPN on happens in ANOTHER app, so she comes back to a page
  // that answered before anything changed. Without a way to ask again, the
  // only fix is closing and reopening Katitos - which is how you teach someone
  // that your status display cannot be trusted.
  const recheck = () => qc.invalidateQueries({ queryKey: qk.vpn.all() });

  const copyLink = async () => {
    if (!me?.sub_url) return;
    await navigator.clipboard.writeText(me.sub_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      {/* One answer, big. Everything else on this page is smaller than this. */}
      <section className="flex items-start gap-3 py-2">
        <div className="min-w-0 flex-1">
          {whereLoading ? (
            <Spinner />
          ) : on ? (
            <>
              <h1 className="font-display text-4xl leading-tight text-fg">
                You’re protected
              </h1>
              <p className="mt-1 font-sans text-base text-muted">
                Everything is going through {where?.city ?? where?.label}{' '}
                {flag(where?.country)} - watch what you like.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-4xl leading-tight text-muted">
                Not on yet
              </h1>
              <p className="mt-1 font-sans text-base text-muted">
                Switch the VPN on, then tap refresh.
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={recheck}
          aria-label="Check again"
          className="lift-press mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
        >
          <RotateCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </section>

      {/* Then the servers - for her, awake or not, and nothing else. */}
      {servers && servers.length > 0 && (
        <ul className="mt-5 divide-y divide-line">
          {servers.map((sv) => (
            <ServerRow key={sv.id} s={sv} detail={!!self?.is_admin} />
          ))}
        </ul>
      )}

      <Button className="mt-5 w-full" onClick={() => setHelp(true)}>
        Show tutorial
      </Button>

      {me?.sub_url && (
        <CodeSheet
          url={me.sub_url}
          open={sheet === 'main'}
          onClose={() => setSheet(null)}
          title="Your code"
          hint="Open Karing, tap +, point the camera here."
        />
      )}
      {me?.alt_url && (
        <CodeSheet
          url={me.alt_url}
          open={sheet === 'spare'}
          onClose={() => setSheet(null)}
          title="The other code"
          hint="Add this one the same way, then switch to it in the app."
        />
      )}

      {/* Everything she might need, in the order she needs it, and out of the
          way until she asks. The steps are here rather than on the page because
          after the first day the only question left is "is it on?" - and that
          is already answered in the biggest type on the screen. */}
      <Sheet open={help} onClose={() => setHelp(false)} title="How this works">
        <ol className="space-y-4">
          <li className="flex items-start gap-3">
            <span className="font-display text-2xl leading-none text-gold">
              1
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-sm font-semibold text-fg">
                Get the app
              </span>
              <span className="block font-sans text-xs text-muted">
                Free. Works on your phone, your tablet and your computer, and
                the profile below is the same on all of them.
              </span>
              <span className="mt-1.5 flex items-center gap-3">
                <AppStoreButton />
                <OtherPlatformsLink />
              </span>
            </span>
          </li>

          <li className="flex items-start gap-3">
            <span className="font-display text-2xl leading-none text-gold">
              2
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-sm font-semibold text-fg">
                Put your profile in it
              </span>
              {/* Copy first, scan second. On the phone she is reading this on,
                  a camera cannot photograph its own screen. */}
              <span className="block font-sans text-xs text-muted">
                Copy, then in Karing tap <span className="text-fg">+</span> →{' '}
                <span className="text-fg">Import From Clipboard</span>. On
                another device, scan the code instead.
              </span>
              {me?.sub_url && (
                <span className="mt-1.5 flex gap-2">
                  <Button onClick={copyLink}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? 'Copied' : 'Copy my profile'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setHelp(false);
                      setSheet('main');
                    }}
                  >
                    <QrCode className="h-4 w-4" /> QR
                  </Button>
                </span>
              )}
            </span>
          </li>

          <li className="flex items-start gap-3">
            <span className="font-display text-2xl leading-none text-gold">
              3
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-sm font-semibold text-fg">
                Switch it on, and leave the app open
              </span>
              {/* Split by device because the failure mode is not the same.
                  On iOS the system keeps reporting "Connected" long after the
                  app has been swiped away and the tunnel is already dead, which
                  is the confusing one. On Windows it just stops, honestly. */}
              <span className="block font-sans text-xs text-muted">
                Turn it on inside Karing, once, on each device.
              </span>
              <span className="mt-1 block font-sans text-xs text-muted">
                <span className="text-fg">iPhone and iPad:</span> after that you
                can turn it on and off from Settings, VPN. Leave Karing running
                in the background, and don’t swipe it away, or everything stops
                while your phone still says you’re connected.
              </span>
              <span className="mt-1 block font-sans text-xs text-muted">
                <span className="text-fg">Computer:</span> keep Karing open. You
                can minimise it, it sits next to the clock.
              </span>
            </span>
          </li>
        </ol>

        <div className="mt-5 space-y-4 font-sans text-sm text-fg">
          <p className="font-display text-xl">If something breaks</p>
          <div>
            <p className="font-semibold">It won’t connect</p>
            <p className="mt-1 text-muted">
              You have a second profile. Add it the same way and use that
              instead - it works differently, so it often works when the first
              one doesn’t.
            </p>
            {me?.alt_url && (
              <Button
                variant="ghost"
                className="mt-1"
                onClick={() => {
                  setHelp(false);
                  setSheet('spare');
                }}
              >
                Show my second profile
              </Button>
            )}
          </div>
          <div>
            {/* Said without the word "whitelist", which would explain nothing
                to her, and without blaming a server that is fine. */}
            <p className="font-semibold">Nothing loads at all</p>
            <p className="mt-1 text-muted">
              If it’s on and still nothing opens, it’s usually your phone
              company blocking things, not this. Try wifi instead of mobile
              data.
            </p>
          </div>
          <div>
            <p className="font-semibold">Still stuck</p>
            <p className="mt-1 text-muted">
              Tell me and I’ll fix it. Don’t send these codes to anyone else -
              they’re yours.
            </p>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
