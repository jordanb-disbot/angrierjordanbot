import type {LichessAdapter,LichessGame,LichessOutcome} from './domain.js';
/** Isolated HTTP boundary: never log responses because color URLs are bearer links. */
const text=(value:unknown)=>typeof value==='string'&&value.length>0?value:undefined;
const record=(value:unknown):Record<string,unknown>|undefined=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:undefined;
/** Diagnostic shape intentionally contains keys only, never bearer-link values. */
const responseShape=(body:Record<string,unknown>)=>{const fields=Object.keys(body).sort().slice(0,16).join(',')||'none';const challenge=record(body.challenge);const challengeFields=challenge?Object.keys(challenge).sort().slice(0,16).join(',')||'none':'none';return `fields=${fields}; challengeFields=${challengeFields}`;};
export class HttpLichessAdapter implements LichessAdapter {
 constructor(private readonly token:string,private readonly fetcher:typeof fetch=fetch){}
 async createGuestGame(input:{limit:number;increment:number;idempotencyKey:string}):Promise<LichessGame>{
  const body=new URLSearchParams({variant:'standard',rated:'false','clock.limit':String(input.limit),'clock.increment':String(input.increment),'color':'random'});
  const response=await this.fetcher('https://lichess.org/api/challenge/open',{method:'POST',headers:{Authorization:`Bearer ${this.token}`,Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':input.idempotencyKey},body});
  if(!response.ok){const retry=response.status===429;const retrySafe=response.status>=400&&response.status<500;throw Object.assign(new Error(`Lichess challenge creation failed (${response.status}).`),{retryable:retry,retrySafe,status:response.status});}
  const data=record(await response.json());if(!data)throw Object.assign(new Error(`Lichess returned a non-object challenge response (HTTP ${response.status}).`),{retryable:false,retrySafe:false,status:response.status});const challenge=record(data.challenge);
  // Lichess currently names these `whiteUrl`/`blackUrl`. Older deployments
  // returned `urlWhite`/`urlBlack`; tolerate both top-level and nested forms.
  // Only persisted seat fields retain those bearer URLs; diagnostics contain keys only.
  const whiteUrl=text(data.whiteUrl)??text(data.urlWhite)??text(challenge?.whiteUrl)??text(challenge?.urlWhite),blackUrl=text(data.blackUrl)??text(data.urlBlack)??text(challenge?.blackUrl)??text(challenge?.urlBlack),challengeId=text(challenge?.id)??text(data.id);
  if(!challengeId||!whiteUrl||!blackUrl)throw Object.assign(new Error(`Lichess challenge response missing private seats (HTTP ${response.status}; ${responseShape(data)}).`),{retryable:false,retrySafe:false,status:response.status});
  // urlWhite/urlBlack are the guest-board capabilities. Lichess may omit the
  // convenience public challenge URL, which must not turn a created game into
  // a second create attempt. The stable challenge ID is sufficient for replay.
  return {challengeId,gameId:challengeId,gameUrl:text(challenge?.url)??text(data.url)??`https://lichess.org/${encodeURIComponent(challengeId)}`,whiteUrl,blackUrl};
 }
 async game(id:string):Promise<LichessOutcome>{
  const response=await this.fetcher(`https://lichess.org/api/game/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${this.token}`,Accept:'application/json'}});
  if(response.status===404)return {finished:false};if(!response.ok)throw Object.assign(new Error(`Lichess game lookup failed (${response.status}).`),{retryable:response.status===429||response.status>=500});
  const data=await response.json() as {status?:string;winner?:string};const finished=['mate','resign','stalemate','timeout','outoftime','draw','aborted','cheat','nostart','unknownfinish'].includes(data.status??'');
  return {finished,status:data.status,winnerColor:data.winner==='white'||data.winner==='black'?data.winner:undefined,result:data.status};
 }
}
