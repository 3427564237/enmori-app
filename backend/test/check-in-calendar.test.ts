import assert from 'node:assert/strict';
import test from 'node:test';
import {OwnCheckInCalendar}from '../src/check-ins/application/check-in-calendar.js';
import {FirestoreCheckInCalendar}from '../src/check-ins/infrastructure/firestore-check-in-calendar.js';
import {ok}from '../src/shared/domain/result.js';
import {createAuthBindingDocumentId}from '../src/shared/infrastructure/firebase/firestore-records.js';
import type {CalendarDayWindow}from '../src/check-ins/ports/check-in-calendar.js';
const principal={firebaseUid:'owner'};
test('calendar counts each civil day including DST and skipped days without UTC-date drift',async()=>{
 let captured:readonly CalendarDayWindow[]=[];
 const calendar=new OwnCheckInCalendar({countDays:async(uid,days)=>{assert.equal(uid,'owner');captured=days;return ok(days.map(day=>({date:day.date,count:day.empty?0:2})));}});
 const result=await calendar.execute({principal,month:'2026-03',timeZone:'America/New_York'});assert.equal(result.ok,true);assert.equal(captured.length,31);
 const dst=captured.find(day=>day.date==='2026-03-08')!;
 assert.equal(Date.parse(dst.endUtc!)-Date.parse(dst.startUtc),23*3600000);
 await calendar.execute({principal,month:'2011-12',timeZone:'Pacific/Apia'});
 assert.equal(captured.find(day=>day.date==='2011-12-30')!.empty,true);
 await calendar.execute({principal,month:'2028-02',timeZone:'Asia/Singapore'});assert.equal(captured.length,29);assert.equal(captured[0]!.startUtc,'2028-01-31T16:00:00.000Z');
});
test('malformed month and ambiguous zone rejected before repository reads',async()=>{
 let calls=0;const calendar=new OwnCheckInCalendar({countDays:async()=>{calls++;return ok([]);}});
 for(const [month,timeZone]of [['2026-2','UTC'],['2026-13','UTC'],['0000-01','UTC'],['2026-02','EST'],['2026-02','+08:00'],['2026-02','invalid']])assert.equal((await calendar.execute({principal,month:month!,timeZone:timeZone!})).ok,false);
 assert.equal(calls,0);
});
test('count query scopes all days to authenticated owner in same transaction and denies missing onboarding',async()=>{
 const reads:string[]=[],owners:string[]=[];
 const repository=new FirestoreCheckInCalendar({runTransaction:async work=>work({get:async path=>{reads.push(path);return path===`auth_bindings/${createAuthBindingDocumentId('owner')}`?{accountId:'internal'}:path==='accounts/internal'?{username:'member_a',optionalProcessingConsent:'rejected',checkInVisibility:'private',onboardingCompletedAt:'2026-10-19T01:00:00.000Z'}:undefined;},countCheckIns:async input=>{owners.push(input.ownerAccountId);return 7;},listCheckInHistoryPage:async()=>[]})});
 const calendar=new OwnCheckInCalendar(repository);
 const result=await calendar.execute({principal,month:'2026-10',timeZone:'UTC'});assert.equal(result.ok,true);if(result.ok)assert.equal(result.value.days[0]!.count,7);
 assert.equal(owners.length,31);assert.deepEqual(new Set(owners),new Set(['internal']));assert.equal(reads.length,2);
 const absent=await calendar.execute({principal:{firebaseUid:'missing'},month:'2026-10',timeZone:'UTC'});assert.equal(absent.ok,false);if(!absent.ok)assert.equal(absent.failure.code,'ONBOARDING_REQUIRED');
});
