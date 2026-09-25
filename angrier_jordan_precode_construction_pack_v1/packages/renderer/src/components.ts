import type { RenderDocument, UiNode } from './dsl.js';
export const loungeFrame=(title:string,subtitle:string|undefined,children:UiNode[]):RenderDocument=>({width:1200,height:675,nodes:[subtitle===undefined?{kind:'frame',title,children}:{kind:'frame',title,subtitle,children}]});
export const votingOptions=(a:string,b:string,votes?:{A:number;B:number}):UiNode=>{
  const total=(votes?.A??0)+(votes?.B??0);
  const item=(key:string,label:string,count:number|undefined)=>{
    const base:{key:string;label:string;votes?:number;percent?:number}={key,label};
    if(count!==undefined)base.votes=count;
    if(count!==undefined&&total>0)base.percent=count/total*100;
    return base;
  };
  return {kind:'options',items:[item('A',a,votes?.A),item('B',b,votes?.B)]};
};
