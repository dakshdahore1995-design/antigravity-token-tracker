// Cloudflare Pages Function: /api/auth-callback
// Exchanges authorization code for Google tokens and profile

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const params = await request.json();
    const code = params.code;
    const clientId = (env && env.GOOGLE_CLIENT_ID) || params.client_id;
    const clientSecret = (env && env.GOOGLE_CLIENT_SECRET) || params.client_secret;
    const redirectUri = params.redirect_uri;

    if (!code) {
      return new Response(JSON.stringify({
        status: 'error',
        error_code: 'MISSING_AUTH_CODE',
        error: 'Missing authorization code from Google OAuth.',
        diagnosis: 'No authorization code was supplied in the callback payload.',
      }), { status: 400, headers: corsHeaders });
    }

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        status: 'error',
        error_code: 'MISSING_CLIENT_CREDENTIALS',
        error: 'OAuth Client ID or Client Secret not configured.',
        diagnosis: 'Server environment missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.',
      }), { status: 500, headers: corsHeaders });
    }

    // Call Google OAuth Token Endpoint
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

      return new Response(JSON.stringify({
        status: 'error',
        error_code: errType,
        error: errDesc,
        diagnosis: specificDiagnosis,
        fix_steps: fixSteps,
        raw_google_error: tokens,
      }), { status: 400, headers: corsHeaders });
    }

    // Fetch user profile from Google UserInfo endpoint
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileResponse.ok) {
      const profErr = await profileResponse.json();
      return new Response(JSON.stringify({
        status: 'error',
        error_code: 'PROFILE_FETCH_FAILED',
        error: 'Could not fetch Google User Profile with obtained access token.',
        details: profErr,
      }), { status: profileResponse.status, headers: corsHeaders });
    }

    const profile = await profileResponse.json();

    return new Response(JSON.stringify({
      status: 'success',
      authenticated: true,
      account: {
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        picture: profile.picture,
        google_id: profile.id,
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
        connected_at: new Date().toISOString(),
      },
    }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({
      status: 'error',
      error_code: 'INTERNAL_EXCEPTION',
      error: err.message,
    }), { status: 500, headers: corsHeaders });
  }
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
