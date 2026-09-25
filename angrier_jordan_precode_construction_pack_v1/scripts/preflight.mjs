import {spawnSync} from 'node:child_process';
for(const s of ['validate:registries','validate:content','validate:assets','validate:golden','test:domain']){const r=spawnSync('npm',['run',s],{stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)process.exit(r.status??1);}console.log('PRE-FLIGHT PASS');
