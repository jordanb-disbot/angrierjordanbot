import { AuditService } from '../../../packages/core/src/audit';
import { ConfigService } from '../../../packages/core/src/config-service';
import { getPrismaClient } from '../../../packages/database/src/client';
import { PrismaAuditSink, PrismaConfigRepository } from '../../../packages/database/src/prisma-adapters';
import { SETTINGS } from '../../../packages/contracts/src/generated/settings';
import generated from './generated/settings-controls.json';
import type { DashboardControl } from './config-control-types';

export const controls = generated.controls as DashboardControl[];
export async function readSettings(guildId: string) {
  const db = getPrismaClient();
  const config = new ConfigService(SETTINGS, new PrismaConfigRepository(db), new AuditService(new PrismaAuditSink(db)));
  return Promise.all(controls.map(async control => ({ ...control, ...await config.getWithMetadata(guildId, control.key) })));
}
