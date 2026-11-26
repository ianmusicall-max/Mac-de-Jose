'use client';
import type { Tool } from '@/lib/tools';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, Film, ImageIcon, Link2, LoaderCircle, Music2, Clock3 } from 'lucide-react';
import type { Media } from '@/lib/media';
import { mediaOptions, selectionMessage } from '@/lib/media-selection';
import { AlbumDownloadButton } from '@/components/image-download';
import { ResultCard } from '@/components/result-card';
import { cooldownOrigin as originOf, readCooldown } from '@/lib/cooldown';
import { sourceKey } from '@/lib/archive';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';

const KIND_ICON = { video: Film, audio: Music2, image: ImageIcon } as const;
const KINDS = ['video', 'audio', 'image'] as const;
const HISTORY_KEY = 'snapreel-links';
const HISTORY_SIZE = 6;

type ResolveResponse = {
  error?: string;
  items: Media[];
  title: string;
  retryAfter?: number;
  pending?: boolean;
  warning?: string;
  fromArchive?: boolean;
  albumWarning?: string;
};

function readHistory(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((entry): entry is string => typeof entry === 'string').slice(0, HISTORY_SIZE);
  } catch {
    return [];
  }
}

export function Downloader({
  defaultKind = 'video',
  placeholder,
  platform,
  formats = KINDS,
}: {
  defaultKind?: Media['kind'];
  placeholder: string;
  platform?: Tool['platform'];
  formats?: Tool['formats'];
}) {
  const { locale } = useLocale();
  const t = strings[locale].downloader;
  const selectionText = strings[locale].selection;

  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState<Media['kind']>(defaultKind);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<Media[]>([]);
  const [title, setTitle] = useState('');
  const [sourceWarning, setSourceWarning] = useState('');
  const [albumWarning, setAlbumWarning] = useState('');
  const [fromArchive, setFromArchive] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [cooldown, setCooldown] = useState<{ origin: string; until: number } | null>(null);
  const [now, setNow] = useState(0);
  const [resultSource, setResultSource] = useState('');

  // localStorage has no server-side value, so the list can only be read once the
  // component is mounted.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(readHistory());
    try {
      setCooldown(readCooldown(localStorage.getItem('snapreel-cooldown')));
      setNow(Date.now());
    } catch { /* Storage may be disabled. */ }
  }, []);

  // Tick once a second only while an origin is actually holding us off.
  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldown.until) setCooldown(null);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const waiting =
    cooldown?.origin === originOf(url) ? Math.max(0, Math.ceil((cooldown.until - now) / 1000)) : 0;
  const options = mediaOptions(items);
  const visible = options.filter(item => item.kind === selected);
  const notice =
    searched && !busy && !error
      ? selected === 'video' && sourceWarning && !visible.length
        ? sourceWarning
        : selectionMessage(items, selected, selectionText)
      : null;

  function remember(link: string) {
    const next = [link, ...history.filter(entry => entry !== link)].slice(0, HISTORY_SIZE);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* A browser with storage disabled simply keeps no history. */
    }
  }

  async function detect(event: FormEvent, refresh = false) {
    event.preventDefault();
    if (busy) return;
    const link = url.trim();

    setBusy(true);
    setError('');
    let sameSource = false;
    try { sameSource = sourceKey(link) === resultSource; } catch { /* Invalid input is handled by the API. */ }
    if (!sameSource) {
      setItems([]);
      setTitle('');
      setSearched(false);
      setSourceWarning('');
      setFromArchive(false);
      setAlbumWarning('');
    }

    try {
      const request = () => fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link, refresh, kind: selected, platform }),
      });
      const deadline = Date.now() + 120_000;
      let response = await request();
      let data = (await response.json()) as ResolveResponse;
      while (response.status === 202 && data.pending && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 4000));
        response = await request();
        data = (await response.json()) as ResolveResponse;
      }
      if (data.pending) throw new Error(t.pending);

      if (data.retryAfter || response.status === 429) {
        const current = Date.now();
        const nextCooldown = { origin: originOf(link), until: current + (data.retryAfter || 60) * 1000 };
        setNow(current);
        setCooldown(nextCooldown);
        try { localStorage.setItem('snapreel-cooldown', JSON.stringify(nextCooldown)); }
        catch { /* The in-memory wait remains available. */ }
      }
      if (!response.ok) throw new Error(data.error || t.parseError);
      setResultSource(sourceKey(link));

      setItems(data.items);
      setTitle(data.title);
      setAlbumWarning(data.albumWarning || '');
      setSourceWarning(data.warning || '');
      setFromArchive(!!data.fromArchive);
      setSearched(true);
      remember(link);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.connectError);
    } finally {
      setBusy(false);
    }
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* Nothing to clear when storage is unavailable. */
    }
  }

  return (
    <>
      <form onSubmit={detect} className="input-panel">
        <label htmlFor="url">{t.urlLabel}</label>

        <div className="input-row">
          <Link2 size={20} />
          <input
            id="url"
            type="url"
            required
            placeholder={placeholder}
            value={url}
            onChange={event => setUrl(event.target.value)}
            disabled={busy}
          />
          <button disabled={busy} type="submit">
            {busy ? (
              <>
                <LoaderCircle className="spin" size={18} /> {t.searching}
              </>
            ) : (
              <>
                {t.search(t.kindLabel[selected])} <ArrowUpRight size={18} />
              </>
            )}
          </button>
        </div>

        {formats.length > 1 && (
          <fieldset className="formats format-options">
            <legend>{t.formatLegend}</legend>
            {formats.map(option => {
              const Icon = KIND_ICON[option];
              return (
                <label
                  key={option}
                  className={selected === option ? 'format-choice selected' : 'format-choice'}
                >
                  <input
                    type="radio"
                    name="format"
                    value={option}
                    checked={selected === option}
                    onChange={() => setSelected(option)}
                  />
                  <Icon size={15} />
                  {t.kindSingular[option]}
                  {searched && (
                    <span className="format-count">
                      {options.filter(item => item.kind === option).length}
                    </span>
                  )}
                </label>
              );
            })}
          </fieldset>
        )}

        {(formats.length > 1 || waiting > 0) && (
          <small className="format-help">
            {waiting > 0 ? t.waitingHelp(waiting) : t.switchFormatHelp}
          </small>
        )}
      </form>

      {selected === 'image' && searched && (
        <div className="image-toolbar">
          <button type="button" className="text-button" disabled={busy} onClick={event => detect(event, true)}>
            {platform === 'facebook' ? t.refreshImages : t.refreshAlbum}
          </button>
          {visible.length > 1 && <AlbumDownloadButton items={visible} />}
        </div>
      )}

      <div aria-live="polite" aria-busy={busy}>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {fromArchive && (
          <p className="notice" role="status">
            {t.fromArchive}
          </p>
        )}
        {selected === 'image' && albumWarning && (
          <p className="notice" role="status">
            {albumWarning}
          </p>
        )}
        {sourceWarning && visible.length > 0 && (selected !== 'image' || sourceWarning !== albumWarning) && (
          <p className="notice" role="status">{sourceWarning}</p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}

        {visible.length > 0 && (
          <section className="results">
            <div className="section-heading">
              <h2>{t.available(t.kindTitle[selected])}</h2>
              <span>{t.found(visible.length)}</span>
            </div>
            <p className="result-title">{title}</p>
            {visible.map((item, index) => (
              <ResultCard
                key={`${item.albumIndex || 0}:${item.kind}:${item.url}`}
                item={item}
                position={index + 1}
                offerAudio={Boolean(platform)}
                poster={items.find(
                  candidate =>
                    candidate.kind === 'image' &&
                    candidate.isPreview &&
                    candidate.albumIndex === item.albumIndex,
                )}
              />
            ))}
          </section>
        )}
      </div>

      {history.length > 0 && (
        <section className="recent">
          <div className="section-heading">
            <h2>
              <Clock3 size={17} /> {t.recentLinks}
            </h2>
            <button className="text-button" onClick={clearHistory}>
              {t.clearHistory}
            </button>
          </div>
          {history.map(link => (
            <button key={link} className="recent-link" onClick={() => setUrl(link)}>
              <Link2 size={15} />
              <span>{link}</span>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </section>
      )}
    </>
  );
}
