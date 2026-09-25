export type Align='left'|'center'|'right';
export type Tone='normal'|'success'|'warning'|'danger'|'muted';
export type UiNode =
  | {kind:'frame';title:string;subtitle?:string;children:UiNode[]}
  | {kind:'text';text:string;size?:number;weight?:number;align?:Align;tone?:Tone;maxChars?:number;lineHeight?:number}
  | {kind:'options';items:{key:string;label:string;votes?:number;percent?:number}[];columns?:number}
  | {kind:'timer';label:string;remainingSeconds:number;totalSeconds:number}
  | {kind:'stats';items:{label:string;value:string}[]}
  | {kind:'banner';text:string;tone:Tone};
export interface RenderDocument { width:number;height:number;nodes:UiNode[]; }
