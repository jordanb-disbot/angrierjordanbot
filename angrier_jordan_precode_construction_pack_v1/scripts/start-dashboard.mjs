import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {validateRuntimeEnvironment} from '../dist/packages/core/src/runtime-environment.js';
const require=createRequire(import.meta.url);
try{validateRuntimeEnvironment(process.env,'dashboard');}
catch(error){console.error(error.message);process.exit(1);}
// The application is not publicly enabled until Phase 24 authentication/authorization passes.
if(process.env.AJ_DASHBOARD_ACCEPTED!=='true'){console.error('Dashboard release is blocked until dashboard acceptance.');process.exit(1);}
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','apps/dashboard','--hostname','0.0.0.0','--port',process.env.PORT??'8080'],{stdio:'inherit',shell:false});
let timer;
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{child.kill(signal);timer??=setTimeout(()=>child.kill('SIGKILL'),25000);});
child.once('error',()=>{console.error('Dashboard failed to start.');process.exitCode=1;});
child.once('exit',(code,signal)=>{if(timer)clearTimeout(timer);process.exitCode=code??(signal==='SIGTERM'||signal==='SIGINT'?0:1);});
