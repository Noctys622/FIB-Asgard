const crypto = require('node:crypto');

function sign(payload, secret) {
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const s = crypto.createHmac('sha256', secret).update(p).digest('base64url');
  return `${p}.${s}`;
}

module.exports = async (req, res) => {
  try {
    const { code, state } = req.query;
    const cookies = req.headers.cookie || '';
    const sm = cookies.match(/(?:^|; )fib_oauth_state=([^;]+)/);

    if (!code || !state || !sm || sm[1] !== state) {
      return res.status(400).send('Connexion Discord invalide.');
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirect = process.env.DISCORD_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirect) {
      return res.status(500).send('Configuration Discord incomplète.');
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: redirect
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {'Content-Type':'application/x-www-form-urlencoded'},
      body
    });

    if (!tokenRes.ok) return res.status(500).send('Erreur OAuth Discord.');

    const token = await tokenRes.json();
    const auth = { Authorization: `Bearer ${token.access_token}` };

    const [userRes, guildsRes] = await Promise.all([
      fetch('https://discord.com/api/users/@me', { headers: auth }),
      fetch('https://discord.com/api/users/@me/guilds', { headers: auth })
    ]);

    if (!userRes.ok) return res.status(500).send('Profil Discord indisponible.');

    const user = await userRes.json();
    const guilds = guildsRes.ok ? await guildsRes.json() : [];
    const guildId = process.env.DISCORD_GUILD_ID || '';
    const guild = guildId ? guilds.find(g => g.id === guildId) : null;

    let admin = false;
    if (guild) {
      try {
        const perms = BigInt(guild.permissions || '0');
        admin = !!guild.owner || ((perms & 8n) === 8n);
      } catch {}
    }

    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    const payload = {
      id: user.id,
      username: user.username,
      global_name: user.global_name,
      avatarUrl,
      admin,
      guildMember: !!guild,
      exp: Date.now() + 7 * 86400000
    };

    const session = sign(payload, clientSecret);
    res.setHeader('Set-Cookie', [
      `fib_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
      `fib_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
    ]);

    res.redirect('/agent.html');
  } catch (e) {
    console.error(e);
    res.status(500).send('Erreur pendant la connexion Discord.');
  }
};
