import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sha256, validateReview } from './evaluation.mjs';

const [reportPath, reviewPath, ...extra] = process.argv.slice(2);
assert(reportPath && reviewPath && extra.length === 0, 'Usage: node tool/ai-companion-eval/review.mjs REPORT REVIEW');
const bytes = readFileSync(reportPath);
console.log(JSON.stringify(validateReview(JSON.parse(bytes), sha256(bytes), JSON.parse(readFileSync(reviewPath))), null, 2));
