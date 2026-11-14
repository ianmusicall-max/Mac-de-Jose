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
 };
 const safe=name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100)||'videovault';
 const extension=extensions[type];
 if(!extension)return safe;
 const stem=safe.replace(/\.[^.]*$/,'').replace(/^\.+/,'')||'videovault';
 return `${stem}.${extension}`;
}
