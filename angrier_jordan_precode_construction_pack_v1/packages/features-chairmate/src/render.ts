export type ChessCard={challenger:string;opponent:string;timeControl:string;status:string;challengerColor?:string|undefined;opponentColor?:string|undefined;outcome?:string|undefined;replay?:string|undefined};
export function chessCardText(v:ChessCard){
 const seats=v.challengerColor&&v.opponentColor?`\nWhite: **${v.challengerColor==='white'?v.challenger:v.opponent}** · Black: **${v.challengerColor==='black'?v.challenger:v.opponent}**`:'';
 const ending=v.outcome?`\nResult: **${v.outcome}**${v.replay?` · [Replay](${v.replay})`:''}`:'';
 return `♟️ **CHAIRMATE**\n**${v.challenger}** vs **${v.opponent}** · ${v.timeControl}\n${v.status}${seats}${ending}`;
}
