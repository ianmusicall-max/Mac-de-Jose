'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, Film, ImageIcon, Link2, LoaderCircle, Music2, Clock3 } from 'lucide-react';
import type { Media } from '@/lib/media';
import { mediaOptions, selectionMessage } from '@/lib/media-selection';
import { AlbumDownloadButton } from '@/components/image-download';
import { ResultCard } from '@/components/result-card';

const KIND_LABEL = { video: 'vídeo', audio: 'audio', image: 'imagen' } as const;
const KIND_TITLE = { video: 'Vídeos', audio: 'Audios', image: 'Imágenes' } as const;
const KIND_ICON = { video: Film, audio: Music2, image: ImageIcon } as const;
const KINDS = ['video', 'audio', 'image'] as const;
const HISTORY_KEY = 'videovault-links';
const HISTORY_SIZE = 6;

type ResolveResponse = {
  error?: string;
  items: Media[];
  title: string;
  retryAfter?: number;
  warning?: string;
  fromArchive?: boolean;
  albumWarning?: string;
};

function originOf(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

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
}: {
  defaultKind?: Media['kind'];
  placeholder: string;
}) {
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

  // localStorage has no server-side value, so the list can only be read once the
  // component is mounted.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHistory(readHistory()), []);

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
        : selectionMessage(items, selected)
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
    setItems([]);
    setTitle('');
    setSearched(false);
    setSourceWarning('');
    setFromArchive(false);
    setAlbumWarning('');

    try {
      const response = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link, refresh, kind: selected }),
      });
      const data = (await response.json()) as ResolveResponse;

      if (!response.ok) {
        if (response.status === 429) {
          const current = Date.now();
          setNow(current);
          setCooldown({ origin: originOf(url), until: current + (data.retryAfter || 60) * 1000 });
        }
        throw new Error(data.error);
      }

      setItems(data.items);
      setTitle(data.title);
      setAlbumWarning(data.albumWarning || '');
      setSourceWarning(data.warning || '');
      setFromArchive(!!data.fromArchive);
      setSearched(true);
      remember(link);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar. Inténtalo de nuevo.');
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
        <label htmlFor="url">Pega el enlace de la publicación</label>

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
            {waiting > 0 ? (
              'Buscar guardado'
            ) : busy ? (
              <>
                <LoaderCircle className="spin" size={18} /> Buscando…
              </>
            ) : (
              <>
                Buscar {KIND_LABEL[selected]} <ArrowUpRight size={18} />
              </>
            )}
          </button>
        </div>

        <fieldset className="formats format-options">
          <legend>Formato de descarga</legend>
          {KINDS.map(option => {
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
                {KIND_TITLE[option].slice(0, -1)}
                {searched && (
                  <span className="format-count">
                    {options.filter(item => item.kind === option).length}
                  </span>
                )}
              </label>
            );
          })}
        </fieldset>

        <small className="format-help">
          {waiting > 0
            ? `El origen está en espera (${waiting}s). Los archivos guardados siguen disponibles.`
            : 'Cambiar de formato muestra los resultados de la misma búsqueda.'}
        </small>
      </form>

      {selected === 'image' && searched && (
        <div className="image-toolbar">
          <button type="button" className="text-button" disabled={busy} onClick={event => detect(event, true)}>
            Actualizar álbum
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
            Se recuperó el álbum guardado. Las descargas ya conservadas están disponibles sin
            consultar el origen.
          </p>
        )}
        {selected === 'image' && albumWarning && (
          <p className="notice" role="status">
            {albumWarning}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}

        {visible.length > 0 && (
          <section className="results">
            <div className="section-heading">
              <h2>{KIND_TITLE[selected]} disponibles</h2>
              <span>{visible.length} encontrados</span>
            </div>
            <p className="result-title">{title}</p>
            {visible.map((item, index) => (
              <ResultCard
                key={`${item.albumIndex || 0}:${item.kind}:${item.url}`}
                item={item}
                position={index + 1}
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
              <Clock3 size={17} /> Enlaces recientes
            </h2>
            <button className="text-button" onClick={clearHistory}>
              Borrar historial
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
