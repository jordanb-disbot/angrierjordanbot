import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir=new URL('../docs/approved_visuals/locked-2026-09-25/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8'));
for(const entry of manifest.files){if(createHash('sha256').update(fs.readFileSync(new URL(entry.file,dir))).digest('hex')!==entry.sha256)throw new Error('Approved visual reference changed: '+entry.file);}
const theme=JSON.parse(fs.readFileSync(new URL('../production/theme/brand.json',import.meta.url),'utf8'));
if(theme.typography.heading!=='Space Grotesk'||theme.typography.body!=='Inter')throw new Error('Approved typography changed');
console.log('Approved visual reference lock PASS: '+manifest.files.length+' immutable files.');
const gateB=JSON.parse(fs.readFileSync(new URL('../docs/approved_visuals/gate-b-2026-09-25.json',import.meta.url),'utf8'));
if(gateB.status!=='PASSED')throw new Error('Gate B approval status changed');
for(const entry of gateB.files){if(createHash('sha256').update(fs.readFileSync(new URL('../'+entry.file,import.meta.url))).digest('hex')!==entry.sha256)throw new Error('Approved Gate B visual changed: '+entry.file);}
console.log('Approved Gate B visual lock PASS: '+gateB.files.length+' fixture images.');

const music=JSON.parse(fs.readFileSync(new URL('../docs/approved_visuals/music-2026-09-26.json',import.meta.url),'utf8'));
if(music.status!=='VISUAL_APPROVED')throw new Error('Music visual approval status changed');
for(const entry of music.files){if(createHash('sha256').update(fs.readFileSync(new URL('../'+entry.file,import.meta.url))).digest('hex')!==entry.sha256)throw new Error('Approved Music visual changed: '+entry.file);}
console.log('Approved Music visual lock PASS: '+music.files.length+' files (46 images plus gallery/control metadata).');
