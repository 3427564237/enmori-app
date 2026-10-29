import assert from "node:assert/strict";
import type { FirestoreGateway, FirestoreTransactionGateway as Tx, StoredDocument as Row, StoredDocumentSnapshot as Snapshot } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
export class MetadataFirestoreGateway implements FirestoreGateway {
  rows=new Map<string,Snapshot>();now:number;calls=0;writes=0;loseAck=false;failAtWrite:number|undefined;beforeCommit:(()=>void)|undefined;onRead:((path:string)=>void)|undefined;
  constructor(now:number){this.now=now;}
  put(path:string,data:Row,created=this.now){const previous=this.rows.get(path);this.rows.set(path,{id:path.split("/").at(-1)!,data:structuredClone(data),createTime:previous?.createTime??{seconds:Math.floor(created/1000),nanoseconds:created%1000*1e6},updateTime:{seconds:Math.floor(this.now/1000),nanoseconds:this.now%1000*1e6}});}
  async runTransaction<T>(work:(tx:Tx)=>Promise<T>,options?:{readonly maxAttempts:1}):Promise<T>{
    assert.deepEqual(options,{maxAttempts:1});this.calls++;const rows=new Map([...this.rows].map(([k,v])=>[k,structuredClone(v)]));let wrote=false,count=0;
    const read=async<T>(path:string,v:T)=>{assert.equal(wrote,false,"no read after staged write");this.onRead?.(path);await Promise.resolve();return structuredClone(v);};
    const entries=(path:string)=>[...rows.entries()].filter(([k])=>k.startsWith(`${path}/`)&&!k.slice(path.length+1).includes("/")).map(([,v])=>v);
    const stage=(path:string,data:Row)=>{wrote=true;count++;if(this.failAtWrite===count)throw Error("private staged write failure");const prev=rows.get(path);rows.set(path,{id:path.split("/").at(-1)!,data:structuredClone(data),createTime:prev?.createTime??{seconds:Math.floor(this.now/1000),nanoseconds:this.now%1000*1e6},updateTime:{seconds:Math.floor(this.now/1000),nanoseconds:this.now%1000*1e6}});};
    const tx:Tx={get:p=>read(p,rows.get(p)?.data),getSnapshot:p=>read(p,rows.get(p)),list:p=>read(p,entries(p).map(v=>({id:v.id,data:v.data}))),listSnapshots:p=>read(p,entries(p)),
      listPage:(p,after,limit)=>read(p,entries(p).filter(r=>after===undefined||r.id>after).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).slice(0,limit)),
      listOwnCheckInDayPage:input=>read("check_ins:own-day",entries("check_ins")
        .filter(r=>r.data.ownerAccountId===input.ownerAccountId&&typeof r.data.createdAt==="string"&&r.data.createdAt>=input.startUtc&&r.data.createdAt<=input.asOf&&
          (input.endUtc===null||r.data.createdAt<input.endUtc))
        .sort((a,b)=>String(b.data.createdAt).localeCompare(String(a.data.createdAt))||(a.id>b.id?-1:a.id<b.id?1:0)).slice(0,input.limit)
        .map(r=>({id:r.id,data:{ownerAccountId:r.data.ownerAccountId,createdAt:r.data.createdAt}}))),
      listMessagePage:(p,before)=>read(p,entries(p).filter(r=>before===undefined||(r.data.sequence as number)<before).sort((a,b)=>(b.data.sequence as number)-(a.data.sequence as number)).slice(0,20)),
      create:(p,d)=>{assert.equal(rows.has(p),false);stage(p,d);},set:stage,delete:p=>{wrote=true;count++;rows.delete(p);}};
    const result=await work(tx);this.beforeCommit?.();this.rows=rows;this.writes+=count;if(this.loseAck){this.loseAck=false;throw Error("private lost ACK");}return result;
  }
}
