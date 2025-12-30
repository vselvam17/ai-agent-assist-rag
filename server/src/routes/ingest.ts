
import { Router } from 'express';
import crypto from 'node:crypto';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { extractHtmlText } from '../rag/extract';
import { splitIntoChunks } from '../rag/chunk';
import { upsertVectors } from '../rag/pgvector';

const router = Router();

/**
 * Body: { domain: 'cards'|'debit'|'payments'|'mortgages'|'insurance', html: string, title?: string, sourceURI?: string, version?: string }
 */
export default async function ingest(req: any, res: any) {
  try {
    const { domain, html, title, sourceURI, version } = req.body as {
      domain: string; html: string; title?: string; sourceURI?: string; version?: string;
    };
    if (!domain || !html) return res.status(400).json({ error: 'domain/html required' });

    const { text } = await extractHtmlText(html);
    const chunks = splitIntoChunks(text).map((t) => ({
      id: crypto.randomUUID(),
      domain,
      title,
      source_uri: sourceURI,
      version: version ?? new Date().toISOString().slice(0, 10),
      section_id: null,
      text: t
    }));

    const { embeddings } = await embedMany({
      model: openai.embedding('text-embedding-3-small'),
      values: chunks.map(c => c.text)
    });

    await upsertVectors(chunks.map((c, i) => ({ ...c, embedding: embeddings[i] })));
    res.json({ ok: true, count: chunks.length });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'ingestion failed' });
  }
}
