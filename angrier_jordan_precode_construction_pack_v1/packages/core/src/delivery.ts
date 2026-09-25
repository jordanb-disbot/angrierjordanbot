import {DomainError} from './errors.js';
export interface DeliveryState {state:'PENDING'|'SENDING'|'SENT';messageId?:string;}
export interface DeliveryRepository {read():Promise<DeliveryState>;claim():Promise<boolean>;complete(messageId:string):Promise<void>;}
export interface DeliveryTransport {find(marker:string):Promise<string|null>;send(marker:string):Promise<string>;}
/** One durable send intent; uncertain network outcomes are reconciled, never blindly resent. */
export class DeliveryEngine {
 constructor(private readonly repository:DeliveryRepository){}
 async deliver(marker:string,transport:DeliveryTransport):Promise<string>{
  const current=await this.repository.read();if(current.state==='SENT'&&current.messageId)return current.messageId;
  if(current.state==='SENDING'){
   const found=await transport.find(marker);if(found){await this.repository.complete(found);return found;}
   throw new DomainError('DELIVERY_UNCERTAIN','Delivery may have succeeded. Reconcile the destination before retrying.');
  }
  if(!await this.repository.claim())throw new DomainError('DELIVERY_BUSY','Another worker owns this delivery.');
  const id=await transport.send(marker);await this.repository.complete(id);return id;
 }
}
