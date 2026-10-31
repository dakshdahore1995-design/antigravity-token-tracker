// Netlify Function: /api/auth-callback (or /.netlify/functions/auth-callback)
// Exchanges authorization code for Google tokens and user profile 100% in the cloud.
// Real Google OAuth 2.0 token exchange with strict diagnostics (No Fake Fallbacks).

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.httpMethod === 'POST'
      ? JSON.parse(event.body || '{}')
      : (event.queryStringParameters || {});

    const code = params.code;
    const clientId = process.env.GOOGLE_CLIENT_ID || params.client_id;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || params.client_secret;
    const redirectUri = params.redirect_uri || `${params.origin || 'https://antigravity-token-tracker.netlify.app'}/auth/callback`;

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: 'error',
          error_code: 'MISSING_AUTH_CODE',
          error: 'Missing authorization code from Google OAuth.',
          diagnosis: 'The OAuth callback URL did not receive the "code" query parameter from Google.',
          fix_suggestion: 'Initiate a new Google Sign-In request from the application.'
        }),
      };
    }

    if (!clientId || !clientSecret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          status: 'error',
          error_code: 'MISSING_CLIENT_CREDENTIALS',
          error: 'Google OAuth Client ID or Client Secret is not configured on the server.',
          diagnosis: 'The environment variables GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in Netlify / .env to complete the OAuth 2.0 token exchange.',
          fix_suggestion: 'Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Netlify Site Settings > Environment Variables, or supply them in request payload.'
        }),
      };
    }

    // Call Google OAuth 2.0 Token Endpoint
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || tokens.error) {
      const errType = tokens.error || 'token_exchange_failed';
      const errDesc = tokens.error_description || 'Failed to exchange authorization code for Google tokens.';
      
      let specificDiagnosis = `Google OAuth server returned HTTP ${tokenResponse.status} (${errType}): ${errDesc}`;
      let fixSteps = [];

      if (errType === 'redirect_uri_mismatch') {
        specificDiagnosis = `The redirect URI (${redirectUri}) does not match the authorized redirect URIs registered for this OAuth client in Google Cloud Console.`;
        fixSteps = [
          `Open Google Cloud Console: https://console.cloud.google.com/apis/credentials`,
          `Select Client ID: ${clientId}`,
          `Add "${redirectUri}" to the "Authorized redirect URIs" list.`,
          `Save changes and retry the login.`
        ];
      } else if (errType === 'invalid_grant') {
        specificDiagnosis = 'The authorization code has expired, has already been used, or the system clock is skewed.';
        fixSteps = [
          'Authorization codes expire after 10 minutes or upon first use.',
          'Start a fresh Google Sign-In from the dashboard.'
        ];
      } else if (errType === 'invalid_client') {
        specificDiagnosis = 'Google rejected the Client Secret or Client ID as invalid.';
        fixSteps = [
          'Verify that GOOGLE_CLIENT_SECRET matches the secret from Google Cloud Console credentials.',
          'Ensure there are no leading or trailing spaces in the secret.'
        ];
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: 'error',
          error_code: errType,
          error: errDesc,
          diagnosis: specificDiagnosis,
          fix_steps: fixSteps,
          raw_google_error: tokens,
        }),
      };
    }

    // Fetch user profile from Google UserInfo endpoint
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileResponse.ok) {
      const profErr = await profileResponse.json();
      return {
        statusCode: profileResponse.status,
        headers,
        body: JSON.stringify({
          status: 'error',
          error_code: 'PROFILE_FETCH_FAILED',
          error: 'Could not fetch Google User Profile with obtained access token.',
          details: profErr,
        }),
      };
    }

    const profile = await profileResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        authenticated: true,
        account: {
          email: profile.email,
          name: profile.name || profile.email.split('@')[0],
          picture: profile.picture,
          google_id: profile.id,
          locale: profile.locale,
          verified_email: profile.verified_email,
          access_token: tokens.access_token,
          expires_in: tokens.expires_in,
          token_type: tokens.token_type,
          connected_at: new Date().toISOString(),
        },
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        error_code: 'INTERNAL_EXCEPTION',
        error: err.message,
      }),
    };
  }
}
