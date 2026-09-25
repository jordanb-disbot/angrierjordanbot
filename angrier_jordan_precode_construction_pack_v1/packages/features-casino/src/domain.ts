import {randomInt} from 'node:crypto';
import {DomainError} from '../../core/src/errors.js';
export type CasinoGame='blackjack'|'roulette'|'slots'|'dice'|'coinflip';
export type CasinoRandom=(max:number)=>number;
export const secureRandom:CasinoRandom=max=>randomInt(max);
export const shuffleDeck=(rng:CasinoRandom=secureRandom)=>{const deck=Array.from({length:52},(_,i)=>i);for(let i=51;i>0;i--){const j=rng(i+1);[deck[i],deck[j]]=[deck[j]!,deck[i]!];}return deck;};
export const cardLabel=(card:number)=>['A','2','3','4','5','6','7','8','9','10','J','Q','K'][card%13]+['♣','♦','♥','♠'][Math.floor(card/13)]!;
export function handValue(cards:number[]){let total=0,aces=0;for(const c of cards){const rank=c%13;total+=rank===0?11:Math.min(10,rank+1);if(rank===0)aces++;}while(total>21&&aces){total-=10;aces--;}return{total,soft:aces>0};}
export interface BlackjackHand {cards:number[];stake:string;status:'PLAYING'|'STOOD'|'BUST';split:boolean;splitAces:boolean;}
export interface BlackjackState {deck:number[];dealer:number[];hands:BlackjackHand[];active:number;closed:boolean;payout:string;outcome:string;}
const draw=(s:BlackjackState)=>{const card=s.deck.shift();if(card===undefined)throw new DomainError('DECK_EMPTY','The card shoe is unavailable.');return card;};
export function startBlackjack(stake:bigint,deck=shuffleDeck()):BlackjackState{
 const state:BlackjackState={deck:[...deck],dealer:[],hands:[{cards:[],stake:stake.toString(),status:'PLAYING',split:false,splitAces:false}],active:0,closed:false,payout:'0',outcome:''};
 for(let i=0;i<2;i++){state.hands[0]!.cards.push(draw(state));state.dealer.push(draw(state));}
 const player=handValue(state.hands[0]!.cards).total,dealer=handValue(state.dealer).total;
 if(player===21||dealer===21){state.closed=true;state.hands[0]!.status='STOOD';state.payout=(player===21?(dealer===21?stake:stake*5n/2n):0n).toString();state.outcome=player===21?(dealer===21?'Push':'Blackjack'):'Dealer blackjack';}
 return state;
}
export function blackjackAdditionalStake(state:BlackjackState,action:string){const h=state.hands[state.active];if(state.closed||!h||h.status!=='PLAYING')throw new DomainError('HAND_CLOSED','This hand is complete.');if(action==='double'){if(h.cards.length!==2||h.splitAces)throw new DomainError('DOUBLE_ILLEGAL','Double is available on an initial two-card hand.');return BigInt(h.stake);}if(action==='split'){if(h.cards.length!==2||h.cards[0]!%13!==h.cards[1]!%13||state.hands.length>=4||h.splitAces)throw new DomainError('SPLIT_ILLEGAL','Split matching ranks, up to four hands. Split aces receive one card each.');return BigInt(h.stake);}if(!['hit','stand'].includes(action))throw new DomainError('BLACKJACK_ACTION','Choose Hit, Stand, Double or Split.');return 0n;}
export function blackjackAction(input:BlackjackState,action:'hit'|'stand'|'double'|'split'):BlackjackState{
 blackjackAdditionalStake(input,action);const s=structuredClone(input),h=s.hands[s.active]!;
 if(action==='split'){
  const ace=h.cards[0]!%13===0;const right:BlackjackHand={cards:[h.cards.pop()!],stake:h.stake,status:ace?'STOOD':'PLAYING',split:true,splitAces:ace};h.split=true;h.splitAces=ace;h.cards.push(draw(s));right.cards.push(draw(s));if(ace||handValue(h.cards).total===21)h.status='STOOD';if(handValue(right.cards).total===21)right.status='STOOD';s.hands.splice(s.active+1,0,right);
 }else if(action==='stand')h.status='STOOD';else{if(action==='double')h.stake=(BigInt(h.stake)*2n).toString();h.cards.push(draw(s));const total=handValue(h.cards).total;if(total>21)h.status='BUST';else if(total===21||action==='double')h.status='STOOD';}
 const next=s.hands.findIndex(x=>x.status==='PLAYING');if(next>=0){s.active=next;return s;}
 if(s.hands.some(x=>x.status!=='BUST'))while(handValue(s.dealer).total<17)s.dealer.push(draw(s));
 const dealer=handValue(s.dealer).total;let payout=0n;for(const hand of s.hands){const total=handValue(hand.cards).total,stake=BigInt(hand.stake);if(total>21)continue;if(dealer>21||total>dealer)payout+=stake*2n;else if(total===dealer)payout+=stake;}
 s.closed=true;s.payout=payout.toString();const committed=s.hands.reduce((n,h)=>n+BigInt(h.stake),0n);s.outcome=payout>committed?'Win':payout===committed?'Push':'Loss';return s;
}
export function finishBlackjack(input:BlackjackState){let s=structuredClone(input);while(!s.closed)s=blackjackAction(s,'stand');return s;}
export interface ChairSymbol {id:string;name:string;weight:number;multiplier:number;jackpot?:boolean;}
export interface InstantResult {symbols:string[];payout:string;outcome:string;jackpot:boolean;}
const red=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export function instantGame(game:Exclude<CasinoGame,'blackjack'>,stake:bigint,selection:string,symbols:ChairSymbol[],rng:CasinoRandom=secureRandom):InstantResult{
 let result:string[]=[],payout=0n,jackpot=false;
 if(game==='coinflip'){if(!['heads','tails'].includes(selection))throw new DomainError('COIN_SIDE','Choose Heads or Tails.');const side=rng(2)===0?'heads':'tails';result=[side];if(selection===side)payout=stake*2n;}
 if(game==='dice'){if(selection!=='high')throw new DomainError('DICE_MODE','Choose the available higher-roll mode.');const player=rng(6)+1,house=rng(6)+1;result=[String(player),String(house)];payout=player===house?stake:player>house?stake*2n:0n;}
 if(game==='roulette'){
  const number=/^number:(\d{1,2})$/.exec(selection),n=number?Number(number[1]):-1;
  if(!(number&&n>=0&&n<=36)&&!['red','black','odd','even','low','high'].includes(selection))throw new DomainError('ROULETTE_SELECTION','Choose a supported roulette selection.');
  const hit=rng(37);result=[String(hit),hit===0?'green':red.has(hit)?'red':'black'];const win=number?hit===n:hit!==0&&(selection==='red'?red.has(hit):selection==='black'?!red.has(hit):selection==='odd'?hit%2===1:selection==='even'?hit%2===0:selection==='low'?hit<=18:hit>=19);if(win)payout=stake*(number?36n:2n);
 }
 if(game==='slots'){
  if(!symbols.length||symbols.some(s=>!Number.isSafeInteger(s.weight)||s.weight<=0||!Number.isSafeInteger(s.multiplier)||s.multiplier<0))throw new DomainError('SLOT_TABLE','The slot table is unavailable.');
  const sum=symbols.reduce((n,s)=>n+s.weight,0);const reel=()=>{let point=rng(sum);return symbols.find(s=>(point-=s.weight)<0)!;};const reels=[reel(),reel(),reel()];result=reels.map(s=>s.id);if(reels.every(s=>s.id===reels[0]!.id)){jackpot=reels[0]!.jackpot===true;payout=stake*BigInt(reels[0]!.multiplier);}
 }
 return{symbols:result,payout:payout.toString(),outcome:jackpot?'Chair Pot':payout>stake?'Win':payout===stake?'Push':'Loss',jackpot};
}
