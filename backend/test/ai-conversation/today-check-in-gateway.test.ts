import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { FirebaseAdminFirestoreGateway } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
import { withRetainedMessageTimes } from "../../src/ai-conversation/infrastructure/retained-message-times.js";

test("actual Admin query retains owner/day/server upper bound, descending ID tie, six rows and metadata projection",async()=>{
  const calls:unknown[][]=[];
  const query={where:(...args:unknown[])=>{calls.push(["where",...args]);return query;},orderBy:(field:unknown,direction:unknown)=>{calls.push(["orderBy",String(field),direction]);return query;},
    select:(...args:unknown[])=>{calls.push(["select",...args]);return query;},limit:(count:number)=>{calls.push(["limit",count]);return query;}};
  const tx={get:async(value:unknown)=>{assert.equal(value,query);return {docs:[{id:"owned",data:()=>({ownerAccountId:"owner",createdAt:"2026-10-25T09:00:00.000Z"})}]};}} as unknown as Transaction;
  const db={collection:(name:string)=>{assert.equal(name,"check_ins");return query;},runTransaction:async<T>(work:(value:Transaction)=>Promise<T>,options:unknown)=>{assert.deepEqual(options,{maxAttempts:1});return work(tx);}} as unknown as Firestore;
  const gateway=withRetainedMessageTimes(new FirebaseAdminFirestoreGateway(db));
  const result=await gateway.runTransaction(value=>value.listOwnCheckInDayPage!({ownerAccountId:"owner",startUtc:"2026-10-24T16:00:00.000Z",endUtc:"2026-10-25T16:00:00.000Z",asOf:"2026-10-25T10:00:00.000Z",limit:6}),{maxAttempts:1});
  assert.deepEqual(result,[{id:"owned",data:{ownerAccountId:"owner",createdAt:"2026-10-25T09:00:00.000Z"}}]);
  assert.deepEqual(calls.filter(c=>c[0]==="where"),[["where","ownerAccountId","==","owner"],["where","createdAt",">=","2026-10-24T16:00:00.000Z"],["where","createdAt","<=","2026-10-25T10:00:00.000Z"],["where","createdAt","<","2026-10-25T16:00:00.000Z"]]);
  assert.deepEqual(calls.filter(c=>c[0]==="orderBy"),[["orderBy","createdAt","desc"],["orderBy","__name__","desc"]]);
  assert.deepEqual(calls.filter(c=>c[0]==="select"||c[0]==="limit"),[["select","ownerAccountId","createdAt"],["limit",6]]);
});
