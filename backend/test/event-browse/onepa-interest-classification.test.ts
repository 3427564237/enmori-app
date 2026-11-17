import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyOnePaTitle, ONEPA_INTEREST_RULES } from '../../src/event-browse/domain/onepa-interest-classification.js';
import { projectOnePaListItem } from '../../src/event-browse/infrastructure/onepa-browse-source.js';

test('the fixed public searches cover the fourteen approved concepts, independently of a user', () => {
  assert.deepEqual(ONEPA_INTEREST_RULES.map(({interest,query}) => [interest,query]), [
    ['Books','book'], ['Travel','tour'], ['Films','movie'], ['Fitness','exercise'],
    ['Dance','dance'], ['Food','cooking'], ['Photography','photography'], ['Technology','digital'],
    ['Outdoors','nature'], ['Volunteering','volunteer'], ['Art','art'], ['Gaming','game'],
    ['Community','community'], ['Music','karaoke'],
  ]);
});

test('explicit activity titles support each concept, including the observed Food and Dance forms', () => {
  for (const [title, concept] of [
    ['Evening book club 2026', 'Books'], ['A guided tour of our heritage', 'Travel'],
    ['Weekend movie screening', 'Films'], ['Morning exercise at Example CC', 'Fitness'],
    ['Mass Orang Singapura Dance 2026', 'Dance'], ['Malay Recipe Cooking Demo', 'Food'],
    ['Photography outing in December', 'Photography'], ['Digital literacy for beginners', 'Technology'],
    ['Weekend nature walk', 'Outdoors'], ['Volunteer recruitment session', 'Volunteering'],
    ['Painting workshop for beginners', 'Art'], ['Board games session', 'Gaming'],
    ['Residents gathering 2026', 'Community'], ['Karaoke Club December', 'Music'],
  ] as const) assert.deepEqual(classifyOnePaTitle(title), [concept], title);
});

test('normalization is bounded, preserves word boundaries and allows only separately evidenced concepts', () => {
  assert.deepEqual(classifyOnePaTitle('  ＬＩＮＥ—ＤＡＮＣＥ  and\nCOOKING  WORKSHOP '), ['Dance','Food']);
  assert.deepEqual(classifyOnePaTitle('社区读书会与烹饪班'), ['Books','Food']);
  assert.deepEqual(classifyOnePaTitle('卡拉OK'), ['Music']);
  assert.deepEqual(classifyOnePaTitle('Tai Chi'), ['Fitness']);
  assert.deepEqual(classifyOnePaTitle('Line dance / line dance'), ['Dance']);
  for (const title of ['Booking office', 'Singapore Book of Records', 'Dinner & Dance',
    'Free lunch and food distribution', 'Arts & Culture', 'Active Ageing', 'Neighbourhood Events',
    'Community Centre open day', 'Yogaesque sculpture', 'myphotowalkers meeting',
    'Volunteer appreciation dinner', 'Martial arts competition', 'Film recording notice']) {
    assert.deepEqual(classifyOnePaTitle(title), [], title);
  }
});

function product(published: unknown = true) {
  return {ID:'PA-Event-34316958',Name:'Synthetic Cooking Demo',Active:true,xp:{
    Private:0,Published:published,InvitationOnly:0,UsePassword:0,ProductType:'Event',Timezone:'8.0',
    Event:{Id:34316958},StartDate:'2026-11-28T11:00:00+00:00',EndDate:'2026-11-28T13:00:00+00:00',
    CategoriesLevel1:['Arts & Culture'], SummaryBox:'Music and complimentary lunch are provided.',
  }};
}
const url='https://www.onepa.gov.sg/events/synthetic-cooking-demo-e34316958';
const project=(value: unknown) => projectOnePaListItem({product:value,url},'2026-11-17T00:00:00.000Z');

test('boolean Published is accepted without broadening any missing or private source flags', () => {
  for (const published of [true,1]) assert.deepEqual(project(product(published))?.interestConcepts, ['Food']);
  for (const published of [false,0,'true','1',undefined,null]) {
    const value=product();value.xp.Published=published;
    assert.equal(project(value), undefined);
  }
  for (const field of ['Private','InvitationOnly','UsePassword','Timezone'] as const) {
    const value=product();delete (value.xp as Record<string,unknown>)[field];
    assert.equal(project(value), undefined, field);
  }
  assert.equal(project({...product(),xp:{...product().xp,Private:1}}),undefined);
  assert.equal(project({...product(),xp:{...product().xp,InvitationOnly:1}}),undefined);
  assert.equal(project({...product(),xp:{...product().xp,UsePassword:1}}),undefined);
  assert.deepEqual(project({...product(),Name:'Karaoke Club'})?.interestConcepts,['Music']);
  assert.deepEqual(project({...product(),Name:'Active Ageing with lunch'})?.interestConcepts,[]);
});
