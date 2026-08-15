const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
const COOKIE_NAME = 'tt_session';
const ADMIN_EMAIL = 'Alyssia.k.quirk@gmail.com';

function requireSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET or NEXTAUTH_SECRET environment variable is not set.');
  }
}

function signToken(payload) {
  requireSecret();
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  requireSecret();
  return jwt.verify(token, JWT_SECRET);
}

function setAuthCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
  );
}

function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  );
}

function getTokenFromReq(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return cookies[COOKIE_NAME];
}

function requireAuth(req, res) {
  try {
    const token = getTokenFromReq(req);
    if (!token) throw new Error('No token');
    return verifyToken(token);
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
}

module.exports = {
  ADMIN_EMAIL,
  COOKIE_NAME,
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  getTokenFromReq,
  requireAuth,
};
