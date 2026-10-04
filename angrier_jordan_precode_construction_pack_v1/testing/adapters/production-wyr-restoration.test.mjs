import test from 'node:test';
import assert from 'node:assert/strict';
import {importRestoration,restorationRows} from '../../scripts/seed-production-wyr-restoration.mjs';

test('restoration source is exactly the missing contiguous 460-ID range',()=>{const rows=restorationRows();assert.equal(rows.length,460);assert.equal(rows[0].id,'WYR-0001');assert.equal(rows.at(-1).id,'WYR-0460');assert.ok(rows.every(row=>row.game==='would_you_rather'&&row.enabled));});
test('import skips existing IDs and reports the final enabled WYR count',async()=>{const calls=[],db={$transaction:fn=>fn({contentEntry:{findMany:async query=>{calls.push(query);return query.where.game==='wyr'&&query.select.enabled?[{id:'WYR-0001',enabled:true},{id:'WYR-0461',enabled:true}]:[{id:'WYR-0001'}];},createMany:async query=>{calls.push(query);return{count:459};}}})};const result=await importRestoration(db,restorationRows());assert.deepEqual(result,{alreadyPresent:1,inserted:459,total:2,enabled:2});assert.equal(calls[1].skipDuplicates,true);assert.equal(calls[1].data.length,460);});
