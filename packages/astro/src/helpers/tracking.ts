/** Tracking script entry from content API */
export interface TrackingScript {
  id: number;
  name: string;
  code: string;
}

/** Tracking scripts grouped by position */
export interface TrackingScriptsData {
  head: TrackingScript[];
  body: TrackingScript[];
}

/**
 * Render head tracking scripts as raw HTML for use in Astro's <head>.
 * Each script is wrapped with an HTML comment for debuggability.
 */
export function renderHeadScripts(scripts: TrackingScriptsData): string {
  if (!scripts.head.length) return '';
  return scripts.head
    .map((s) => `<!-- WollyCMS Tracking: ${s.name} -->\n${s.code}`)
    .join('\n');
}

/**
 * Render body tracking scripts as raw HTML for use before </body>.
 */
export function renderBodyScripts(scripts: TrackingScriptsData): string {
  if (!scripts.body.length) return '';
  return scripts.body
    .map((s) => `<!-- WollyCMS Tracking: ${s.name} -->\n${s.code}`)
    .join('\n');
}
