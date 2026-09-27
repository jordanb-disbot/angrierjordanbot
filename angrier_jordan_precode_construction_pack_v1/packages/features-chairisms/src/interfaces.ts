/** High-reviewed adapters own Discord access checks, privacy, persistence and delivery. */
export interface ChairismContext {guildId:string;channelId:string;userId:string;requestKey:string;}
export interface ChairismReference {channelId:string;messageId:string;}
export interface ChairismOptions {includeReply:boolean;includeImage:boolean;}
export interface ChairismQuote {userId:string;displayName:string;text:string;timestamp:string;avatarDataUri?:string;}
export interface ChairismSnapshot {layout?:'short'|'long';quote:ChairismQuote;source?:ChairismReference;sourceChannelLabel?:string;reply?:ChairismQuote;replySource?:ChairismReference;imageDataUri?:string;imageAttachmentId?:string;}
export interface ChairismInspection {reference:ChairismReference;hasReply:boolean;hasImage:boolean;}
export interface ChairismSecurity {
 /** Reject inaccessible/private/staff/evidence/DM/deleted/disallowed-bot sources before returning metadata. */
 inspectMessage(context:ChairismContext,reference:ChairismReference):Promise<ChairismInspection>;
 /** Refetch every selected source, check all author preferences and sanitize/fetch media at publication time. */
 captureMessage(context:ChairismContext,reference:ChairismReference,options:ChairismOptions):Promise<ChairismSnapshot>;
 /** Self attribution only; never accept caller-supplied attribution, avatar URL or target member. */
 captureSelf(context:ChairismContext,text:string):Promise<ChairismSnapshot>;
 /** Check current actor access to Chairisms output and source-member privacy before browsing. */
 assertCanBrowse(context:ChairismContext,sourceUserIds:readonly string[]):Promise<void>;
}
export interface ChairismPublished {chairismId:number;outputMessageId:string;outputChannelId:string;}
export interface ChairismPublisher {
 /** Durable receipt, shared DeliveryEngine, spam limit and audit; resolves only after confirmed publication. */
 publish(context:ChairismContext,snapshot:ChairismSnapshot):Promise<ChairismPublished>;
}
export interface ChairismBrowseQuery {mode:'recent'|'member'|'random';memberId?:string;beforeId?:number;}
export interface ChairismBrowseItem extends ChairismPublished {sourceUserId:string;createdAt:string;}
export interface ChairismBrowser {
 /** Only confirmed public outputs; current permission/privacy filtering occurs before page/random selection. */
 list(context:ChairismContext,query:ChairismBrowseQuery):Promise<ChairismBrowseItem[]>;
}
