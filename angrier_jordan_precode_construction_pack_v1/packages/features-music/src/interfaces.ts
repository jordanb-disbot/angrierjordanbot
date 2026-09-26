/** Public metadata contains references, never credentials or transient authenticated stream URLs. */
export interface MusicMetadata {
 provider:string;reference:string;title:string;artist:string;album:string|null;
 durationMs:number|null;artworkUrl:string|null;seekable:boolean;
 /** Optional canonical recording identity; never a provider stream capability. */
 isrc?:string|null;explicit?:boolean|null;
}
export interface MusicEntry {id:string;requesterUserId:string|null;track:MusicMetadata;requestedTrack?:MusicMetadata;resolutionMethod?:'direct'|'isrc'|'metadata'|'selected';}
export interface MetadataResolution {tracks:MusicMetadata[];unavailable:{reference:string;reason:string}[];}
export interface MusicMetadataProvider {
 search(query:string,limit:number,signal:AbortSignal):Promise<MusicMetadata[]>;
 resolve(reference:string,limit:number,signal:AbortSignal):Promise<MetadataResolution>;
}
/** Private transport-only object. Do not persist, render, log, or expose this source to Discord. */
export interface AuthorizedPlayableSource {
 stream:AsyncIterable<Uint8Array>;format:'opus'|'pcm';seekable:boolean;durationMs:number|null;
 authorizationReference:string;expiresAt:Date|null;close():Promise<void>;
}
export interface MusicAudioProvider {
 resolvePlayable(track:MusicMetadata,positionMs:number,signal:AbortSignal):Promise<AuthorizedPlayableSource>;
 recommendations(track:MusicMetadata,limit:number,signal:AbortSignal):Promise<MetadataResolution>;
}
export interface MusicTransportFence {guildId:string;generation:number;revision:number;}
/** The concrete driver must serialize/fence every operation per server, including non-play commands. */
export interface MusicVoiceTransport {
 connect(fence:MusicTransportFence,voiceChannelId:string,signal:AbortSignal):Promise<void>;
 play(fence:MusicTransportFence,source:AuthorizedPlayableSource,signal:AbortSignal):Promise<void>;
 pause(fence:MusicTransportFence):Promise<void>;resume(fence:MusicTransportFence):Promise<void>;
 volume(fence:MusicTransportFence,percent:number):Promise<void>;stop(fence:MusicTransportFence):Promise<void>;disconnect(fence:MusicTransportFence):Promise<void>;
}
export type DesiredMusicStatus='IDLE'|'PLAYING'|'PAUSED'|'DISCONNECTED';
export type ObservedMusicStatus='IDLE'|'PLAYING'|'PAUSED'|'DISCONNECTED'|'RECOVERING'|'FAILED';
export interface MusicState {
 guildId:string;voiceChannelId:string;textChannelId:string;revision:number;generation:number;
 current:MusicEntry|null;queue:MusicEntry[];history:MusicEntry[];
 desiredStatus:DesiredMusicStatus;observedStatus:ObservedMusicStatus;observedGeneration:number;
 positionMs:number;observedAt:number|null;volume:number;loop:'off'|'track'|'queue';autoplay:boolean;queueMaxTracks:number;
 skipVotes:{generation:number;voterIds:string[]};lastError:string|null;
}
export interface MusicActor {guildId:string;userId:string;voiceChannelId:string|null;textChannelId:string;eligible:boolean;isDj:boolean;}
export interface MusicPolicy {queueMaxTracks:number;defaultVolume:number;defaultLoop:'off'|'track'|'queue';defaultAutoplay:boolean;}
export type MusicEffect=
 |{kind:'connect';voiceChannelId:string}
 |{kind:'play';entry:MusicEntry;positionMs:number}
 |{kind:'pause'|'resume'|'stop'|'disconnect'}
 |{kind:'volume';percent:number}
 |{kind:'recommend';after:MusicMetadata};
export interface MusicTransition {state:MusicState;effects:MusicEffect[];}
export interface MusicPlaylist {id:string;guildId:string;ownerUserId:string;name:string;revision:number;tracks:MusicMetadata[];}
