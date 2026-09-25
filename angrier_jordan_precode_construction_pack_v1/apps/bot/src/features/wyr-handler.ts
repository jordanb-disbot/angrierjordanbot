import { DomainError } from '../../../../packages/core/src/index.js';
import type { WyrCategoryInput, WyrController } from '../../../../packages/features-wyr/src/index.js';
import type { CommandHandler, InteractionResponse } from '../architecture/handler-contract.js';
import type { ComponentHandler } from '../architecture/component-dispatcher.js';

const validCategories=new Set<WyrCategoryInput>(['Random','Casual','Friends','Dating','Married','Spicy','Unhinged']);
const toResponse=(view:{ephemeral:boolean;content?:string;renderAsset?:string;components:unknown[]}):InteractionResponse=>({
  ephemeral:view.ephemeral,
  ...(view.content===undefined?{}:{content:view.content}),
  ...(view.renderAsset===undefined?{}:{renderAsset:view.renderAsset}),
  components:view.components,
});

export const createWyrCommandHandler=(controller:WyrController):CommandHandler=>async ctx=>{
  const raw=ctx.options.category;
  const category:WyrCategoryInput=typeof raw==='string'&&validCategories.has(raw as WyrCategoryInput)?raw as WyrCategoryInput:'Random';
  return toResponse(await controller.start({guildId:ctx.guildId,channelId:ctx.channelId,userId:ctx.userId,category}));
};

export const createWyrComponentHandler=(controller:WyrController):ComponentHandler=>async ctx=>{
  try{return toResponse(await controller.handleComponent(ctx.customId,ctx.userId,ctx.isStaff??false));}
  catch(error){
    if(error instanceof DomainError)return {ephemeral:true,content:error.message,components:[]};
    throw error;
  }
};
