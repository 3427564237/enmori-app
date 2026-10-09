import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ok, err } from "../src/shared/domain/result.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { InMemoryFirestoreGateway, FailingFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { FirestoreFriendRepository, friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { FriendRequests } from "../src/friends/application/friend-requests.js";
import { FirestoreEventDetailRepository, parseEventDetail } from "../src/event-detail/infrastructure/firestore-event-detail-repository.js";
import { GetEventDetail } from "../src/event-detail/application/get-event-detail.js";
import { buildApp } from "../src/bootstrap/build-app.js";
import { targetSchema, eventDetailSchema, friendInboxSchema, friendActionSchema } from "../src/transport/register-isolated-slices.js";

test("Event Detail keeps calendar-exact UTC and nanosecond ordering without recommendation Infrastructure", () => {
  const record = {title:"Synthetic",startAt:"2026-10-06T00:00:00.000000001Z",endAt:"2026-10-06T00:00:00.000000002Z",externalSourceUrl:"https://example.invalid/synthetic-event",available:true,validUntil:"2026-10-07T00:00:00Z"};
  const urls = [record.externalSourceUrl], now = BigInt(new Date("2026-10-05T00:00:00Z").getTime()) * 1000000n;
  assert.notEqual(parseEventDetail("ev",record,urls,now),undefined);
  for (const field of ["startAt","endAt","validUntil"] as const) {
    for (const invalid of ["2026-02-30T00:00:00Z","2026-10-06T00:00:00.1234567890Z","2026-10-06T00:00:00+00:00"]) {
      assert.equal(parseEventDetail("ev",{...record,[field]:invalid},urls,now),undefined);
    }
  }
  assert.equal(parseEventDetail("ev",{...record,endAt:record.startAt},urls,now),undefined);
  assert.equal(parseEventDetail("ev",{...record,endAt:"2026-10-06T00:00:00.000000000Z"},urls,now),undefined);
});

const instant = "2026-10-05T00:00:00.000Z", sourceUrl = "https://example.invalid/synthetic-event";
const base = { optionalProcessingConsent:"rejected", checkInVisibility:"private", onboardingCompletedAt:instant, profileVisibility:"private",profileRevision:1 };
const seed = () => Object.fromEntries([
  ...["a","b","c"].flatMap(id => [
    [`auth_bindings/${createAuthBindingDocumentId(id)!}`,{accountId:id}],
    [`accounts/${id}`,{...base,username:`member_${id}`,displayName:`Member ${id}`}],
    [`username_reservations/member_${id}`,{accountId:id}],
    [`friend_access/${id}`,{eligibilityState:"eligible"}],
  ] as const),
  [`friend_pairs/${friendPairKey("a","b")}`,{accountIds:["a","b"],blockedByAccountIds:[],friendship:false,pending:null}],
]);
const detail = {title:"Synthetic event",startAt:"2026-10-06T00:00:00.000000001Z",externalSourceUrl:sourceUrl,available:true,validUntil:"2026-10-07T00:00:00.000Z"};
function fixture() {
  let date = new Date(instant);
  const clock = {now:()=>ok(new Date(date))};
  const gateway = new InMemoryFirestoreGateway(seed());
  const repo = new FirestoreFriendRepository(gateway,clock);
  return {gateway,repo,app:new FriendRequests(repo,clock),clock,setTime:(value:string)=>{date=new Date(value);}};
}
async function reference(f: ReturnType<typeof fixture>): Promise<string> {
  const inbox = await f.repo.inbox("b"); assert.equal(inbox.ok,true); if(!inbox.ok) assert.fail();
  return inbox.value.requests[0]!.requestRef;
}

test("exact lookup is read-only, minimized, canonicalized and strict; missing authority is protected",async()=>{
  const f=fixture(),before=f.gateway.entries();
  assert.deepEqual(await f.app.lookup({firebaseUid:"a"}," MEMBER_B "),ok({username:"member_b",displayName:"Member b",relationshipState:"can_send_request"}));
  assert.deepEqual(f.gateway.entries(),before);
  for(const username of ["member","member_z","member_c"]) assert.deepEqual(await f.app.lookup({firebaseUid:"a"},username),err(appFailure("ADD_FRIEND_TARGET_UNAVAILABLE")));
  assert.deepEqual(await f.app.lookup({firebaseUid:"a"},"\tmember_b"),err(appFailure("USERNAME_INVALID")));
  await f.gateway.runTransaction(async tx => tx.set("accounts/b",{...base,username:"member_b",displayName:null}));
  assert.equal((await f.app.lookup({firebaseUid:"a"},"member_b")).ok,false);
});
test("send does not duplicate/cross-accept; recipient alone accepts once; fresh lookup confirms friendship",async()=>{
  const f=fixture(); await f.repo.lookup("a","member_b",true); const ref=await reference(f);
  for(let i=0;i<3;i++) { const sent=await f.repo.lookup("a","member_b",true); assert.equal(sent.ok,true); }
  const reverse=await f.repo.lookup("b","member_a",true); if(!reverse.ok) assert.fail(); assert.equal(reverse.value.relationshipState,"incoming_request_pending");
  assert.equal(await reference(f),ref);
  assert.deepEqual(await f.repo.act("a",ref,"accept"),err("request_unavailable"));
  assert.deepEqual(await-yã»h‘éì¶»§q«^tŸK]WÛ[Z]žÝ]Nˆž‹œ™\X]
