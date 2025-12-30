
import cheerio from 'cheerio';

export async function extractHtmlText(html: string) {
  const $ = cheerio.load(html);
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return { text, sections: null }; // you can add section heuristics later
}
