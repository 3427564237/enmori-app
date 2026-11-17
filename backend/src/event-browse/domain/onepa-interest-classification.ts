import type { InterestConcept } from './interest-classification.js';

/** LI 17 November: public fixed queries and a finite title-only vocabulary.
 * Neither queries nor rules are constructed from an account's preferences. */
export const ONEPA_INTEREST_RULES = [
  {interest:'Books',query:'book',phrases:['book club','reading club','book discussion','读书会']},
  {interest:'Travel',query:'tour',phrases:['guided tour','heritage tour','day trip','travel talk','一日游']},
  {interest:'Films',query:'movie',phrases:['film screening','movie screening','movie night','电影放映']},
  {interest:'Fitness',query:'exercise',phrases:['fitness class','exercise class','morning exercise','yoga','pilates','tai chi','qigong','瑜伽','太极']},
  {interest:'Dance',query:'dance',phrases:['line dance','mass dance','orang singapura dance','cardio dance','dance class','dance workshop','dance fitness','排舞','舞蹈班']},
  {interest:'Food',query:'cooking',phrases:['cooking demo','cooking demonstration','cooking class','cooking workshop','baking class','baking workshop','food tasting','烹饪示范','烹饪班','烘焙班']},
  {interest:'Photography',query:'photography',phrases:['photography class','photography workshop','photography outing','photo walk','photowalk','摄影班','摄影工作坊']},
  {interest:'Technology',query:'digital',phrases:['digital literacy','digital skills','coding workshop','robotics workshop','artificial intelligence','编程班','数码技能']},
  {interest:'Outdoors',query:'nature',phrases:['nature walk','hiking','trekking','birdwatching','徒步','观鸟']},
  {interest:'Volunteering',query:'volunteer',phrases:['volunteer recruitment','volunteer orientation','volunteer training','beach clean up','litter picking','义工招募','义工培训']},
  {interest:'Art',query:'art',phrases:['art workshop','painting class','painting workshop','drawing class','pottery workshop','calligraphy class','绘画班','陶艺工作坊']},
  {interest:'Gaming',query:'game',phrases:['board game night','board games session','board games club','gaming tournament','esports','chess tournament','桌游','电竞']},
  {interest:'Community',query:'community',phrases:['community gathering','residents gathering','neighbourhood gathering','community festival','邻里聚会','社区联谊']},
  {interest:'Music',query:'karaoke',phrases:['karaoke','choir','music concert','music festival','music workshop','guitar class','piano class','卡拉OK','合唱']},
] as const satisfies readonly {interest:InterestConcept;query:string;phrases:readonly string[]}[];

function normalize(title: string): string {
  return title.normalize('NFKC').toLowerCase().replace(/[\p{Dash_Punctuation}\u2212]/gu,' ')
    .replace(/\s+/gu,' ').trim();
}
const matchers=ONEPA_INTEREST_RULES.map(rule=>({interest:rule.interest,phrases:rule.phrases.map(phrase=>{
  const normalized=normalize(phrase);
  return /\p{Script=Han}/u.test(normalized) ? (title:string)=>title.includes(normalized)
    : (title:string)=>new RegExp(`(?<![\\p{L}\\p{N}\\p{M}_])${normalized}(?![\\p{L}\\p{N}\\p{M}_])`,'u').test(title);
})}));

/** The caller supplies the validated title, never description or category text. */
export function classifyOnePaTitle(title: string): readonly InterestConcept[] {
  const normalized=normalize(title);
  return matchers.filter(rule=>rule.phrases.some(matches=>matches(normalized))).map(rule=>rule.interest);
}
