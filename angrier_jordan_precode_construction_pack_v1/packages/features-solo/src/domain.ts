import {DomainError} from '../../core/src/errors.js';
export const SOLO_GAMES=['hangman','wordscramble','mastermind','minesweeper'] as const;
export type SoloGame=typeof SOLO_GAMES[number];
export interface SoloOptions {boardSize?:4|5;}
export type SoloAction={kind:'guess';value:string}|{kind:'reveal'|'flag';cell:number}|{kind:'quit'};
export interface SoloPuzzle {game:SoloGame;options:SoloOptions;word?:string;scrambled?:string;letters:string[];guesses:string[];mistakes:number;code?:number[];feedback:{exact:number;misplaced:number}[];order?:number[];mines?:number[];revealed:number[];flags:number[];outcome:'playing'|'won'|'lost'|'expired'|'quit';}
export type Rng=(max:number)=>number;
const WORDS=['armchair','ottoman','cushion','lounge','velvet','leather','recliner','footstool','mahogany','chaise','emerald','brass','comfort','fireside','library','cabinet','lantern','window','blanket','parlour','carpet','curtain','teapot','shelter','candle','chesterfield','bookcase','stately','repose','tapestry'];
function pick(rng:Rng,max:number){const n=rng(max);if(!Number.isInteger(n)||n<0||n>=max)throw new DomainError('SOLO_RNG','Puzzle generation failed.');return n;}
function shuffle<T>(input:T[],rng:Rng){const result=[...input];for(let i=result.length-1;i>0;i--){const j=pick(rng,i+1);[result[i],result[j]]=[result[j]!,result[i]!];}return result;}
export function validateOptions(game:SoloGame,options:SoloOptions){if(!SOLO_GAMES.includes(game))throw new DomainError('SOLO_GAME','Choose a supported solo game.');if(Object.keys(options).some(k=>k!=='boardSize')||(options.boardSize!==undefined&&(game!=='minesweeper'||![4,5].includes(options.boardSize))))throw new DomainError('SOLO_OPTIONS','Those puzzle settings are unavailable.');return game==='minesweeper'?{boardSize:options.boardSize??4}:{};}
export function createPuzzle(game:SoloGame,options:SoloOptions,rng:Rng,previous?:SoloPuzzle):SoloPuzzle{
 const valid=validateOptions(game,options),p:SoloPuzzle={game,options:valid,letters:[],guesses:[],mistakes:0,feedback:[],revealed:[],flags:[],outcome:'playing'};
 if(game==='hangman'||game==='wordscramble'){const pool=WORDS.filter(w=>w!==previous?.word);p.word=pool[pick(rng,pool.length)]!;if(game==='wordscramble'){p.scrambled=shuffle([...p.word],rng).join('');if(p.scrambled===p.word)p.scrambled=p.word.slice(1)+p.word[0];}}
 if(game==='mastermind'){p.code=Array.from({length:4},()=>pick(rng,6)+1);if(previous?.code?.join('')===p.code.join(''))p.code[0]=p.code[0]!%6+1;}
 if(game==='minesweeper'){p.order=shuffle(Array.from({length:valid.boardSize!**2},(_,n)=>n),rng);if(previous?.order?.join(',')===p.order.join(','))p.order.push(p.order.shift()!);}
 return p;
}
export function scoreCode(secret:readonly number[],guess:readonly number[]){let exact=0;const remaining:number[]=[],unmatched:number[]=[];for(let i=0;i<secret.length;i++){if(secret[i]===guess[i])exact++;else{remaining.push(secret[i]!);unmatched.push(guess[i]!);}}let misplaced=0;for(const n of unmatched){const at=remaining.indexOf(n);if(at>=0){misplaced++;remaining.splice(at,1);}}return{exact,misplaced};}
export function neighbors(cell:number,size:number){const r=Math.floor(cell/size),c=cell%size,result:number[]=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;if(rr>=0&&rr<size&&cc>=0&&cc<size)result.push(rr*size+cc);}return result;}
export function applyAction(saved:SoloPuzzle,action:SoloAction):SoloPuzzle{
 if(saved.outcome!=='playing')throw new DomainError('SOLO_CLOSED','This puzzle has ended. Start a new round.');const p=structuredClone(saved);
 if(action.kind==='quit'){p.outcome='quit';return p;}
 if(p.game==='minesweeper'){
  if(action.kind!=='reveal'&&action.kind!=='flag')throw new DomainError('SOLO_MOVE','Choose a cell to reveal or flag.');const size=p.options.boardSize!,cell=action.cell;if(!Number.isInteger(cell)||cell<0||cell>=size*size)throw new DomainError('SOLO_CELL','Choose a cell on this board.');if(p.revealed.includes(cell))throw new DomainError('SOLO_REVEALED','That cell is already revealed.');
  if(action.kind==='flag'){p.flags=p.flags.includes(cell)?p.flags.filter(n=>n!==cell):[...p.flags,cell];return p;}
  if(p.flags.includes(cell))throw new DomainError('SOLO_FLAGGED','Remove the flag before revealing this cell.');
  p.mines??=p.order!.filter(n=>n!==cell).slice(0,size===4?3:5);
  if(p.mines.includes(cell)){p.revealed.push(cell);p.outcome='lost';return p;}
  const queue=[cell],seen=new Set(p.revealed);while(queue.length){const n=queue.shift()!;if(seen.has(n)||p.flags.includes(n)||p.mines.includes(n))continue;seen.add(n);if(!neighbors(n,size).some(m=>p.mines!.includes(m)))queue.push(...neighbors(n,size));}p.revealed=[...seen].sort((a,b)=>a-b);if(p.revealed.length===size*size-p.mines.length)p.outcome='won';return p;
 }
 if(action.kind!=='guess')throw new DomainError('SOLO_MOVE','Submit a guess for this puzzle.');const value=action.value.trim().toLowerCase();
 if(p.game==='hangman'){
  if(!/^[a-z]$/.test(value))throw new DomainError('SOLO_LETTER','Guess one letter from A to Z.');if(p.letters.includes(value))throw new DomainError('SOLO_DUPLICATE','That letter was already guessed.');p.letters.push(value);if(!p.word!.includes(value))p.mistakes++;if([...p.word!].every(c=>p.letters.includes(c)))p.outcome='won';else if(p.mistakes>=6)p.outcome='lost';
 }else if(p.game==='wordscramble'){
  if(!/^[a-z]{2,20}$/.test(value))throw new DomainError('SOLO_WORD','Enter a word using letters only.');if(p.guesses.includes(value))throw new DomainError('SOLO_DUPLICATE','That word was already guessed.');p.guesses.push(value);if(value===p.word)p.outcome='won';else if(p.guesses.length>=6)p.outcome='lost';
 }else{
  if(!/^[1-6]{4}$/.test(value))throw new DomainError('SOLO_CODE','Enter four digits from 1 to 6; repeats are allowed.');if(p.guesses.includes(value))throw new DomainError('SOLO_DUPLICATE','That code was already guessed.');p.guesses.push(value);const score=scoreCode(p.code!,[...value].map(Number));p.feedback.push(score);if(score.exact===4)p.outcome='won';else if(p.guesses.length>=10)p.outcome='lost';
 }
 return p;
}
/** This is the only puzzle projection used by Discord; secrets stay in saved state. */
export function puzzleView(p:SoloPuzzle){const closed=p.outcome!=='playing';return{game:p.game,options:p.options,outcome:p.outcome,letters:p.letters,guesses:p.guesses,feedback:p.feedback,mistakes:p.mistakes,word:p.word?(closed?p.word:[...p.word].map(c=>p.game==='hangman'&&p.letters.includes(c)?c:'_').join('')):undefined,scrambled:p.scrambled,code:closed?p.code:undefined,board:p.game==='minesweeper'?Array.from({length:p.options.boardSize!**2},(_,cell)=>p.flags.includes(cell)&&!p.revealed.includes(cell)&&!closed?'flag':p.revealed.includes(cell)||closed?p.mines?.includes(cell)?'mine':neighbors(cell,p.options.boardSize!).filter(n=>p.mines?.includes(n)).length:'hidden'):undefined};}
