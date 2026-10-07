import type {LichessAdapter,LichessGame,LichessOutcome} from './domain.js';
/** Isolated HTTP boundary: never log responses because color URLs are bearer links. */
export class HttpLichessAdapter implements LichessAdapter {
 constructor(private readonly token:string,private readonly fetcher:typeof fetch=fetch){}
 async createGuestGame(input:{limit:number;increment:number;idempotencyKey:string}):Promise<LichessGame>{
  const body=new URLSearchParams({variant:'standard',rated:'false','clock.limit':String(input.limit),'clock.increment':String(input.increment),'color':'random'});
  const response=await this.fetcher('https://lichess.org/api/challenge/open',{method:'POST',headers:{Authorization:`Bearer ${this.token}`,Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':input.idempotencyKey},body});
  if(!response.ok){const retry=response.status===429||response.status>=500;throw Object.assign(new Error(`Lichess challenge creation failed (${response.status}).`),{retryable:retry,status:response.status});}
  const data=await response.json() as {challenge?:{id?:string;url?:string};urlWhite?:string;urlBlack?:string};
  if(!data.challenge?.id||!data.challenge.url||!data.urlWhite||!data.urlBlack)throw Object.assign(new Error('Lichess returned an incomplete guest-game response.'),{retryable:true,status:502});
  return {challengeId:data.challenge.id,gameId:data.challenge.id,gameUrl:data.challenge.url,whiteUrl:data.urlWhite,blackUrl:data.urlBlack};
 }
 async game(id:string):Promise<LichessOutcome>{
  const response=await this.fetcher(`https://lichess.org/api/game/export/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${this.token}`,Accept:'application/json'}});
  if(response.status===404)return {finished:false};if(!response.ok)throw Object.assign(new Error(`Lichess game lookup failed (${response.status}).`),{retryable:response.status===429||response.status>=500});
  const data=await response.json() as {status?:string;winner?:string};const finished=['mate','resign','stalemate','timeout','outoftime','draw','aborted','cheat','nostart','unknownfinish'].includes(data.status??'');
  return {finished,status:data.status,winnerColor:data.winner==='white'||data.winner==='black'?data.winner:undefined,result:data.status};
 }
}
