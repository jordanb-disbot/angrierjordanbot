import {randomInt} from 'node:crypto';
import {DomainError} from '../../core/src/index.js';
export type PvpGame='tictactoe'|'connectfour'|'battleship';
export type Seat=0|1;
export type Fleet=number[][];
export interface Shot {cell:number;hit:boolean;sunk:boolean;}
export interface Board {game:PvpGame;cells:number[];turn:Seat;shots:[Shot[],Shot[]];}
export const other=(seat:Seat):Seat=>seat===0?1:0;
export const gameNames:Record<PvpGame,string>={tictactoe:'Tic-Tac-Toe',connectfour:'Connect Four',battleship:'Battleship'};
export function createBoard(game:PvpGame):Board {if(!Object.hasOwn(gameNames,game))throw new DomainError('PVP_GAME','Choose a supported skill game.');return{game,cells:Array(game==='tictactoe'?9:game==='connectfour'?42:0).fill(0),turn:0,shots:[[],[]]};}
function integer(value:number,max:number){if(!Number.isInteger(value)||value<0||value>=max)throw new DomainError('PVP_MOVE','Choose a valid board position.');}
export function boardMove(board:Board,seat:Seat,choice:number):{board:Board;winner?:Seat;draw:boolean}{
 if(board.game==='battleship')throw new DomainError('PVP_MOVE','Use Fire on your private Battleship board.');
 if(board.turn!==seat)throw new DomainError('PVP_TURN','Wait for your turn.');
 const width=board.game==='tictactoe'?3:7,height=board.game==='tictactoe'?3:6,needed=board.game==='tictactoe'?3:4,cells=[...board.cells];let cell=choice;
 integer(choice,board.game==='tictactoe'?9:7);
 if(board.game==='connectfour'){cell=-1;for(let row=height-1;row>=0;row--)if(cells[row*width+choice]===0){cell=row*width+choice;break;}}
 if(cell<0||cells[cell]!==0)throw new DomainError('PVP_OCCUPIED','That position is full. Choose another.');cells[cell]=seat+1;
 const x=cell%width,y=Math.floor(cell/width);let won=false;
 for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]] as const){let count=1;for(const sign of [-1,1])for(let n=1;n<needed;n++){const nx=x+dx*n*sign,ny=y+dy*n*sign;if(nx<0||nx>=width||ny<0||ny>=height||cells[ny*width+nx]!==seat+1)break;count++;}if(count>=needed)won=true;}
 return{board:{...board,cells,turn:other(seat)},...(won?{winner:seat}:{}),draw:!won&&cells.every(c=>c!==0)};
}
export function coordinate(value:string){const m=/^([A-J])(10|[1-9])$/i.exec(value.trim());if(!m)throw new DomainError('PVP_COORDINATE','Use coordinates A1 through J10.');return(m[1]!.toUpperCase().charCodeAt(0)-65)*10+Number(m[2])-1;}
export function coordinateLabel(cell:number){integer(cell,100);return String.fromCharCode(65+Math.floor(cell/10))+(cell%10+1);}
export function validateFleet(fleet:Fleet):Fleet {
 if(!Array.isArray(fleet)||fleet.length!==5)throw new DomainError('PVP_FLEET','Place all five ships: 5, 4, 3, 3 and 2 cells.');
 const occupied=new Set<number>(),lengths=fleet.map(s=>s.length).sort((a,b)=>b-a);if(lengths.join(',')!=='5,4,3,3,2')throw new DomainError('PVP_FLEET','Ship lengths must be 5, 4, 3, 3 and 2.');
 return fleet.map(ship=>{const cells=[...ship].sort((a,b)=>a-b);for(const cell of cells){integer(cell,100);if(occupied.has(cell))throw new DomainError('PVP_FLEET','Ships cannot overlap.');occupied.add(cell);}const horizontal=cells.every((c,i)=>Math.floor(c/10)===Math.floor(cells[0]!/10)&&c===cells[0]!+i),vertical=cells.every((c,i)=>c===cells[0]!+10*i);if(!horizontal&&!vertical)throw new DomainError('PVP_FLEET','Each ship must be a straight, continuous row or column.');return cells;});
}
export function parseFleet(ranges:string[]):Fleet {return validateFleet(ranges.map(range=>{const parts=range.trim().split(/\s*-\s*/);if(parts.length!==2)throw new DomainError('PVP_FLEET','Enter each ship as a range, such as A1-A5.');const from=coordinate(parts[0]!),to=coordinate(parts[1]!),lo=Math.min(from,to),hi=Math.max(from,to);const step=Math.floor(lo/10)===Math.floor(hi/10)?1:10;if(step===10&&lo%10!==hi%10)throw new DomainError('PVP_FLEET','Ships must run horizontally or vertically.');return Array.from({length:(hi-lo)/step+1},(_,i)=>lo+i*step);}));}
export function autoFleet(rng:(max:number)=>number=randomInt):Fleet {const ships:Fleet=[],occupied=new Set<number>();for(const length of [5,4,3,3,2]){const candidates:Fleet=[];for(let cell=0;cell<100;cell++)for(const step of [1,10]){const cells=Array.from({length},(_,i)=>cell+i*step);if(cells.some(c=>c>=100||occupied.has(c))||step===1&&Math.floor(cell/10)!==Math.floor(cells.at(-1)!/10))continue;candidates.push(cells);}const pick=rng(candidates.length);integer(pick,candidates.length);const ship=candidates[pick]!;ships.push(ship);ship.forEach(c=>occupied.add(c));}return validateFleet(ships);}
export function fire(board:Board,seat:Seat,cell:number,opponent:Fleet):{board:Board;winner?:Seat;draw:false}{
 if(board.game!=='battleship'||board.turn!==seat)throw new DomainError('PVP_TURN','Wait for your Battleship turn.');integer(cell,100);const fleet=validateFleet(opponent),previous=board.shots[seat];if(previous.some(s=>s.cell===cell))throw new DomainError('PVP_FIRED','You already fired at that coordinate.');
 const ship=fleet.find(s=>s.includes(cell)),hit=Boolean(ship),sunk=Boolean(ship?.every(c=>c===cell||previous.some(s=>s.cell===c&&s.hit))),shots:[Shot[],Shot[]]=[[...board.shots[0]],[...board.shots[1]]];shots[seat].push({cell,hit,sunk});const won=fleet.flat().every(c=>shots[seat].some(s=>s.cell===c&&s.hit));return{board:{...board,shots,turn:other(seat)},...(won?{winner:seat}:{}),draw:false};
}
