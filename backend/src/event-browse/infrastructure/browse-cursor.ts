import {createHash,createHmac,timingSafeEqual} from 'node:crypto';

/** Private, owner-bound position, not a provider query or credential. */
export class BrowseCursor {
  constructor(private readonly key:Uint8Array){if(key.byteLength<32)throw new Error('Private cursor key required');}
  private owner(uid:string):string{return createHash('sha256').update(`event-browse-v2:${uid}`).digest('hex');}
  private sign(body:string):Buffer{return createHmac('sha256',this.key).update(`event-browse-v2:${body}`).digest();}
  encode(uid:string,asOf:string,page:number):string{
    const body=Buffer.from(JSON.stringify([2,this.owner(uid),asOf,page])).toString('base64url');
    return `${body}.${this.sign(body).toString('base64url')}`;
  }
  decode(uid:string,token:string,now:Date):{asOf:string;page:number}|undefined{
    try{
      if(token.length>512||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token))return;
      const [body,signature]=token.split('.') as [string,string];
      const bytes=Buffer.from(body,'base64url'), sig=Buffer.from(signature,'base64url');
      if(bytes.toString('base64url')!==body||sig.toString('base64url')!==signature||!timingSafeEqual(sig,this.sign(body)))return;
      const v:unknown=JSON.parse(bytes.toString('utf8'));
      if(!Array.isArray(v)||v.length!==4||v[0]!==2||v[1]!==this.owner(uid)||typeof v[2]!=='string'||!Number.isSafeInteger(v[3])||v[3]<1||v[3]>49)return;
      const time=new Date(v[2]);
      if(!Number.isFinite(time.getTime())||time.toISOString()!==v[2]||now.getTime()<time.getTime()||now.getTime()-time.getTime()>=300000)return;
      return {asOf:v[2],page:v[3] as number};
    }catch{return;}
  }
}
