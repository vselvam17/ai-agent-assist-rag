import React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const domains = ['cards', 'debit', 'payments', 'mortgages', 'insurance'] as const;

export default function AgentAssistChat() {
    const [domain, setDomain] = React.useState<typeof domains[number]>('cards');
    
    const { messages, sendMessage, status, error } = useChat({
            transport: new DefaultChatTransport({
            api: 'http://localhost:3000/api/assist',   // your Express route
            // optional: headers, credentials, etc.
            body: { domain }                            // extra data sent with every request
            }),
    })

  // Parse the first assistant message for CONTEXT_SOURCE banner (optional UI enhancement)
    const contextSource = React.useMemo( () => {
        const firstAssistant = messages.find(m => m.role === 'assistant');
        const text = firstAssistant?.parts.find(p => p.type === 'text')?.text ?? '';
        const match = text.match(/CONTEXT_SOURCE:\s*(.+)\n/i);
        return match?.[1] ?? null;
    }, [messages]);

  return (
    <div style={{ maxWidth: 800, margin: '24px auto', fontFamily: 'system-ui' }}>
      <h2>Agent Assist (chat only)</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>Domain:</label>
        <select value={domain} onChange={e => setDomain(e.target.value as any)}>
          {domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {contextSource && (
          <span style={{
            padding: '2px 6px', borderRadius: 4,
            background: contextSource.includes('INTERNAL') ? '#e6ffed' :
                        contextSource.includes('WEB') ? '#e6f0ff' : '#f5f5f5',
            border: '1px solid #ddd'
          }}>
            {contextSource}
          </span>
        )}
      </div>

      <div style={{ border: '1px solid #eee', padding: 12, minHeight: 220, marginTop: 12 }}>
        {messages.map(m => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <strong>{m.role}:</strong>{' '}
            {m.parts.map((p, i) => p.type === 'text' ? <span key={i}>{p.text}</span> : null)}
          </div>
        ))}
        {error && <div style={{ color: 'crimson' }}>{String(error)}</div>}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem('q') as HTMLInputElement;
          const text = input.value.trim();
          if (text) sendMessage({ text });
          input.value = '';
        }}
        style={{ display: 'flex', gap: 8, marginTop: 12 }}
      >
        <input name="q" placeholder="Ask the assistant…" style={{ flex: 1, padding: 8 }} />
        <button disabled={status === 'streaming'}>Ask</button>
      </form>
    </div>
  );

}