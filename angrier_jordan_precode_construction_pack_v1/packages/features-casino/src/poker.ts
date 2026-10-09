import {DomainError} from '../../core/src/errors.js';

export type PokerVariant='holdem'|'omaha';
export const POKER_BUY_INS:readonly bigint[]=[500n,1000n,5000n];
export const POKER_CHIPS:Readonly<Record<string,string>>={'500':'5000','1000':'10000','5000':'50000'};
export interface PokerSeat {userId:string;name:string;bot:boolean;buyIn:string;chips:string;joined:boolean;}
export type PokerAction='fold'|'check'|'call'|'raise';
export interface PokerHand {variant:PokerVariant;handId:string;dealerId:string;buttonIndex:number;street:'preflop'|'flop'|'turn'|'river'|'showdown';deck:number[];board:number[];hole:Record<string,number[]>;folded:string[];committed:Record<string,string>;toAct:string;currentBet:string;minRaise:string;pot:string;settled:boolean;winnerIds?:string[];actionDeadline?:string;}
export interface PokerTable {id:string;guildId:string;channelId:string;hostId:string;variant:PokerVariant;state:'OPEN'|'PLAYING'|'CLOSED';blindLevel:number;smallBlind:string;bigBlind:string;seats:PokerSeat[];pot:string;hand:number;startedAt?:string;activeHand?:PokerHand;settledHandIds?:string[];}
export interface PokerPublicView {handId:string;variant:PokerVariant;street:PokerHand['street'];board:number[];pot:string;currentBet:string;toAct:string;players:{userId:string;folded:boolean;committed:string}[];settled:boolean;winnerIds?:string[];}
export interface PokerPrivateView extends PokerPublicView {viewerId:string;holeCards:number[];canAct:boolean;availableActions:PokerAction[];}

export function validateBuyIn(amount:bigint){if(!POKER_BUY_INS.includes(amount))throw new DomainError('POKER_BUYIN','Choose a 500, 1,000 or 5,000 Ottoman buy-in.');return POKER_CHIPS[amount.toString()]!;}
export function createPokerTable(input:{id:string;guildId:string;channelId:string;hostId:string;variant:PokerVariant;hostName:string;hostBuyIn:bigint;now:Date}):PokerTable{
 if(!['holdem','omaha'].includes(input.variant))throw new DomainError('POKER_VARIANT','Choose Hold’em or Omaha.');
 const chips=validateBuyIn(input.hostBuyIn);
 return{id:input.id,guildId:input.guildId,channelId:input.channelId,hostId:input.hostId,variant:input.variant,state:'OPEN',blindLevel:1,smallBlind:'25',bigBlind:'50',seats:[{userId:input.hostId,name:input.hostName,bot:false,buyIn:input.hostBuyIn.toString(),chips,joined:true}],pot:'0',hand:0,startedAt:input.now.toISOString(),settledHandIds:[]};
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
 if(table.state==='PLAYING'&&table.activeHand)return table;
 if(table.state!=='OPEN')throw new DomainError('POKER_START','This table cannot start again.');
 if(table.seats.length<2)throw new DomainError('POKER_PLAYERS','At least two seats are required to start.');
 return{...table,state:'PLAYING',hand:1};
}
export function cancelPokerTable(table:PokerTable):PokerTable{if(table.state==='PLAYING')throw new DomainError('POKER_STARTED','A started table cannot be cancelled for refunds.');return{...table,state:'CLOSED'};}
export function advanceBlinds(table:PokerTable):PokerTable{if(table.state!=='PLAYING')throw new DomainError('POKER_NOT_PLAYING','The table is not in play.');const level=table.blindLevel+1;return{...table,blindLevel:level,smallBlind:String(25*2**(level-1)),bigBlind:String(50*2**(level-1)),hand:table.hand+1};}

