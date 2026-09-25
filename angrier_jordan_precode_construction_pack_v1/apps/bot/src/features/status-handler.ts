import type { HealthService } from '../../../../packages/core/src/index.js';
import type { CommandHandler } from '../architecture/handler-contract.js';
export const createStatusHandler=(health:HealthService):CommandHandler=>async()=>{
  const snapshot=await health.check();
  const rows=snapshot.checks.map(c=>`${c.status==='ok'?'✓':'!'} ${c.name}${c.latencyMs===undefined?'':` ${c.latencyMs}ms`}`).join('\n');
  return {ephemeral:true,content:`Angrier Jordan status: ${snapshot.status.toUpperCase()}${rows?`\n${rows}`:''}`,components:[]};
};
