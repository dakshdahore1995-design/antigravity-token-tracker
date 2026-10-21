// Netlify Function: /api/auth/url
// Generates the Google OAuth 2.0 authorization URL for connecting each of the 7 accounts.

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const accountIndex = params.account_id || '1';
    const redirectOrigin = params.origin || 'https://antigravity-token-tracker.netlify.app';

    // Google OAuth Client ID (from Netlify Environment Variables or user configuration)
    const clientId = process.env.GOOGLE_CLIENT_ID || params.client_id;
    const redirectUri = params.redirect_uri || `${redirectOrigin}/auth/callback`;

    // Standard Google OAuth 2.0 scopes for Profile, Email, and Cloud / Gemini API access
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid',
    ].join(' ');

    const state = JSON.stringify({
      account_id: accountIndex,
      origin: redirectOrigin,
      timestamp: Date.now(),
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=select_account%20consent&` +
      `state=${encodeURIComponent(state)}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        url: googleAuthUrl,
        client_id: clientId,
        redirect_uri: redirectUri,
        account_id: accountIndex,
        is_configured: Boolean(process.env.GOOGLE_CLIENT_ID || params.client_id),
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
