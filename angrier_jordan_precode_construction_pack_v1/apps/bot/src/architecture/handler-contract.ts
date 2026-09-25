export interface InteractionContext { guildId:string;channelId:string;userId:string;commandId:string;options:Record<string,unknown>;requestId:string; }
export interface InteractionResponse { ephemeral?:boolean;content?:string;renderAsset?:string;components?:unknown[]; }
export type CommandHandler=(ctx:InteractionContext)=>Promise<InteractionResponse>;
