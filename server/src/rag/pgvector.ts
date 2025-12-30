import { pool } from './pg';

type VectorRow = {
    id: string;
    domain: string;
    subdomain?: string;
    region?: string;
    version?: string;
    section_id?: string;
    title?: string;
    source_uri?: string;
    text: string;
    embedding: number[];
    active?: boolean;
};

/**UPSERT */
export async function upsertVectors(rows: VectorRow[]) {
  const sql = `
    INSERT INTO kb_vectors (id, domain, subdomain, region, version, section_id, title, source_uri, text, embedding, active)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (id) DO UPDATE SET
      domain=EXCLUDED.domain, subdomain=EXCLUDED.subdomain, region=EXCLUDED.region,
      version=EXCLUDED.version, section_id=EXCLUDED.section_id, title=EXCLUDED.title,
      source_uri=EXCLUDED.source_uri, text=EXCLUDED.text, embedding=EXCLUDED.embedding, active=EXCLUDED.active;
  `;
  const client = await pool.connect();
  try {
    for (const r of rows) {
      await client.query(sql, [
        r.id, r.domain, r.subdomain ?? null, r.region ?? null, r.version ?? null,
        r.section_id ?? null, r.title ?? null, r.source_uri ?? null, r.text, r.embedding, r.active ?? true
      ]);
    }
  } finally {
    client.release();
  }
}

/**SEARCH */


type Filters = { domain?: string; subdomain?: string; region?: string; active?: boolean; k?: number };

export async function searchTopK(queryEmb: number[], f: Filters) {
  const k = f.k ?? 6;
  const sql = `
    SELECT id, domain, subdomain, region, version, section_id, title, source_uri, text,
           embedding <-> $1 AS distance
    FROM kb_vectors
    WHERE ($2::text IS NULL OR domain=$2)
      AND ($3::text IS NULL OR subdomain=$3)
      AND ($4::text IS NULL OR region=$4)
      AND ($5::bool IS NULL OR active=$5)
    ORDER BY embedding <-> $1
    LIMIT ${k};
  `;
  const { rows } = await pool.query(sql, [queryEmb, f.domain ?? null, f.subdomain ?? null, f.region ?? null, f.active ?? true]);
  // Attach a similarity score (inverse of distance) for thresholding
  return rows.map((r: any) => ({ ...r, score: 1 / (1 + r.distance) }));
}
