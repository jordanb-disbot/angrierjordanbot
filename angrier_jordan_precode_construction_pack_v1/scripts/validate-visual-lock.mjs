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

const motion=JSON.parse(fs.readFileSync(new URL('../docs/approved_visuals/smooth-events-2026-09-27.json',import.meta.url),'utf8'));
if(motion.status!=='VISUAL_APPROVED')throw new Error('Race/Line motion approval status changed');
for(const entry of motion.files){if(createHash('sha256').update(fs.readFileSync(new URL('../'+entry.file,import.meta.url))).digest('hex')!==entry.sha256)throw new Error('Approved Race/Line visual changed: '+entry.file);}
console.log('Approved Race/Line motion lock PASS: '+motion.files.length+' files.');

const profiles=JSON.parse(fs.readFileSync(new URL('../docs/approved_visuals/profiles-2026-09-27.json',import.meta.url),'utf8'));
if(profiles.status!=='VISUAL_APPROVED')throw new Error('Profile visual approval status changed');
for(const entry of profiles.files){if(createHash('sha256').update(fs.readFileSync(new URL('../'+entry.file,import.meta.url))).digest('hex')!==entry.sha256)throw new Error('Approved Profile visual changed: '+entry.file);}
console.log('Approved Profile visual lock PASS: '+profiles.files.length+' files.');

const chairisms=JSON.parse(fs.readFileSync(new URL('../docs/approved_visuals/chairisms-2026-09-27.json',import.meta.url),'utf8'));
if(chairisms.status!=='VISUAL_APPROVED')throw new Error('Chairisms visual approval status changed');
for(const entry of chairisms.files){if(createHash('sha256').update(fs.readFileSync(new URL('../'+entry.file,import.meta.url))).digest('hex')!==entry.sha256)throw new Error('Approved Chairisms visual changed: '+entry.file);}
console.log('Approved Chairisms visual lock PASS: '+chairisms.files.length+' files.');

const entry=JSON.parse(fs.readFileSync(new URL('../docs/approved_visuals/race-line-entry-2026-09-27.json',import.meta.url),'utf8'));
if(entry.status!=='VISUAL_APPROVED')throw new Error('Race/Line entry approval status changed');
for(const file of entry.files){if(createHash('sha256').update(fs.readFileSync(new URL('../'+file.file,import.meta.url))).digest('hex')!==file.sha256)throw new Error('Approved Race/Line entry changed: '+file.file);}
console.log('Approved Race/Line entry lock PASS: '+entry.files.length+' files.');
