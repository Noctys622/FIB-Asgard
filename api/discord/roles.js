const crypto = require('node:crypto');

function verify(token, secret) {
  try {
    const [p, s] = (token || '').split('.');
    if (!p || !s || !secret) return null;
    const expected = crypto.createHmac('sha256', secret).update(p).digest('base64url');
    const a = Buffer.from(s), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const obj = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (!obj.exp || Date.now() > obj.exp) return null;
    return obj;
  } catch { return null; }
}

module.exports = async (req, res) => {
  const cookies = req.headers.cookie || '';
  const m = cookies.match(/(?:^|; )fib_session=([^;]+)/);
  const user = verify(m?.[1], process.env.DISCORD_CLIENT_SECRET);
  if (!user) return res.status(401).json({ error: 'Non connecté.' });

  const bot = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!bot || !guildId) return res.status(503).json({ error: 'Bot Discord non configuré.' });

  try {
    const [memberRes, rolesRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`, {
        headers: { Authorization: `Bot ${bot}` }
      }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${bot}` }
      })
    ]);

    if (!memberRes.ok) return res.status(404).json({ error: 'Membre introuvable sur le serveur.' });
    if (!rolesRes.ok) return res.status(502).json({ error: 'Impossible de lire les rôles.' });

    const member = await memberRes.json();
    const roles = await rolesRes.json();
    const roleSet = new Set(member.roles || []);

    const selected = roles
      .filter(r => roleSet.has(r.id) && r.name !== '@everyone')
      .sort((a,b) => b.position - a.position)
      .map(r => ({ id:r.id, name:r.name, color:r.color, position:r.position }));

    res.status(200).json({ roles: selected });
  } catch (e) {
    res.status(500).json({ error: 'Erreur Discord.' });
  }
};
