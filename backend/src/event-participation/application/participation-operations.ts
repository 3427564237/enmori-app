import { appFailure,type AppFailure } from '../../shared/application/app-failure.js';
import { err,type Result } from '../../shared/domain/result.js';
import type { ParticipationRepository,ParticipationResult,ParticipationChange } from '../ports/participation-repository.js';

/** HTTP-free application boundary: transaction outcomes gain public use-case
 * meaning here, never vendor messages or Infrastructure exception inspection. */
export class ParticipationOperations {
  constructor(private readonly repository: ParticipationRepository){}
  private async execute<T>(work:()=>ParticipationResult<T>):Promise<Result<T,AppFailure>>{
    try{const r=await work();return r.ok?r:err(appFailure(r.failure.code));}
    catch{return err(appFailure('SERVICE_UNAVAILABLE'));}
  }
  authorize(uid:string){return this.execute(()=>this.repository.authorize(uid));}
  read(uid:string,eventId:string){return this.execute(()=>this.repository.read(uid,eventId));}
  save(uid:string,eventId:string,change:ParticipationChange){return this.execute(()=>this.repository.save(uid,eventId,change));}
  participants(uid:string,eventId:string,status:'interested'|'going',group:'friends'|'others',cursor?:string){return this.execute(()=>this.repository.participants(uid,eventId,status,group,cursor));}
  list(uid:string,username?:string,cursor?:string){return this.execute(()=>this.repository.list(uid,username,cursor));}
}
