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

export type PokerAction='fold'|'check'|'call'|'raise';
export interface PokerHand {variant:PokerVariant;handId:string;dealerId:string;buttonIndex:number;street:'preflop'|'flop'|'turn'|'river'|'showdown';deck:number[];board:number[];hole:Record<string,number[]>;folded:string[];committed:Record<string,string>;toAct:string;currentBet:string;minRaise:string;pot:string;settled:boolean;winnerIds?:string[];}
const makeDeck=()=>Array.from({length:52},(_,i)=>i);
const draw=(deck:number[])=>{const card=deck.shift();if(card===undefined)throw new DomainError('POKER_DECK','The table deck is exhausted.');return card;};
export function startPokerHand(table:PokerTable,handId:string,rng:(max:number)=>number=(max)=>Math.floor(Math.random()*max)):PokerHand{
 if(table.state!=='PLAYING'||table.seats.length<2)throw new DomainError('POKER_PLAYERS','A started table needs at least two seats.');
 const deck=makeDeck();for(let i=deck.length-1;i>0;i--){const j=rng(i+1);[deck[i],deck[j]]=[deck[j]!,deck[i]!];}
 const hole:Record<string,number[]>={};for(const seat of table.seats)hole[seat.userId]=[draw(deck),draw(deck)];
 const buttonIndex=(table.hand-1)%table.seats.length,first=table.seats[(buttonIndex+1)%table.seats.length]!;
 return{variant:table.variant,handId,dealerId:table.seats[buttonIndex]!.userId,buttonIndex,street:'preflop',deck,board:[],hole,folded:[],committed:Object.fromEntries(table.seats.map(s=>[s.userId,'0'])),toAct:first.userId,currentBet:'0',minRaise:table.bigBlind,pot:'0',settled:false};
}
export function pokerAction(hand:PokerHand,userId:string,action:PokerAction,amount?:bigint):PokerHand{
 if(hand.settled)throw new DomainError('POKER_SETTLED','This hand is already settled.');if(hand.toAct!==userId)throw new DomainError('POKER_TURN','It is not your turn.');if(hand.folded.includes(userId))throw new DomainError('POKER_FOLDED','Folded players cannot act.');
 const next={...hand,committed:{...hand.committed},folded:[...hand.folded]};const committed=BigInt(next.committed[userId]??'0'),current=BigInt(next.currentBet),pot=BigInt(next.pot);
 if(action==='fold')next.folded.push(userId);else if(action==='check'&&committed<current)throw new DomainError('POKER_CHECK','You must call or fold.');else if(action==='call'){next.committed[userId]=current.toString();next.pot=(pot+current-committed).toString();}else if(action==='raise'){if(amount===undefined||amount<current+BigInt(next.minRaise))throw new DomainError('POKER_RAISE','Raise must meet the table minimum.');next.committed[userId]=amount.toString();next.pot=(pot+amount-committed).toString();next.currentBet=amount.toString();}else if(action!=='check')throw new DomainError('POKER_ACTION','Choose a valid table action.');
 const active=Object.keys(next.hole).filter(id=>!next.folded.includes(id));const remaining=active.filter(id=>id!==userId);next.toAct=remaining[0]??userId;return next;
}
export function settlePokerHand(hand:PokerHand):PokerHand{
 if(hand.settled) return hand;const active=Object.keys(hand.hole).filter(id=>!hand.folded.includes(id));if(active.length!==1&&hand.street!=='showdown')throw new DomainError('POKER_SHOWDOWN','The hand must reach showdown or have one remaining player.');const winnerIds=active.length===1?active:[...active].sort();return{...hand,street:'showdown',settled:true,winnerIds};
}
