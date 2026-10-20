import type { ConversationGates, ConversationInput } from "../ports/conversation-lifecycle.js";
import type { OutputCandidate } from "../../ai-runtime/domain/parse-output.js";
import type { RequestBudget } from "../../ai-runtime/ports/generation-transport.js";
import { err, ok } from "../../shared/domain/result.js";
import { copyPersonaProjection } from "./persona-expression.js";

/** S-PM-1019-LI-SPONSOR-DEMO-LOCAL-TAKEOVER. Internal only; public JSON stays v1. */
export const openConversationSemanticPolicyVersion = "open_conversation_v1";
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.isWellFormed() && /\S/u.test(v);
const fields = (v: object, allowed: readonly string[], required: readonly string[]) =>
  required.every(k => Object.hasOwn(v,k)) && Reflect.ownKeys(v).every(k => typeof k === "string" && allowed.includes(k) &&
    Object.hasOwn(Object.getOwnPropertyDescriptor(v,k) ?? {},"value"));
function live(b: RequestBudget): boolean {
  try { return !b.signal.aborted && Number.isFinite(b.deadline) && b.remainingMs() > 0; } catch { return false; }
}
export function validOpenConversationInput(v: ConversationInput): boolean {
  if (!record(v) || !fields(v,["strategy","currentMessage","checkIns","persona","history"],["strategy","currentMessage","checkIns","history"]) ||
      v.strategy !== openConversationSemanticPolicyVersion || !text(v.currentMessage) || [...v.currentMessage].length > 2400 ||
      !Array.isArray(v.checkIns) || v.checkIns.length > 5 || !Array.isArray(v.history) || v.history.length > 2) return false;
  for (const list of [v.checkIns,v.history]) {
    const keys = ["length",...list.map((_,i) => String(i))];
    if (!fields(list,keys,keys)) return false;
  }
  for (const n of v.checkIns) if (!record(n) || !fields(n,["occurredAt","noteText"],["occurredAt","noteText"]) || !text(n.occurredAt) || !text(n.noteText)) return false;
  for (const p of v.history) if (!record(p) || !fields(p,["user","assistant"],["user","assistant"]) ||
      !text(p.user) || !text(p.assistant) || [...p.user].length > 2400 || [...p.assistant].length > 2400) return false;
  const p = v.persona;
  return p === undefined || copyPersonaProjection(p) !== undefined;
}
// Concrete conservative semantic rejection categories, independently applied to
// model output. The prompt is never taken as proof the model obeyed them.
const prohibited = [
  /(?:firestore|firebase|ollama|tokenizer|system prompt|developer message|api[_ -]?key|access[_ -]?token|schemaVersion|ai_assistant_message_v1|Bearer\s|\/home\/|localhost|127\.0\.0\.1)/iu,
  /(?:系统提示词|开发者指令|后台指令|访问令牌|密钥|数据库|服务器路径)/u,
  /\b(?:I|we)(?:['’](?:ve|ll|m)|\s+(?:have already|have just|am going to|am able to|can now|will now|have|will|can|shall|am|are|did|just|already))?\s+(?:already\s+|just\s+|now\s+)?(?:access(?:ed)?|search(?:ed)?|brows(?:e|ed)|track(?:ed)?|sav(?:e|ed)|delet(?:e|ed)|updat(?:e|ed)|register(?:ed)?|book(?:ed)?|send|sent|accept(?:ed)?|sign(?:ed)?\s+up|purchas(?:e|ed)|order(?:ed)?|locat(?:e|ed)|look(?:ed)? up)\b/iu,
  /(?:我|我们)(?:已经|刚刚|刚才|已|可以|能|会|将|正在|即将|将会|能够|能帮你|会帮你|会为你|将为你|已经为你)?(?:访问|查询|搜索|定位|保存|删除|修改|注册|报名|预订|发送|接受申请|购买|下单)/u,
  /\b(?:I (?:have |can |will |just )?(?:access|accessed|search|searched|browse|browsed|track|tracked)|I (?:have |just )?(?:saved|deleted|updated|registered|booked|sent|accepted)|your (?:account|location|GPS|private (?:data|messages)))\b/iu,
  /(?:我(?:已经|刚刚|已|可以|能)?(?:访问|查询|搜索|定位|保存|删除|修改|注册|报名|预订|发送|接受申请)|你的(?:账号|账户|位置|定位|私密信息|私人消息))/u,
  /\b(?:diagnos\w*|prescri\w*|medication|dosage|suicid\w*|self.harm|disorder|treatment|therapy|antidepressant|insulin)\b/iu,
  /(?:诊断|处方|服药|用药|剂量|治疗|自杀|自残|抑郁症|精神疾病|心理疾病|停药|加药)/u,
  /\b(?:ticketmaster|event (?:starts|ends)|friend (?:score|ranking|recommendation)|compatibility score|you (?:have|suffer from|are diagnosed with)|I (?:know|infer|deduce) (?:your|that you))\b/iu,
  /(?:匹配分数|好友排名|活动(?:开始于|结束于)|我(?:知道|推断|推测)你|你患有|你得了)/u,
  /\b(?:persistent memory|remember you from|remember your previous|outside this conversation)\b/iu,
  /(?:永久记忆|长期记忆|其他对话|别的会话|之前的账号)/u,
];
function accepts(input: ConversationInput, output: OutputCandidate): boolean {
  if (!validOpenConversationInput(input) || !record(output) || !fields(output,["schemaVersion","message"],["schemaVersion","message"]) ||
      output.schemaVersion !== "ai_assistant_message_v1" || !text(output.message) || [...output.message].length > 2400) return false;
  // This fixed preference-question head asks rather than asserts a user fact.
  // Remove only that head from the assertion-checking view. Keep the rest of
  // the question for every independent safety check; never rewrite the reply.
  const assertions = output.message.replace(/(^|[.!?\n]\s*)(?:do\s+)?you\s+have\s+a\s+preference\b(?=[^.!?\n]*\?)/giu,"$1a preference");
  if (prohibited.some(rule => rule.test(assertions))) return false;
  // Numbers and quoted attributions require exact support in the actual supplied
  // data. Prior model claims alone cannot establish a new user fact.
  const sources = [input.currentMessage,...input.checkIns.map(n => n.noteText!),...(input.history ?? []).map(p => p.user)];
  // Unsupported assertions about identity, living situation, location, work,
  // possessions or attributes are private-fact claims even without numbers.
  // Only an exact supported first/second-person statement can establish one;
  // a speculative paraphrase is rejected instead of becoming a user fact.
  const normalizedSources = sources.map(s => s.toLocaleLowerCase("en").replace(/\bi am\b|\bi['’]m\b/gu,"you are")
    .replace(/\bi have\b|\bi['’]ve\b/gu,"you have").replace(/\bi\b/gu,"you").replace(/\bmy\b/gu,"your"));
  const claims = assertions.matchAll(/\byou(?:['’]re|['’]ve| are| have| live| reside| work| study| earn| weigh| own| belong)[^.!?\n]*|\byour (?:home|address|location|name|age|job|salary|income|family|partner|children|religion|nationality)[^.!?\n]*/giu);
  for (const match of claims) {
    const claim=match[0].toLocaleLowerCase("en").replace(/\byou['’]re\b/gu,"you are").replace(/\byou['’]ve\b/gu,"you have");
    if (!normalizedSources.some(s=>s.includes(claim))) return false;
  }
  for (const match of output.message.matchAll(/你(?:住在|独居|住|来自|的(?:家庭|住址|地址|位置|姓名|年龄|工作|收入|伴侣|孩子|国籍|宗教))[^。！？\n]*/gu)) {
    const claim=match[0].replace(/^你/u,"我");
    if (!sources.some(s=>s.includes(claim)||s.includes(match[0]))) return false;
  }
  for (const match of output.message.matchAll(/\d+(?:[.:/-]\d+)*/gu)) if (!sources.some(s => s.includes(match[0]))) return false;
  for (const match of output.message.matchAll(/[“「"]([^”」"\n]+)[”」"]/gu)) if (!sources.some(s => s.includes(match[1]!))) return false;
  return true;
}
/** Versioned concrete checks, not a universal proof of natural-language safety.
 * Unknown shape, stale projections and every detected prohibited/unsupported
 * claim reject the whole response. No repair, output rewrite or synthetic reply. */
export const openConversationSemanticCandidate: ConversationGates["candidate"] = (borrow, candidate, budget) => {
  if (!live(budget)) return Promise.resolve(err("stale_authority"));
  try {
    const input = borrow(), output = candidate();
    if (!input || !output || !live(budget)) return Promise.resolve(err("stale_authority"));
    const accepted = accepts(input,output);
    const fresh = borrow(), freshOutput = candidate();
    if (!fresh || !freshOutput || !live(budget) || JSON.stringify(input) !== JSON.stringify(fresh) ||
        output.schemaVersion !== freshOutput.schemaVersion || output.message !== freshOutput.message) return Promise.resolve(err("stale_authority"));
    return Promise.resolve(accepted ? ok(undefined) : err("unsafe_output"));
  } catch { return Promise.resolve(err("stale_authority")); }
};
