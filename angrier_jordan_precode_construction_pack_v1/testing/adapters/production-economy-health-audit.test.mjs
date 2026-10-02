import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeEconomyHealth} from '../../scripts/audit-production-economy-health.mjs';

test('economy health summary reports supply, concentration, and balanced system flow',()=>{
 const report=summarizeEconomyHealth([
  {wallet:10n,bank:0n},{wallet:20n,bank:30n},{wallet:100n,bank:0n},{wallet:0n,bank:10n},{wallet:10n,bank:10n},
 ],[{amount:-200n},{amount:50n},{amount:-25n}]);
 assert.deepEqual(report,{members:5,supply:190n,median:20n,p90:100n,topFive:190n,topFiveShareBasisPoints:10000,minted:225n,burned:50n,netMinted:175n});
});

test('economy health summary handles an empty economy',()=>{
 const report=summarizeEconomyHealth([],[]);assert.equal(report.supply,0n);assert.equal(report.topFiveShareBasisPoints,0);assert.equal(report.netMinted,0n);
});
