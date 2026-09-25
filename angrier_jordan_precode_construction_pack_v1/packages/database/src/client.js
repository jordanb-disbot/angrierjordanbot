import { PrismaClient } from '@prisma/client';
let client;
export const getPrismaClient = () => client ?? (client = new PrismaClient());
export const disconnectPrisma = async () => { if (client) {
    await client.$disconnect();
    client = undefined;
} };
//# sourceMappingURL=client.js.map