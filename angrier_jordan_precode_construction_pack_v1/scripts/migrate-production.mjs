import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {validateRuntimeEnvironment} from '../dist/packages/core/src/runtime-environment.js';
try{
  validateRuntimeEnvironment(process.env,'migrate');
  const built=fs.readFileSync(new URL('../RELEASE_SHA',import.meta.url),'utf8').trim();
  if(built!==process.env.AJ_MIGRATION_RELEASE)throw new Error('Migration approval does not match this built release.');
  const require=createRequire(new URL('../packages/database/package.json',import.meta.url));
  const result=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{encoding:'utf8',timeout:300000,maxBuffer:4*1024*1024,shell:false});
  // Never forward Prisma output: connection details can appear even on successful commands.
  // Prisma error codes are safe to report and let deployment logs distinguish an
  // unreachable database, a failed prior migration, and other migration faults.
  if(result.error||result.status!==0){
    const code=`${result.stdout??''}\n${result.stderr??''}`.match(/\bP\d{4}\b/)?.[0];
    throw new Error(`Migration failed or timed out${code?` (Prisma ${code})`:''}. Deployment must remain blocked; inspect migration state privately.`);
  }
  console.log('Approved release migrations completed.');
}catch(error){console.error(error.message);process.exitCode=1;}
