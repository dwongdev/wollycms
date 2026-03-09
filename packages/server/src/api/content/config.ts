import { Hono } from 'hono';

const app = new Hono();

/**
 * GET / - Return site configuration.
 * Hardcoded for now; will be backed by a settings table later.
 */
app.get('/', (c) => {
  return c.json({
    data: {
      siteName: 'Southside Virginia Community College',
      tagline: 'Your Future Starts Here',
      logo: null,
      footer: {
        text: 'Southside Virginia Community College. All rights reserved.',
      },
      social: {
        facebook: 'https://www.facebook.com/SouthsideVirginiaCommunityCollege/',
        twitter: null,
        instagram: 'https://www.instagram.com/southsidevacc/',
      },
    },
  });
});

export default app;
