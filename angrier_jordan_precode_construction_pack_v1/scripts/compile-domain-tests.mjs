import { rmSync,cpSync,mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
rmSync(new URL('../.test-build', import.meta.url), { recursive:true, force:true });
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const result=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'-p','tsconfig.runtime-tests.json'],{cwd:new URL('..',import.meta.url),stdio:'inherit',shell:false});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);

mkdirSync(new URL('../.test-build/content/fight/',import.meta.url),{recursive:true});
cpSync(new URL('../content/fight/',import.meta.url),new URL('../.test-build/content/fight/',import.meta.url),{recursive:true});
