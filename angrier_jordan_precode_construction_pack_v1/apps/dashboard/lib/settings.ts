import { AuditService } from '../../../packages/core/src/audit';
import { ConfigService } from '../../../packages/core/src/config-service';
import { getPrismaClient } from '../../../packages/database/src/client';
import { PrismaAuditSink, PrismaConfigRepository } from '../../../packages/database/src/prisma-adapters';
import { SETTINGS } from '../../../packages/contracts/src/generated/settings';
import generated from './generated/settings-controls.json';
import type { DashboardControl } from './config-control-types';

export const controls = generated.controls as DashboardControl[];
function settingsService(){const db=getPrismaClient();return new ConfigService(SETTINGS, new PrismaConfigRepository(db), new AuditService(new PrismaAuditSink(db)));}
export async function readSettings(guildId: string) {
  const config = settingsService();
  return Promise.all(controls.map(async control => ({ ...control, ...await config.getWithMetadata(guildId, control.key) })));
}
export async function readDashboardHomeSummary(guildId:string){
  const config=settingsService(),featureControls=controls.filter(control=>control.key.startsWith('features.'));
  const features=await Promise.all(featureControls.map(control=>config.getWithMetadata(guildId,control.key)));
  return {enabledFeatures:features.filter(feature=>feature.value===true).length,reviewed:controls.filter(control=>control.risk!=='normal'||control.dashboardWrite!=='live').length,restarts:controls.filter(control=>control.restartRequired).length};
}
