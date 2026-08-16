const crypto = require('node:crypto');

module.exports = (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirect = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirect) {
    return res.status(500).send('Configuration Discord incomplète.');
  }

  const state = crypto.randomBytes(24).toString('hex');
  res.setHeader('Set-Cookie',
    `fib_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirect);
  url.searchParams.set('scope', 'identify guilds');

  url.searchParams.set('state', state);
  res.redirect(url.toString());
};
