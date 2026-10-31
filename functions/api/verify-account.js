// Cloudflare Pages Function: /api/verify-account
// Tests Google Gemini API key or Bearer token with detailed diagnostics

export async function onRequestPost(context) {
  const { request } = context;

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await request.json();
    const apiKey = body.apiKey || body.api_key;
    const token = body.token || body.access_token;

    if (!apiKey && !token) {
      return new Response(JSON.stringify({
        success: false,
        error_code: 'MISSING_CREDENTIALS',
        error_title: 'No API Key or Token Provided',
        error_message: 'Please provide a valid Google Gemini API Key or OAuth Access Token.',
      }), { status: 400, headers: corsHeaders });
    }

    if (apiKey) {
      const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
      const startTime = Date.now();
      const response = await fetch(googleUrl, { method: 'GET' });
      const latencyMs = Date.now() - startTime;
      const responseData = await response.json();

      if (response.ok && responseData.models) {
        const geminiModels = responseData.models
          .filter(m => m.name && (m.name.includes('gemini') || m.name.includes('learnlm')))
          .map(m => m.displayName || m.name.replace('models/', ''));

        return new Response(JSON.stringify({
          success: true,
          status: 'Verified & Active',
          latency_ms: latencyMs,
          models_count: responseData.models.length,
          available_models: geminiModels.slice(0, 8),
          provider: 'Google Gemini AI Studio / Cloud',
          message: `Account connected successfully! Verified ${responseData.models.length} AI models.`,
        }), { status: 200, headers: corsHeaders });
      }

      const googleErr = responseData.error || {};
      const httpCode = response.status;
      const rawMessage = googleErr.message || response.statusText || 'Unknown error from Google Cloud API';
      const reason = googleErr.status || 'ERROR';

      let diagnosis = '';
      let fixSteps = [];

      if (httpCode === 403) {
        if (rawMessage.includes('unregistered callers') || rawMessage.includes('API key not valid')) {
          diagnosis = 'Google rejected the request because this API key is either invalid, deleted, or restricted from calling the Generative Language API.';
          fixSteps = [
            'Visit Google AI Studio: https://aistudio.google.com/app/apikey',
            'Generate a new API key for your Google Account.',
            'If using a GCP Service Account key, ensure "Generative Language API" is enabled in Google Cloud Console (console.cloud.google.com).',
            'Check that IP address or HTTP referrer restrictions on the key permit requests from this domain.'
          ];
        } else {
          diagnosis = 'Google returned a 403 Forbidden access denial for this key.';
          fixSteps = ['Verify key permissions and quotas in Google Cloud Console.'];
        }
      } else if (httpCode === 400) {
        diagnosis = 'Malformed request or invalid API key format.';
        fixSteps = [
          'Ensure the API key was copied completely without leading/trailing whitespace.',
          'Google API keys typically begin with "AIzaSy...".'
        ];
      } else if (httpCode === 429) {
        diagnosis = 'Google Gemini API quota exceeded or rate limit reached for this account.';
        fixSteps = [
          'Wait 60 seconds and retry.',
          'Upgrade to a Pay-as-you-go quota tier in Google AI Studio or use a different Google account.'
        ];
      } else {
        diagnosis = `Google API returned HTTP ${httpCode} (${reason}): ${rawMessage}`;
        fixSteps = ['Check Google Cloud Status Dashboard (https://status.cloud.google.com) for service outages.'];
      }

      return new Response(JSON.stringify({
        success: false,
        http_status: httpCode,
        google_status: reason,
        raw_error_message: rawMessage,
        diagnosis,
        fix_steps: fixSteps,
        google_error_object: googleErr,
        tested_at: new Date().toISOString(),
      }), { status: 200, headers: corsHeaders });
    }

    if (token) {
      const userinfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
      const response = await fetch(userinfoUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = await response.json();

      if (response.ok && profile.email) {
        return new Response(JSON.stringify({
          success: true,
          status: 'Verified & Active',
          profile: {
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            id: profile.id,
          },
          message: `OAuth token verified for ${profile.email}!`,
        }), { status: 200, headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        success: false,
        http_status: response.status,
        raw_error_message: profile.error?.message || 'OAuth token is invalid or expired.',
        diagnosis: 'The OAuth access token has expired or has been revoked by the user.',
        fix_steps: ['Re-authenticate with Google OAuth to obtain a fresh token.'],
      }), { status: 200, headers: corsHeaders });
    }
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error_code: 'SERVER_EXCEPTION',
      error_message: err.message,
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
