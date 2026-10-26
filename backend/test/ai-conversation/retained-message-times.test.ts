import test from "node:test";
import assert from "node:assert/strict";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { withRetainedMessageTimes } from "../../src/ai-conversation/infrastructure/retained-message-times.js";
import type { FirestoreGateway, FirestoreTransactionGateway as Tx, StoredDocument as Row } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
const occurrence="accounts/synthetic-owner/proactive_occurrences/synthetic-intent",state="accounts/synthetic-owner/proactive_state/current";
function fixture(){
  const rows=new Map<string,Row>(),commit=new Timestamp(1800000000,123456789);let calls=0;
  const transform=(value:unknown):unknown=>value instanceof FieldValue?commit:Array.isArray(value)?value.map(transform):value&&typeof value==="object"&&!(value instanceof Timestamp)?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,transform(v)])):value;
  const gateway:FirestoreGateway={runTransaction:async<T>(work:(tx:Tx)=>Promise<T>,options?:{readonly maxAttempts:1})=>{
    assert.deepEqual(options,{maxAttempts:1});calls++;const pending=new Map(rows);let writing=false;
    const tx:Tx={get:async p=>{assert.equal(writing,false);return pending.get(p);},list:async()=>[],create:(p,d)=>{writing=true;assert(!pending.has(p));pending.set(p,d);},set:(p,d)=>{writing=true;pending.set(p,d);}};
    const result=await work(tx);rows.clear();for(const [p,d]of pending)rows.set(p,transform(d) as Row);return result;
  }};
  return {rows,commit,gateway:withRetainedMessageTimes(gateway),calls:()=>calls};
}
test("canonical publication and bounded budget use the SAME actual service commit timestamp, not callback admission",async()=>{
  const f=fixture(),admission="2026-10-25T10:00:00.000Z";f.rows.set(occurrence,{state:"reserved",revision:2});
  await f.gateway.runTransaction(async tx=>{await tx.get(occurrence);tx.set(occurrence,{state:"published",revision:3,publishedAt:admission});tx.set(state,{revision:1,rollingAttemptTimes:[admission]});},{maxAttempts:1});
  assert.equal(f.rows.get(occurrence)!.publishedAt,f.commit);assert.equal(f.rows.get(state)!.lastAttemptedAt,f.commit);assert.deepEqual(f.rows.get(state)!.rollingAttemptTimes,[]);
  await f.gateway.runTransaction(async tx=>{const occurrenceRow=(await tx.get(occurrence))!,s=(await tx.get(state))!;
    assert.equal(occurrenceRow.publishedAt,"2027-01-15T08:00:00.123Z");assert.deepEqual(s.rollingAttemptTimes,["2027-01-15T08:00:00.124Z"]);assert(!Object.hasOwn(s,"lastAttemptedAt"));
    tx.set(occurrence,{...occurrenceRow,revision:4,dispatchState:"accepted"});tx.set(state,{...s,revision:2});},{maxAttempts:1});
  assert.equal(f.rows.get(occurrence)!.publishedAt,f.commit);assert.equal(f.rows.get(state)!.lastAttemptedAt,f.commit);
});
test("a later settings/result update cannot renew publication or reset the canonical charge",async()=>{
  const f=fixture();f.rows.set(occurrence,{state:"published",publishedAt:f.commit});
  await assert.rejects(f.gateway.runTransaction(async tx=>{const r=(await tx.get(occurrence))!;tx.set(occurrence,{...r,publishedAt:"2028-01-01T00:00:00.000Z"});},{maxAttempts:1}));
  assert.equal(f.rows.get(occurrence)!.publishedAt,f.commit);
});
test("missing or caller-shaped commit evidence is unavailable, without legacy timestamp backfill",async()=>{
  for(const row of [{state:"published",publishedAt:"2026-10-25T10:00:00.000Z"},{state:"published",publishedAt:{seconds:1,nanoseconds:2}}]){
    const f=fixture();f.rows.set(occurrence,row);await assert.rejects(f.gateway.runTransaction(async tx=>{await tx.get(occurrence);},{maxAttempts:1}));
  }
  const f=fixture();f.rows.set(state,{rollingAttemptTimes:["2026-10-25T10:00:00.000Z"]});await assert.rejects(f.gateway.runTransaction(async tx=>{await tx.get(state);},{maxAttempts:1}));
});
test("unobserved published transition cannot forge a server timestamp",async()=>{
  const f=fixture();await assert.rejects(f.gateway.runTransaction(async tx=>{tx.set(occurrence,{state:"published",publishedAt:"2026-10-25T10:00:00.000Z"});},{maxAttempts:1}));assert.equal(f.rows.size,0);
});
