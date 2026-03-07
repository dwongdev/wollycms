import { createClient } from '@wollycms/astro';

export const wolly = createClient({
  apiUrl: 'http://localhost:4321/api/content',
});
