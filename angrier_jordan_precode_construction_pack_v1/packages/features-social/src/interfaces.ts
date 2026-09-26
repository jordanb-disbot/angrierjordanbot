export interface SocialContext {guildId:string;channelId:string;userId:string;requestKey:string;}
export interface SocialPolicy {throttleSeconds:number;roastBackSeconds:number;}
export interface SocialJob {
 guildId:string;channelId:string;actorId:string;targetId:string|null;action:string;content:string;
 sessionId:string|null;deliveryState:'PENDING'|'SENDING'|'SENT';deliveryMessageId?:string;cancelled?:boolean;
}
export interface RoastBackData {actorId:string;targetId:string;jobId:string;}
