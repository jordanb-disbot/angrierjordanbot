import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
const file=new URL('../.env.test.local',import.meta.url);
const value=fs.existsSync(file)?parseEnv(fs.readFileSync(file,'utf8')).TEST_DATABASE_URL:undefined;
if(!value||value.includes('${')){console.error('TEST_DATABASE_URL in .env.test.local must be a resolved disposable PostgreSQL URL. No other database setting is used.');process.exit(1);}
let parsed;try{parsed=new URL(value);if(!['postgres:','postgresql:'].includes(parsed.protocol))throw new Error();}catch{console.error('The dedicated test database URL is malformed; its value is not displayed.');process.exit(1);}
const redact=text=>{for(const secret of [value,parsed.href,parsed.password,decodeURIComponent(parsed.password)].filter(Boolean))text=text.replaceAll(secret,'[redacted]');return text.replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi,'[redacted PostgreSQL URL]');};
const suites=process.argv.slice(2);
if(suites.some(s=>!['items','profiles','jobs','casino','events','fight','special','solo','dashboard','pvp','wallet-holds','item-escrow','party','channel-games','crime','community','family','chairisms','introductions','learning','social','music','server-bootstrap'].includes(s))){console.error('Unknown PostgreSQL test suite.');process.exit(1);}
const files=(suites.length?suites:['items','profiles','jobs','casino','events','fight','special','solo','dashboard','pvp','wallet-holds','item-escrow','party','channel-games','crime','community','family','chairisms','introductions','learning','social','music','server-bootstrap']).map(s=>'testing/postgres/'+s+'.test.mjs');
const result=spawnSync(process.execPath,['--test','--test-concurrency=1',...files],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:2700000,maxBuffer:8*1024*1024});
if(result.stdout)process.stdout.write(redact(result.stdout));if(result.stderr)process.stderr.write(redact(result.stderr));
if(result.error)console.error('PostgreSQL acceptance process failed or timed out; no secret values displayed.');
process.exit(result.status??1);
