// PrismaClient wiring belongs here so bot/dashboard do not construct independent clients.
export interface DatabaseHealth { ok:boolean; latencyMs?:number; error?:string; }
export const DATABASE_SCHEMA_VERSION='0008_economy_foundation';
export * from './prisma-adapters.js';
