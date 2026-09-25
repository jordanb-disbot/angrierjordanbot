import test from 'node:test';
import assert from 'node:assert/strict';
import {fmkSummary} from '../../.test-build/packages/features-profiles/src/domain.js';
test('FMK profile projection separates subject counters from chooser agreement without inventing wins',()=>{const result=fmkSummary([{gameKey:'fmk',plays:4,metadata:{agreementRounds:2,averageAgreement:75,highestAgreement:100,lowestAgreement:50}},{gameKey:'fmk_subject',plays:8,metadata:{fucked:2,married:5,killed:1}}]);assert.deepEqual(result,{played:4,fucked:2,married:5,killed:1,agreementRounds:2,averageAgreement:75,highestAgreement:100,lowestAgreement:50});assert.equal(fmkSummary([]).agreementRounds,0);assert.equal(fmkSummary([{gameKey:'fmk',plays:1,metadata:{averageAgreement:NaN}}]).averageAgreement,0);});
