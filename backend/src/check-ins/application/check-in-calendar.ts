import { Temporal } from '@js-temporal/polyfill';
import type { AuthPrincipal } from '../../shared/ports/identity-verifier.js';
import { appFailure } from '../../shared/application/app-failure.js';
import { err, ok } from '../../shared/domain/result.js';
import { parseCivilDay } from './check-in-history.js';
import type { CheckInCalendarRepository,CalendarDayWindow } from '../ports/check-in-calendar.js';
export class OwnCheckInCalendar {
 constructor(private readonly repository:CheckInCalendarRepository){}
 async execute(input:{principal:AuthPrincipal;month:string;timeZone:string}){
  const days:CalendarDayWindow[]=[];
  try{
   if(!/^\d{4}-\d{2}$/.test(input.month))return err(appFailure('REQUEST_INVALID'));
   const month=Temporal.PlainYearMonth.from(input.month);
   if(month.year<1||month.year>9999)return err(appFailure('REQUEST_INVALID'));
   for(let day=1;day<=month.daysInMonth;day++){
    const window=parseCivilDay(`${input.month}-${String(day).padStart(2,'0')}`,input.timeZone);
    if(!window)return err(appFailure('REQUEST_INVALID'));
    days.push(window);
   }
  }catch{return err(appFailure('REQUEST_INVALID'));}
  const result=await this.repository.countDays(input.principal.firebaseUid,days);
  return result.ok?ok({month:input.month,timeZone:input.timeZone,days:result.value}):result;
 }
}
