import {imageExtension} from './image-file.ts';

// CDN paths often have no extension (or a misleading .bin extension).
// Use the response format for both fresh downloads and older archived files.
export function downloadName(name:string,contentType:string):string {
 const type=contentType.split(';')[0].trim().toLowerCase();
 const extensions:Record<string,string>={
  'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov',
  'video/x-m4v':'m4v','video/ogg':'ogv','video/mpeg':'mpeg',
  'video/mp2t':'ts','video/x-msvideo':'avi','video/x-matroska':'mkv',
  'video/3gpp':'3gp','video/3gpp2':'3g2',
  'audio/mp4':'m4a','audio/mpeg':'mp3','audio/ogg':'ogg',
  'audio/webm':'webm','audio/aac':'aac','audio/wav':'wav','audio/flac':'flac',
  'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/avif':'avif','image/heic':'heic','application/zip':'zip',
 };
 const safe=name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100)||'snapreel';
 const extension=extensions[type];
 if(!extension)return safe;
 const stem=safe.replace(/\.[^.]*$/,'').replace(/^\.+/,'')||'snapreel';
 return `${stem}.${extension}`;
}

/** Read the origin's UTF-8 filename first, then its legacy filename. */
export function dispositionFilename(header: string | null): string | undefined {
 const encoded = /(?:^|;)\s*filename\*\s*=\s*UTF-8'[^']*'([^;]+)/i.exec(header ?? '')?.[1];
 if (encoded) {
  try { return decodeURIComponent(encoded.trim()); } catch { /* Try the legacy name. */ }
 }
 const plain = /(?:^|;)\s*filename\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;]+))/i.exec(header ?? '');
 return (plain?.[1]?.replace(/\\(.)/g, '$1') ?? plain?.[2])?.trim() || undefined;
}

export function readableFilename(name?: string | null): string | undefined {
 const value = name?.trim();
 if (!value) return;
 const stem = value.replace(/\.[a-z0-9]{2,5}$/i, '');
 if (/^(?:(?:snapreel|tiktok|youtube|instagram|facebook|video|audio|image|imagen|photo|archivo)(?:[-_ ]*\d+|[-_ ]*(?:audio|imagen|album|video)(?:[-_ ]*\d+)?)?|[\da-f-]{12,}|[\d_-]+)$/i.test(stem)) return;
 if (/^[\w-]{20,}$/.test(stem) && /\d/.test(stem) && /[a-z]/i.test(stem)) return;
 return value;
}

export function namedDownload(name: string, type: string): string {
 const clean = name.toWellFormed().normalize('NFC').replace(/[<>:"/\\|?*]/g, '_')
  .replace(/\p{Cc}/gu, ' ')
  .replace(/^[.\s]+|[.\s]+$/g, '');
 const stem = clean.replace(/\.(?:bin|mp4|webm|mov|m4v|ogv|mpeg|ts|avi|mkv|3gp|3g2|m4a|mp3|ogg|aac|wav|flac|jpg|jpeg|png|gif|webp|avif|heic|svg|img|zip)$/i, '');
 const shortened = Array.from(stem.replace(/\s+/g, ' ')).slice(0, 100).join('').trim() || 'SnapReel';
 const mime = type.split(';')[0].trim().toLowerCase();
 const extension = mime.startsWith('image/') ? imageExtension(mime) : downloadName('file', mime).split('.')[1];
 return extension ? `${shortened}.${extension}` : shortened;
}

export function attachment(name: string): string {
 const ascii = name.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-zA-Z0-9 ._-]/g, '_');
 const encoded = encodeURIComponent(name).replace(/['()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase());
 return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
