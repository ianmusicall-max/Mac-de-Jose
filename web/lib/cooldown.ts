import {sourceKey} from './archive.ts';
export type Cooldown={origin:string;until:number};
export function cooldownOrigin(raw:string):string {
  try{return new URL(sourceKey(raw.trim())).origin;}catch{return '';}
}
export function readCooldown(raw:string|null,now=Date.now()):Cooldown|null {
  try {
    const value=JSON.parse(raw||'null') as Cooldown|null;
    return value&&typeof value.origin==='string'&&Number.isFinite(value.until)&&value.until>now?value:null;
  } catch{return null;}
}
