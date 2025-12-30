
type WebResult = { url: string; title: string; snippet: string };

export async function searchWeb(question: string): Promise<WebResult[]> {
  // Pseudocode: call your search API (ensure API key in .env)
  // Return top 3-5 results with snippet text and URL
  return [
    // { url, title, snippet }
  ];
}
