import {DomainError} from '../../core/src/errors.js';

export type PokerVariant='holdem'|'omaha';
export const POKER_BUY_INS:readonly bigint[]=[500n,1000n,5000n];
export const POKER_CHIPS:Readonly<Record<string,string>>={'500':'5000','1000':'10000','5000':'50000'};
export interface PokerSeat {userId:string;name:string;bot:boolean;buyIn:string;chips:string;joined:boolean;}
export interface PokerTable {id:string;guildId:string;channelId:string;hostId:string;variant:PokerVariant;state:'OPEN'|'PLAYING'|'CLOSED';blindLevel:number;smallBlind:string;bigBlind:string;seats:PokerSeat[];pot:string;hand:number;startedAt?:string;}
export function validateBuyIn(amount:bigint){if(!POKER_BUY_INS.includes(amount))throw new DomainError('POKER_BUYIN','Choose a 500, 1,000 or 5,000 Ottoman buy-in.');return POKER_CHIPS[amount.toString()]!;}
export function createPokerTable(input:{id:string;guildId:string;channelId:string;hostId:string;variant:PokerVariant;hostName:string;hostBuyIn:bigint;now:Date}):PokerTable{
 if(!['holdem','omaha'].includes(input.variant))throw new DomainError('POKER_VARIANT','Choose Hold’em or Omaha.');
 const chips=validateBuyIn(input.hostBuyIn);
 return{id:input.id,guildId:input.guildId,channelId:input.channelId,hostId:input.hostId,variant:input.variant,state:'OPEN',blindLevel:1,smallBlind:'25',bigBlind:'50',seats:[{userId:input.hostId,name:input.hostName,bot:false,buyIn:input.hostBuyIn.toString(),chips,joined:true}],pot:'0',hand:0,startedAt:input.now.toISOString()};
}
export function addPokerSeat(table:PokerTable,input:{userId:string;name:string;bot:boolean;buyIn:bigint;joined?:boolean}):PokerTable{
 if(table.state!=='OPEN')throw new DomainError('POKER_CLOSED','This table is no longer accepting seats.');
 if(table.seats.some(s=>s.userId===input.userId))throw new DomainError('POKER_SEAT','That member already has a seat.');
 if(table.seats.length>=5)throw new DomainError('POKER_FULL','This table has reached five seats.');
 if(!input.bot&&!input.joined)throw new DomainError('POKER_CONFIRM','An invited member must explicitly join before their buy-in is charged.');
 const chips=validateBuyIn(input.buyIn);
 return{...table,seats:[...table.seats,{userId:input.userId,name:input.name,bot:input.bot,buyIn:input.buyIn.toString(),chips,joined:input.joined??true}]};
}
export function startPokerTable(table:PokerTable):PokerTable{
 if(table.state!=='OPEN')throw new DomainError('POKER_START','This table cannot start again.');
 if(table.seats.length<2)throw new DomainError('POKER_PLAYERS','At least two seats are required to start.');
 return{...table,state:'PLAYING',hand:1};
}
export function cancelPokerTable(table:PokerTable):PokerTable{if(table.state==='PLAYING')throw new DomainError('POKER_STARTED','A started table cannot be cancelled for refunds.');return{...table,state:'CLOSED'};}
export function advanceBlinds(table:PokerTable):PokerTable{if(table.state!=='PLAYING')throw new DomainError('POKER_NOT_PLAYING','The table is not in play.');const level=table.blindLevel+1;return{...table,blindLevel:level,smallBlind:String(25*2**(level-1)),bigBlind:String(50*2**(level-1)),hand:table.hand+1};}
