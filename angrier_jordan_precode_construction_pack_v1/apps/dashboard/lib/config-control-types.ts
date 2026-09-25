export type ControlKind='toggle'|'number'|'select'|'channel-select'|'role-select'|'json-editor'|'text';
export interface DashboardControl {key:string;section:string;label:string;description:string;kind:ControlKind;defaultValue:unknown;min?:number;max?:number;choices?:string[];risk:string;editableBy:string[];restartRequired:boolean;dashboardWrite?:'live'|'draft'|'blocked';dependsOn?:string[];}
