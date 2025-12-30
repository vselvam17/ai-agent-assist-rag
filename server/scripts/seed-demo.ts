
import 'dotenv/config';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { upsertVectors } from '../src/rag/pgvector';
import crypto from 'node:crypto';

const now = new Date().toISOString().slice(0,10);

const items = [
  { domain: 'cards',     title: 'Cards – Late Fees', text: 'Late fee applies if minimum payment not received by due date. Grace period 21 days from statement date.' },
  { domain: 'debit',     title: 'Debit – ATM Limits', text: 'Daily cash withdrawal limit is 500 EUR. POS transactions limit 2000 EUR per day.' },
  { domain: 'payments',  title: 'Payments – SEPA Cutoff', text: 'SEPA credit transfer cutoff 16:00 CET for same-day processing. After cutoff settles next business day.' },
  { domain: 'mortgages', title: 'Mortgage – Early Repayment', text: 'Early repayment allowed without penalty up to 10% of principal per year; above this, fee may apply.' },
  { domain: 'insurance', title: 'Insurance – Claim Window', text: 'Claims should be filed within 30 days of incident. Supporting documents required as per policy.' }
];

(async () => {
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: items.map(i => i.text)
  });

  const rows = items.map((i, idx) => ({
    id: crypto.randomUUID(),
    domain: i.domain,
    title: i.title,
    source_uri: 'demo-seed',
    version: now,
    section_id: null,
    text: i.text,
    embedding: embeddings[idx],
    active: true
  }));

  await upsertVectors(rows);
  console.log(`Seeded ${rows.length} chunks`);
})();
