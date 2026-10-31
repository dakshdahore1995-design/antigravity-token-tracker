// Netlify Function: /api/auth-url (or /.netlify/functions/auth-url)
// Generates official Google OAuth 2.0 authorization URL for App Login or Multi-Account Linking.

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
    const intent = params.intent || 'connect_account'; // 'master_login' | 'connect_account'
    const accountId = params.account_id || '1';
    const accountName = params.account_name || `Google Account #${accountId}`;
    const redirectOrigin = params.origin || 'https://antigravity-token-tracker.netlify.app';

    // Google OAuth Client ID (from Netlify Environment Variables or request parameters)
    const clientId = process.env.GOOGLE_CLIENT_ID || params.client_id || '719271873086-kpujid5noaftp00cc3lgf50fns212g3m.apps.googleusercontent.com';
    const redirectUri = params.redirect_uri || `${redirectOrigin}/auth/callback`;

    // Standard Google OAuth 2.0 scopes for Identity, Email, Profile, and Cloud
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const stateObj = {
      intent,
      account_id: accountId,
      account_name: accountName,
      origin: redirectOrigin,
      redirect_uri: redirectUri,
      timestamp: Date.now(),
    };

    const state = JSON.stringify(stateObj);

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
        intent,
        account_id: accountId,
        is_configured: Boolean(clientId),
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
