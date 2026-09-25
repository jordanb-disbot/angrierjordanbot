export interface FakeMember { userId:string;role:'member'|'recliner'|'chaise_lounge'|'throne';jailed?:boolean; }
export interface FakeInteraction { guildId:string;channelId:string;member:FakeMember;commandId:string;options:Record<string,unknown>; }
export class InteractionHarness {
  public replies:{ephemeral:boolean;content?:string}[]=[];
  reply(ephemeral:boolean,content?:string):void{this.replies.push({ephemeral,...(content===undefined?{}:{content})});}
  clear():void{this.replies=[];}
}
