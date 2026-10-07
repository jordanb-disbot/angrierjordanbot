export const CHAIRMAN_CHANNEL_ID='1542237214849769592';
export const TIME_CONTROLS={bullet_1_0:{label:'1 + 0',limit:60,increment:0},bullet_2_1:{label:'2 + 1',limit:120,increment:1},blitz_3_0:{label:'3 + 0',limit:180,increment:0},blitz_5_0:{label:'5 + 0',limit:300,increment:0},rapid_10_0:{label:'10 + 0',limit:600,increment:0},rapid_15_10:{label:'15 + 10',limit:900,increment:10}} as const;
export type TimeControl=keyof typeof TIME_CONTROLS;
export function timeControl(value:string):TimeControl{if(!(value in TIME_CONTROLS))throw new Error('Choose one of the supported Chairmate time controls.');return value as TimeControl;}
export type LichessGame={challengeId:string;gameId?:string;gameUrl:string;whiteUrl:string;blackUrl:string};
export type LichessOutcome={finished:boolean;status?:string|undefined;winnerColor?:'white'|'black'|undefined;result?:string|undefined};
export interface LichessAdapter{createGuestGame(input:{limit:number;increment:number;idempotencyKey:string}):Promise<LichessGame>; game(id:string):Promise<LichessOutcome>;}