export function publicPokerView(hand:PokerHand):PokerPublicView{return{handId:hand.handId,variant:hand.variant,street:hand.street,board:[...hand.board],pot:hand.pot,currentBet:hand.currentBet,toAct:hand.toAct,players:Object.keys(hand.hole).map(userId=>({userId,folded:hand.folded.includes(userId),committed:hand.committed[userId]??'0'})),settled:hand.settled,...(hand.winnerIds?{winnerIds:[...hand.winnerIds]}:{})};}
export function privatePokerView(hand:PokerHand,viewerId:string):PokerPrivateView{const hole=hand.hole[viewerId];if(!hole)throw new DomainError('POKER_PLAYER','You are not seated at this table.');const pub=publicPokerView(hand),canAct=!hand.settled&&hand.toAct===viewerId&&!hand.folded.includes(viewerId);return{...pub,viewerId,holeCards:[...hole],canAct,availableActions:canAct?['fold','check','call','raise']:[]};}
const makeDeck=()=>Array.from({length:52},(_,i)=>i);
const draw=(deck:number[])=>{const card=deck.shift();if(card===undefined)throw new DomainError('POKER_DECK','The table deck is exhausted.');return card;};
export function startPokerHand(table:PokerTable,handId:string,rng:(max:number)=>number=(max)=>Math.floor(Math.random()*max),deadline?:Date):PokerHand{
 if(table.state!=='PLAYING'||table.seats.length<2)throw new DomainError('POKER_PLAYERS','A started table needs at least two seats.');
 const deck=makeDeck();for(let i=deck.length-1;i>0;i--){const j=rng(i+1);[deck[i],deck[j]]=[deck[j]!,deck[i]!];}
 const hole:Record<string,number[]>={},cardsPerSeat=table.variant==='omaha'?4:2;for(const seat of table.seats)hole[seat.userId]=Array.from({length:cardsPerSeat},()=>draw(deck));
 const buttonIndex=(table.hand-1)%table.seats.length,first=table.seats[(buttonIndex+1)%table.seats.length]!;
 return{variant:table.variant,handId,dealerId:table.seats[buttonIndex]!.userId,buttonIndex,street:'preflop',deck,board:[],hole,folded:[],committed:Object.fromEntries(table.seats.map(s=>[s.userId,'0'])),toAct:first.userId,currentBet:'0',minRaise:table.bigBlind,pot:'0',settled:false,...(deadline?{actionDeadline:deadline.toISOString()}:{})};
}
const nextActive=(hand:PokerHand,userId:string)=>{const active=Object.keys(hand.hole).filter(id=>!hand.folded.includes(id));const index=active.indexOf(userId);return active[(index+1)%active.length]??userId;};
export function pokerAction(hand:PokerHand,userId:string,action:PokerAction,amount?:bigint,deadline?:Date):PokerHand{
 if(hand.settled)throw new DomainError('POKER_SETTLED','This hand is already settled.');if(hand.toAct!==userId)throw new DomainError('POKER_TURN','It is not your turn.');if(hand.folded.includes(userId))throw new DomainError('POKER_FOLDED','Folded players cannot act.');
 const next={...hand,committed:{...hand.committed},folded:[...hand.folded]};const committed=BigInt(next.committed[userId]??'0'),current=BigInt(next.currentBet),pot=BigInt(next.pot);
 if(action==='fold')next.folded.push(userId);else if(action==='check'&&committed<current)throw new DomainError('POKER_CHECK','You must call or fold.');else if(action==='call'){next.committed[userId]=current.toString();next.pot=(pot+current-committed).toString();}else if(action==='raise'){if(amount===undefined||amount<current+BigInt(next.minRaise))throw new DomainError('POKER_RAISE','Raise must meet the table minimum.');next.committed[userId]=amount.toString();next.pot=(pot+amount-committed).toString();next.currentBet=amount.toString();}else if(action!=='check')throw new DomainError('POKER_ACTION','Choose a valid table action.');
 const active=Object.keys(next.hole).filter(id=>!next.folded.includes(id));if(active.length===1)return settlePokerHand(next);
 next.toAct=nextActive(next,userId);if(deadline)next.actionDeadline=deadline.toISOString();return next;
}
export function settlePokerHand(hand:PokerHand):PokerHand{if(hand.settled)return hand;const active=Object.keys(hand.hole).filter(id=>!hand.folded.includes(id));if(active.length!==1&&hand.street!=='showdown')throw new DomainError('POKER_SHOWDOWN','The hand must reach showdown or have one remaining player.');const winnerIds=active.length===1?active:[...active].sort();const {actionDeadline:_deadline,...settled}=hand;return{...settled,street:'showdown',settled:true,winnerIds};}
export function advancePokerStreet(hand:PokerHand,deadline?:Date):PokerHand{if(hand.settled)throw new DomainError('POKER_SETTLED','This hand is already settled.');const active=Object.keys(hand.hole).filter(id=>!hand.folded.includes(id));if(active.length<2)return settlePokerHand(hand);const next=hand.street==='preflop'?'flop':hand.street==='flop'?'turn':hand.street==='turn'?'river':'showdown';if(next==='showdown')return settlePokerHand({...hand,street:'showdown'});const count=next==='flop'?3:1,deck=[...hand.deck],board=[...hand.board];for(let i=0;i<count;i++)board.push(draw(deck));return{...hand,street:next,deck,board,toAct:active[0]!,...(deadline?{actionDeadline:deadline.toISOString()}:{})};}
export function evaluatePokerHand(hand:PokerHand,userId:string):number[]{const cards=[...(hand.hole[userId]??[]),...hand.board];if(!cards.length)throw new DomainError('POKER_CARDS','No cards are available.');const ranks=cards.map(c=>c%13===0?14:c%13+1).sort((a,b)=>b-a),counts=new Map<number,number>();for(const r of ranks)counts.set(r,(counts.get(r)??0)+1);return[...counts.entries()].sort((a,b)=>b[1]-a[1]||b[0]-a[0]).flatMap(([r,n])=>Array(n).fill(r));}
export function timeoutPokerAction(hand:PokerHand,deadline?:Date):PokerHand{if(hand.settled)return hand;const committed=BigInt(hand.committed[hand.toAct]??'0'),bet=BigInt(hand.currentBet);return pokerAction(hand,hand.toAct,committed<bet?'fold':'check',undefined,deadline);}
