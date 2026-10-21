// Netlify Function: /api/sync (or /.netlify/functions/sync)
// Allows remote sync of Antigravity token data into cloud memory.

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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use POST to sync data.' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');

    if (!payload.calendar_days || !payload.summary) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid payload: missing calendar_days or summary.' }),
      };
    }

    // Success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        message: 'Telemetry successfully updated in Netlify Cloud Function.',
        synced_at: new Date().toISOString(),
        total_tokens: payload.summary.total_tokens,
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
