const crypto = require('node:crypto');

function verify(token, secret) {
  try {
    const [p,s] = (token||'').split('.');
    if (!p || !s || !secret) return null;
    const expected = crypto.createHmac('sha256', secret).update(p).digest('base64url');
    const a = Buffer.from(s), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return null;
    const obj = JSON.parse(Buffer.from(p,'base64url').toString());
    if (!obj.exp || Date.now() > obj.exp) return null;
    return obj;
  } catch { return null; }
}

module.exports = async (req,res) => {
  if (req.method !== 'POST') return res.status(405).json({error:'Méthode non autorisée.'});
  const cookies = req.headers.cookie || '';
  const m = cookies.match(/(?:^|; )fib_session=([^;]+)/);
  const user = verify(m?.[1], process.env.DISCORD_CLIENT_SECRET);
  if (!user) return res.status(401).json({error:'Connexion Discord requise.'});

  const webhook = process.env.DISCORD_DISPATCH_WEBHOOK_URL;
  if (!webhook) return res.status(503).json({error:'Webhook Discord non configuré.'});

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({error:'Requête invalide.'}); }
  }
  body = body || {};

  const payload = {
    username: 'FIB Asgard RP · Dispatch',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: `🚨 ${String(body.code||'APPEL')} · ${String(body.title||'Nouvel appel')}`,
      description: String(body.details||'Aucun détail.').slice(0,1800),
      color: body.priority === 'high' ? 16737685 : body.priority === 'medium' ? 15906891 : 2586879,
      fields: [
        { name: 'Localisation', value: String(body.location||'Non précisée'), inline: true },
        { name: 'Priorité', value: String(body.priority||'normal'), inline: true },
        { name: 'Créé par', value: `${user.global_name || user.username}`, inline: true }
      ],
      footer: { text: 'FIB Asgard RP · Dispatch · Los Santos' },
      timestamp: new Date().toISOString()
    }]
  };

  const r = await fetch(webhook, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });

  if (!r.ok) return res.status(502).json({error:'Discord a refusé le message.'});
  res.status(200).json({ok:true});
};
