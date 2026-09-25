import type { WyrCategoryInput, WyrChoice, WyrRuntimeSession } from './types.js';
import type { WyrDiscordPort } from './discord-adapter-contract.js';
import type { WyrService } from './service.js';

/**
 * Thin orchestration layer between the Discord adapter and the WYR domain service.
 * It owns no game rules; it only persists message linkage and replays state to Discord
 * after startup/recovery.
 */
export class WyrRuntime {
  constructor(private readonly service:WyrService,private readonly discord:WyrDiscordPort){}

  async launch(input:{guildId:string;channelId:string;userId:string;category?:WyrCategoryInput;durationSeconds?:number;extensionSeconds?:number}):Promise<WyrRuntimeSession>{
    let session=await this.service.start({guildId:input.guildId,channelId:input.channelId,ownerUserId:input.userId,category:input.category??'Random',...(input.durationSeconds===undefined?{}:{durationSeconds:input.durationSeconds}),...(input.extensionSeconds===undefined?{}:{extensionSeconds:input.extensionSeconds})});
    const posted=await this.discord.postRound(session,this.service.renderOpen(session));
    session=await this.service.attachMessage(session.id,posted.messageId);
    return session;
  }

  async vote(sessionId:string,userId:string,choice:WyrChoice):Promise<void>{
    const session=await this.service.vote(sessionId,userId,choice);
    const label=choice==='A'?session.data.optionA:session.data.optionB;
    await this.discord.ephemeral(userId,`Vote recorded: ${choice} — ${label}. You can change it until voting closes.`);
  }

  async extend(sessionId:string,actorUserId:string,isStaff=false):Promise<WyrRuntimeSession>{
    const session=await this.service.extend(sessionId,actorUserId,isStaff);
    await this.discord.updateRound(session,this.service.renderOpen(session));
    return session;
  }

  async close(sessionId:string):Promise<WyrRuntimeSession>{
    const closed=await this.service.close(sessionId);
    await this.discord.postResults(closed.session,closed.results,closed.svg);
    return closed.session;
  }

  async playAgain(sourceSessionId:string,userId:string):Promise<WyrRuntimeSession>{
    let session=await this.service.replay(sourceSessionId,userId);
    const posted=await this.discord.postRound(session,this.service.renderOpen(session));
    session=await this.service.attachMessage(session.id,posted.messageId);
    return session;
  }

  async recover():Promise<{active:number;closed:number}>{
    const state=await this.service.recover();
    let closed=0;
    for(const expired of state.expired){await this.close(expired.id);closed+=1;}
    for(const active of state.active){if(active.messageId)await this.discord.updateRound(active,this.service.renderOpen(active));}
    return {active:state.active.length,closed};
  }
}
