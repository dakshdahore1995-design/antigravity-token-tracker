// Cloudflare Pages Function: /api/auth-url
// Constructs Google OAuth 2.0 authorization URL

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const params = url.searchParams;

  const intent = params.get('intent') || 'master_login';
  const accountId = params.get('account_id') || '1';
  const accountName = params.get('account_name') || `Google Account #${accountId}`;
  const origin = params.get('origin') || url.origin;
  const redirectUri = params.get('redirect_uri') || `${origin}/auth/callback`;

  const clientId = (env && env.GOOGLE_CLIENT_ID) || params.get('client_id') || '719271873086-kpujid5noaftp00cc3lgf50fns212g3m.apps.googleusercontent.com';

  const scopes = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  const stateObj = {
    intent,
    account_id: accountId,
    account_name: accountName,
    origin,
    redirect_uri: redirectUri,
    timestamp: Date.now(),
  };

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `access_type=offline&` +
    `prompt=select_account%20consent&` +
    `state=${encodeURIComponent(JSON.stringify(stateObj))}`;

  return new Response(JSON.stringify({
    url: googleAuthUrl,
    client_id: clientId,
    redirect_uri: redirectUri,
    intent,
    account_id: accountId,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
