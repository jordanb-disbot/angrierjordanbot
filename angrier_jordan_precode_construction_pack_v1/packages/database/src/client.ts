import { PrismaClient } from '@prisma/client';
let client:PrismaClient|undefined;
export const getPrismaClient=():PrismaClient=>client??(client=new PrismaClient());
export const disconnectPrisma=async():Promise<void>=>{if(client){await client.$disconnect();client=undefined;}};
