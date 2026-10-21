// Netlify Function: /api/accounts (or /.netlify/functions/accounts)
// 24/7 Cloud Accounts Manager: Add, Edit, Delete, or Switch active account.

let cloudAccounts = null;

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Initialize with default 7 accounts if empty
  if (!cloudAccounts) {
    cloudAccounts = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      name: `Account #${i + 1}`,
      email: `account${i + 1}@gmail.com`,
      quota_tokens: 10_000_000,
      total_tokens: 0,
      percent_used: 0,
      status: 'Ready',
      apiKeyConfigured: false,
    }));
  }

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ accounts: cloudAccounts }),
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');

      // Update full account list
      if (Array.isArray(body.accounts)) {
        cloudAccounts = body.accounts;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: 'updated', accounts: cloudAccounts }),
        };
      }

      // Add single account
      const nextId = cloudAccounts.length + 1;
      const newAcc = {
        id: nextId,
        name: body.name || `Account #${nextId}`,
        email: body.email || `account${nextId}@gmail.com`,
        quota_tokens: body.quota_tokens || 10_000_000,
        total_tokens: 0,
        percent_used: 0,
        status: 'Ready',
        apiKeyConfigured: Boolean(body.apiKey),
      };
      cloudAccounts.push(newAcc);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ status: 'created', account: newAcc, accounts: cloudAccounts }),
      };
    } catch (err) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: err.message }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not supported.' }),
  };
}
