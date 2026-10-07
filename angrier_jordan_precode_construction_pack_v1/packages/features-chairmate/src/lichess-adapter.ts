import type {LichessAdapter,LichessGame,LichessOutcome} from './domain.js';
/** Isolated HTTP boundary: never log responses because color URLs are bearer links. */
export class HttpLichessAdapter implements LichessAdapter {
 constructor(private readonly token:string,private readonly fetcher:typeof fetch=fetch){}
 async createGuestGame(input:{limit:number;increment:number;idempotencyKey:string}):Promise<LichessGame>{
  const body=new URLSearchParams({variant:'standard',rated:'false','clock.limit':String(input.limit),'clock.increment':String(input.increment),'color':'random'});
  const response=await this.fetcher('https://lichess.org/api/challenge/open',{method:'POST',headers:{Authorization:`Bearer ${this.token}`,Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':input.idempotencyKey},body});
  if(!response.ok){const retry=response.status===429;const retrySafe=response.status>=400&&response.status<500;throw Object.assign(new Error(`Lichess challenge creation failed (${response.status}).`),{retryable:retry,retrySafe,status:response.status});}
  // Lichess currently names these `whiteUrl`/`blackUrl`. Older deployments
  // returned `urlWhite`/`urlBlack`, so accept both without ever recording or
  // logging their bearer values outside the durable private-seat fields.
  const data=await response.json() as {challenge?:{id?:string;url?:string;urlWhite?:string;urlBlack?:string;whiteUrl?:string;blackUrl?:string};urlWhite?:string;urlBlack?:string;whiteUrl?:string;blackUrl?:string};const whiteUrl=data.whiteUrl??data.urlWhite??data.challenge?.whiteUrl??data.challenge?.urlWhite,blackUrl=data.blackUrl??data.urlBlack??data.challenge?.blackUrl??data.challenge?.urlBlack;
  if(!data.challenge?.id||!whiteUrl||!blackUrl)throw Object.assign(new Error('Lichess returned an incomplete guest-game response.'),{retryable:false,retrySafe:false,status:502});
  // urlWhite/urlBlack are the guest-board capabilities. Lichess may omit the
  // convenience public challenge URL, which must not turn a created game into
  // a second create attempt. The stable challenge ID is sufficient for replay.
  return {challengeId:data.challenge.id,gameId:data.challenge.id,gameUrl:data.challenge.url??`https://lichess.org/${encodeURIComponent(data.challenge.id)}`,whiteUrl,blackUrl};
 }
 async game(id:string):Promise<LichessOutcome>{
  const response=await this.fetcher(`https://lichess.org/api/game/export/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${this.token}`,Accept:'application/json'}});
  if(response.status===404)return {finished:false};if(!response.ok)throw Object.assign(new Error(`Lichess game lookup failed (${response.status}).`),{retryable:response.status===429||response.status>=500});
  const data=await response.json() as {status?:string;winner?:string};const finished=['mate','resign','stalemate','timeout','outoftime','draw','aborted','cheat','nostart','unknownfinish'].includes(data.status??'');
  return {finished,status:data.status,winnerColor:data.winner==='white'||data.winner==='black'?data.winner:undefined,result:data.status};
 }
}
