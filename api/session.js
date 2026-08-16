const crypto = require('node:crypto');

function verify(token, secret) {
  try {
    if (!token || !secret) return null;
    const [p, s] = token.split('.');
    if (!p || !s) return null;
    const expected = crypto.createHmac('sha256', secret).update(p).digest('base64url');
    const a = Buffer.from(s), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const obj = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (!obj.exp || Date.now() > obj.exp) return null;
    return obj;
  } catch { return null; }
}

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const cookies = req.headers.cookie || '';
  const m = cookies.match(/(?:^|; )fib_session=([^;]+)/);
  const user = verify(m?.[1], process.env.DISCORD_CLIENT_SECRET);
  res.status(200).json({ user: user || null });
};
