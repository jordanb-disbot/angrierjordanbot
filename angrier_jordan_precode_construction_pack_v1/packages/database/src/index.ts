// PrismaClient wiring belongs here so bot/dashboard do not construct independent clients.
export interface DatabaseHealth { ok:boolean; latencyMs?:number; error?:string; }
export const DATABASE_SCHEMA_VERSION='0009_item_transactions';
export * from './prisma-adapters.js';
export * from './prisma-server-bootstrap.js';
