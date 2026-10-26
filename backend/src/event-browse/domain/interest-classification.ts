/** LI 26Oct: narrow, explicit rules over actual provider classification fields.
 * No title/description keyword inference and no aliases between interests.
 * A rule can match only when the provider actually supplies that classification.
 * This is not evidence that the current SG catalogue contains all categories. */
export const INTEREST_CLASSIFICATION_RULES = {
  Books: ['Literary', 'Books'],
  Travel: ['Travel'],
  Films: ['Film'],
  Fitness: ['Fitness'],
  Dance: ['Dance'],
  Food: ['Food & Drink'],
  Photography: ['Photography'],
  Technology: ['Technology'],
  Outdoors: ['Outdoor Recreation'],
  Volunteering: ['Volunteering'],
  Art: ['Fine Art'],
  Gaming: ['Gaming', 'eSports'],
  Community: ['Community/Civic'],
  Music: [],
} as const;
export type InterestConcept = keyof typeof INTEREST_CLASSIFICATION_RULES;
type Classification = { readonly id: string; readonly name: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function node(v: unknown): Classification | undefined {
  return object(v) && typeof v.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v.id) &&
    typeof v.name === 'string' && v.name.length <= 100 ? { id: v.id, name: v.name } : undefined;
}
export function classifyInterests(raw: unknown): readonly InterestConcept[] {
  if (!Array.isArray(raw) || raw.length > 20) return [];
  const names = new Set<string>();
  let music = false;
  for (const classification of raw) {
    if (!object(classification)) continue;
    const segment = node(classification.segment);
    if (segment?.id === 'KZFzniwnSyZfZ7v7nJ') music = true;
    // Segment Music remains ID-bound; all other concepts have exact, documented
    // semantic rules. Broad Arts/Theatre, Sports, Miscellaneous never imply a tag.
    for (const field of ['segment', 'genre', 'subGenre', 'type', 'subType']) {
      const value = node(classification[field]);
      if (value) names.add(value.name);
    }
  }
  return (Object.keys(INTEREST_CLASSIFICATION_RULES) as InterestConcept[]).filter(concept =>
    concept === 'Music' ? music : INTEREST_CLASSIFICATION_RULES[concept].some(name => names.has(name)));
}
