import fs from 'node:fs';import path from 'node:path';
// File metadata only: never reads or exposes passwords or environment values.
export function settingsChangedAfterStart(file=path.join(process.cwd(),'.env.local'),startedAt=Date.now()-process.uptime()*1000){try{return fs.statSync(file).mtimeMs>startedAt+1000;}catch{return false;}}
