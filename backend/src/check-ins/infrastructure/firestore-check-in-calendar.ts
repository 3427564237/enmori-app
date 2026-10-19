import { appFailure,type AppFailure } from '../../shared/application/app-failure.js';
import { err,ok,type Result } from '../../shared/domain/result.js';
import {createAuthBindingDocumentId,parseAuthBinding,parseAccountProjection}from '../../shared/infrastructure/firebase/firestore-records.js';
import type {CheckInHistoryFirestoreGateway}from '../ports/check-in-history-firestore-gateway.js';
import type {CheckInCalendarRepository,CalendarDayWindow,CalendarDayCount}from '../ports/check-in-calendar.js';
export class FirestoreCheckInCalendar implements CheckInCalendarRepository{
 constructor(private readonly gateway:CheckInHistoryFirestoreGateway){}
 async countDays(firebaseUid:string,days:readonly CalendarDayWindow[]):Promise<Result<readonly CalendarDayCount[],AppFailure>>{
  const bindingId=createAuthBindingDocumentId(firebaseUid);
  if(!bindingId)return err(appFailure('SERVICE_UNAVAILABLE'));
  try{return await this.gateway.runTransaction(async tx=>{
   const binding=await tx.get(`auth_bindings/${bindingId}`);
   if(!binding)return err(appFailure('ONBOARDING_REQUIRED'));
   const owner=parseAuthBinding(binding);
   if(!owner)return err(appFailure('SERVICE_UNAVAILABLE'));
   const account=await tx.get(`accounts/${owner}`);
   if(!account||!parseAccountProjection(account)||!tx.countCheckIns)return err(appFailure('SERVICE_UNAVAILABLE'));
   const counts=await Promise.all(days.map(async day=>({date:day.date,count:day.empty?0:await tx.countCheckIns!({ownerAccountId:owner,startUtc:day.startUtc,endUtc:day.endUtc})})));
   if(counts.some(day=>!Number.isSafeInteger(day.count)||day.count<0))return err(appFailure('SERVICE_UNAVAILABLE'));
   return ok(counts);
  });}catch{return err(appFailure('SERVICE_UNAVAILABLE'));}
 }
}
