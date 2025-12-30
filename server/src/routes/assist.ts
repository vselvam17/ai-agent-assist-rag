
import { embedMany, streamText, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { searchTopK } from '../rag/pgvector';
import { searchWeb } from '../web/search';

export default async function assist(req: any, res: any) {
  const { domain, messages } = req.body as { domain?: string; messages: UIMessage[] };
  if (!domain) return res.status(400).json({ error: 'domain required' });

  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const question = lastUser ? lastUser.parts.map(p => (p.type === 'text' ? p.text : '')).join(' ') : '';

  // 1) Embed question
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: [question]
  });

  // 2) Retrieve internal KB first
  const internal = await searchTopK(embeddings[0], { domain, active: true, k: 6 });

  const INTERNAL_THRESHOLD = 0.75; // tune empirically
  const internalRelevant = internal.filter(r => r.score >= INTERNAL_THRESHOLD);

  let context = '';
  let sourceBanner = '';
  if (internalRelevant.length > 0) {
    // Build internal context with citations
    context = internalRelevant.map((r, i) =>
      `[#${i+1} src:INTERNAL domain:${r.domain} section:${r.section_id ?? 'n/a'} v:${r.version}] ${r.title ?? ''}\n${r.text}`
    ).join('\n\n');
    sourceBanner = `INTERNAL KB (${internalRelevant[0].source_uri ?? 'unlabeled'})`;
  } else {
    // 3) Web fallback
    const web = await searchWeb(question); // implement with your search API
    if (web.length === 0) {
      // No sources found anywhere
      context = 'NO_CONTEXT';
      sourceBanner = 'NO_SOURCE';
    } else {
      context = web.map((w, i) =>
        `[#${i+1} src:WEB url:${w.url}] ${w.title}\n${w.snippet}`
      ).join('\n\n');
      sourceBanner = `EXTERNAL WEB (${web[0].url})`;
    }
  }

  // 4) Stream grounded answer with source tag included in the response header line
  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: [
      'You are an Agent Assist for banking (chat channel only).',
      'Answer ONLY using CONTEXT; do not invent.',
      'For each claim, add citations inline as [#n src:INTERNAL ...] or [#n src:WEB url:...].',
      'If NO_CONTEXT, say you cannot confirm and propose escalation.'
    ].join(' '),
    messages: [
      { role: 'user', content: [{ type: 'text', text: `CONTEXT_SOURCE: ${sourceBanner}\n\nCONTEXT:\n${context}\n\nQUESTION:\n${question}` }] }
    ],
    temperature: 0.2
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  result.toAIStream().pipe(res);
}
