import { Hono } from 'hono';

const app = new Hono();

/**
 * GET / - Return site configuration.
 * Hardcoded for now; will be backed by a settings table later.
 */
app.get('/', (c) => {
  return c.json({
    data: {
      siteName: 'My Site',
      tagline: 'Welcome to your site',
      logo: null,
      footer: {
        text: 'Built with WollyCMS',
      },
      social: {
        facebook: null,
        twitter: null,
        instagram: null,
      },
    },
  });
});

export default app;