ŒJ_K[šÛ›ÝÛ—ÙšY[žÜ›ÝšY\”^[ØYžß_K™[[Ý™YžØ]˜Z[X›N™˜[Ù_K^\™YžÝ˜[Y[[š[œÝ[K˜YÝ[YNžÜÝ\]ˆŒŒ‹L‹LÌŒŒˆŸKØØ][Û—Û[Z]žÛØØ][Û“X™[ˆž‹œ™\X]
ŒJ__JJHÂˆ\Ý
]™[]Z[™Z™XÝÈ	ÛX™[HÚ]Ý]ÚY[š[™È™XÛÛ[Y[™][ÛœØ

OO˜\ÜÙ\™\]X[
\œÙQ]™[]Z[
™]ˆ‹Ë‹‹™]Z[‹‹˜Ú[™Ù_KÜÛÝ\˜ÙU\›KšYÒ[
™]È]J[œÝ[
K™Ù][YJ
JJŒLŠK[™Yš[™Y
JNÂŸB\Ý
‘]™[]Z[Ý\ÜÈÛZ]Y[™™\Ù\™\È˜[›ÜÙXÛÛ™ÛÝ\˜ÙH[YH[™ØØ[\ˆ^[Z]È‹\Þ[˜Ê
OOžÂˆÛÛœÝYš^\™J
NÈ]ØZ]‹™Ø]]Ø^Kœ[•˜[œØXÝ[ÛŠ\Þ[˜ÈO˜Ü™X]J™]™[Ù]Z[ËÙ]ˆ‹Ë‹‹™]Z[]Nˆ¼'æ ‹œ™\X]
Œ
_JJNÂˆÛÛœÝ™\Ý[X]ØZ]™]Èš\™\ÝÜ™Q]™[]Z[™\ÜÚ]ÜžJ‹™Ø]]Ø^K‹˜ÛØÚËÜÛÝ\˜ÙU\›JKœ™XY
˜H‹™]ˆŠNÈYŠ\™\Ý[›ÚÊH\ÜÙ\™˜Z[

NÂˆ\ÜÙ\™\]X[
™\Ý[˜[YKœÝ\]]Z[œÝ\]
NØ\ÜÙ\™\]X[
Øš™XÝš\ÓÝÛŠ™\Ý[˜[YK™[™]ŠK˜[ÙJNÈ\ÜÙ\™\]X[
Øš™XÝš\ÓÝÛŠ™\Ý[˜[YK˜]˜Z[X›HŠK˜[ÙJNÂŸJNÂ˜ÛÛœÝ[š\›Û›Y[^ÑS“SÔ’WÑS•’T“Ó“QS•ˆ\Ý‹S“SÔ’WÐÓÓ•“ÓQÔ“Ñ’SWÑT‘PÕÔ–Nˆ‹Ý\Ú\ÛÛ]Y\ÛXÙ\Ë]\Ý‹ÓQNˆ‹Ý\Ú\ÛÛ]Y\ÛXÙ\Ë]\Ý‹TÑT”“Ñ’SNˆ‹Ý\Ú\ÛÛ]Y\ÛXÙ\Ë]\Ý‹TUNˆ‹Ý\Ú\ÛÛ]Y\ÛXÙ\Ë]\Ý‹×ÐÓÓ‘’Q×ÒÓQNˆ‹Ý\Ú\ÛÛ]Y\ÛXÙ\Ë]\Ý‹ÐÓÕQÔ“Ò‘PÕˆ™[[ËY[›[ÜšK\›]œXK\ŒL‹’T‘PTÑWÐUUÑSUSUÔ—ÒÔÕˆŒLËŒŒŒNŽLNH‹’T‘TÕÔ‘WÑSUSUÔ—ÒÔÕˆŒLËŒŒŒNŽŸNÂ˜ÛÛœÝ[˜]˜Z[X›O^Ù^XÝ]N˜\Þ[˜Ê
OO™\œŠ\˜Z[\™J”ÑT•’PÑWÕSURSP“HŠJ_NÂ™[˜Ý[Ûˆ\[™[˜ÚY\Ê
HÈ™]\›ˆÚY[]U™\šYšY\ŽžÝ™\šYžRYÚÙ[Ž˜\Þ[˜ÊÚÙ[ŽœÝš[™ÊOOÚÙ[OOHš[˜[YˆÈÚÚ[™ˆš[˜[Yˆ\ÈÛÛœÝHˆÚÚ[™ˆ™\šYšYYˆ\ÈÛÛœÝš[˜Ú\[žÙš\™X˜\ÙUZYÚÙ[Ÿ__KÛÛ\]SÛ˜›Ø\™[™Î[˜]˜Z[X›KÙ]Û˜›Ø\™[™Î[˜]˜Z[X›KÜ™X]PÚXÚÒ[Ž[˜]˜Z[X›KÙ]ÚXÚÒ[Ž[˜]˜Z[X›KÙ][\™\ÝYÜÎ[˜]˜Z[X›KÙ]ÝÛ’[\™\ÝÎ[˜]˜Z[X›K™\XÙSÝÛ’[\™\ÝÎ[˜]˜Z[X›_NÈB\Ý
š\ÛÛ]Y›Ý]\È™\]Z\™H^XÚ]ØY™HÛÛ\ÜÚ][ÛŽÈÜ™[˜\žHZ[\È›Û™H‹\Þ[˜Ê
OOžÂˆÛÛœÝZ[X]ØZ]Z[\
\[™[˜ÚY\Ê
JNÝž^Âˆ\ÜÙ\™\]X[

]ØZ]Z[‹š[š™XÝ
Ý\›ˆ‹ÝŒKÙ]™[ËÙ]ˆŸJJKœÝ]\ÐÛÙK
NÂˆ\ÜÙ\™\]X[

]ØZ]Z[‹š[š™XÝ
Ý\›ˆ‹ÝŒKÛYKØÚXÚËZ[œÏÙ]OLŒ‹LLLÉ[YV›Û™OP\ÚXIL‘”Ú[™Ø\Ü™HŸJJKœÝ]\ÐÛÙK
NÂˆYš[˜[^Ø]ØZ]Z[‹˜ÛÜÙJ
NßBˆ]ØZ]\ÜÙ\œ™Z™XÝÊZ[\
Ë‹‹™\[™[˜ÚY\Ê
K\ÛÛ]YÛXÙ\ÎžÙ[š\›Û›Y[žË‹‹™[š\›Û›Y[S“SÔ’WÑS•’T“Ó“QS•ˆ˜ÛÛ›ÛYY[[ÈŸKÚXÚÒ[’\ÝÜžN[˜]˜Z[X›__JJNÂŸJNÂ\Ý
•˜[œÜÜ™\]Z\™\È]]ÝšXÝ[œ]Ë™Z™XÝÈXÝ[Ûˆ›ÙY\È[™Y\È[\›˜[Ü›ÝXÝY]H‹\Þ[˜Ê
OOžÂˆÛÛœÝYš^\™J
NØ]ØZ]‹™Ø]]Ø^Kœ[•˜[œØXÝ[ÛŠ\Þ[˜ÈO˜Ü™X]J™]™[Ù]Z[ËÙ]ˆ‹]Z[
JNÂˆÛÛœÝ\X]ØZ]Z[\
Ë‹‹™\[™[˜ÚY\Ê
K\ÛÛ]YÛXÙ\ÎžÙ[š\›Û›Y[œšY[™Î™‹˜\]™[]Z[›™]ÈÙ]]™[]Z[
™]Èš\™\ÝÜ™Q]™[]Z[™\ÜÚ]ÜžJ‹™Ø]]Ø^K‹˜ÛØÚËÜÛÝ\˜ÙU\›JJ__JNÂˆžHÂˆÛÛœÝXY\œÏ^Ø]]Üš^˜][ÛŽˆ™X\™\ˆHŸNÂˆ\ÜÙ\™\]X[

]ØZ]\š[š™XÝ
ÛY]Ùˆ”ÔÕ‹\›ˆ‹ÝŒKÙœšY[™ËÛÛÚÝ\‹^[ØYžÝ\Ù\›˜[YNˆ›Y[X™\—ØˆŸ_JJKœÝ]\ÐÛÙKJNÂˆ›ÜŠÛÛœÝ^[ØYÙˆÞÝ\Ù\›˜[YNˆ›Y[X™\—Øˆ‹ÝÛ™\Žˆ˜ˆŸKÝ\Ù\›˜[YNŸKßWJH\ÜÙ\™\]X[

]ØZ]\š[š™XÝ
ÛY]Ùˆ”ÔÕ‹\›ˆ‹ÝŒKÙœšY[™ËÛÛÚÝ\‹XY\œË^[ØYJJKœÝ]\ÐÛÙK
NÂˆÛÛœÝÛÚÝ\X]ØZ]\š[š™XÝ
ÛY]Ùˆ”ÔÕ‹\›ˆ‹ÝŒKÙœšY[™ËÛÛÚÝ\‹XY\œË^[ØYžÝ\Ù\›˜[YNˆ›Y[X™\—ØˆŸ_JNØ\ÜÙ\™\]X[
ÛÚÝ\œÝ]\ÐÛÙKŒ
NØ\ÜÙ\™Y\\]X[
ÛÚÝ\šœÛÛŠ
KÝ\™Ù]žÝ\Ù\›˜[YNˆ›Y[X™\—Øˆ‹\Ü^S˜[YNˆ“Y[X™\ˆˆ‹™[][ÛœÚ\Ý]Nˆ˜Ø[—ÜÙ[™Ü™\]Y\ÝŸ_JNÂˆ\ÜÙ\™\]X[

]ØZ]\š[š™XÝ
Ý\›ˆ‹ÝŒKÛYKÙœšY[™\™\]Y\ÝÏØÝ\œÛÜX˜Y‹XY\œßJJKœÝ]\ÐÛÙK
NÂˆ\ÜÙ\™\]X[

]ØZ]\š[š™XÝ
ÛY]Ùˆ”ÔÕ‹\›˜ÝŒKÙœšY[™\™\]Y\ÝËÉÜ˜[™ÛUURQ

_KØXØÙ\XY\œË^[ØYžÛÝÛ™\Žˆ˜ˆŸ_JJKœÝ]\ÐÛÙK
NÂˆ\ÜÙ\™\]X[

]ØZ]\š[š™XÝ
Ý\›ˆ‹ÝŒKÙ]™[ËÙ]ÛÝÛ™\Xˆ‹XY\œßJJKœÝ]\ÐÛÙK
NÂˆÛÛœÝ]™[X]ØZ]\š[š™XÝ
Ý\›ˆ‹ÝŒKÙ]™[ËÙ]ˆ‹XY\œßJNØ\ÜÙ\™\]X[
]™[œÝ]\ÐÛÙKŒ
NØ\ÜÙ\™\]X[
]™[šœÛÛŠ
K™]™[™]™[Y™]ˆŠNØ\ÜÙ\™\]X[
Øš™XÝš\ÓÝÛŠ]™[šœÛÛŠ
K™]™[˜[Y[[ŠK˜[ÙJNÂˆHš[˜[HØ]ØZ]\˜ÛÜÙJ
NßBŸJNÂ\Ý
››Ü›X]]™H\ÛÛ]YØÚ[X\ÈX]Ú˜[œÜÜ[™\ØÜšX™HH™\ÝšXÝYXÝ]˜][Ûˆ‹\Þ[˜Ê
OOžÂˆÛÛœÝ\OR”ÓÓ‹œ\œÙJ]ØZ]™XYš[J˜\KÛÜ[˜\KšœÛÛˆ‹]ŽŠJNÂˆ›ÜŠÛÛœÝÛ˜[YKØÚ[XWHÙˆØš™XÝ™[šY\ÊÑœšY[™\™Ù]\™Ù]ØÚ[XK]™[]Z[™]™[]Z[ØÚ[XKœšY[™[˜›Þ™œšY[™[˜›ÞØÚ[XKœšY[™XÝ[ÛŽ™œšY[™XÝ[Û”ØÚ[X_JJH\ÜÙ\™Y\\]X[
\K˜ÛÛ\Û™[ËœØÚ[X\ÖÛ˜[YWKØÚ[XJNÂˆ›ÜŠÛÛœÝ]ÙˆÈ‹ÝŒKÙœšY[™ËÛÛÚÝ\‹‹ÝŒKÙœšY[™\™\]Y\ÝÈ‹‹ÝŒKÛYKÙœšY[™\™\]Y\ÝÈ‹‹ÝŒKÙœšY[™\™\]Y\ÝËÞÜ™\]Y\Ý™YŸKØXØÙ\‹‹ÝŒKÙœšY[™\™\]Y\ÝËÞÜ™\]Y\Ý™YŸKÙXÛ[™H‹‹ÝŒKÙ]™[ËÞÙ]™[YH—JH›ÜŠÛÛœÝÜ\˜][ÛˆÙˆØš™XÝ˜[Y\Ê\Kœ]ÖÜ]JH\È™XÛÜ™Ýš[™Ë[šÛ›ÝÛ–×JH\ÜÙ\™\]X[
Ü\˜][Û–ÈžY[›[ÜšKY[š\›Û›Y[—Kš\ÛÛ]YY[][]ÜˆŠNÂŸJNÂ