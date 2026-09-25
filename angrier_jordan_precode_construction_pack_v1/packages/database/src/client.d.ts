import { PrismaClient } from '@prisma/client';
export declare const getPrismaClient: () => PrismaClient;
export declare const disconnectPrisma: () => Promise<void>;
