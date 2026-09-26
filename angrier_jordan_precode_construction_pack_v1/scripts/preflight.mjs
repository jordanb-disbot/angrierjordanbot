import {spawnSync} from 'node:child_process';
const steps=['validate:registries','validate:command-shapes','validate:content','validate:assets','validate:visual-lock','validate:help','validate:fight-sources','validate:golden','validate:production-wiring','typecheck:domain','typecheck:workspace','test:domain','test:adapters'];
if(!process.env.npm_execpath) throw new Error('Run preflight through npm run preflight.');
for(const step of steps){
  const result=spawnSync(process.execPath,[process.env.npm_execpath,'run',step],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
console.log('PRE-FLIGHT PASS');
