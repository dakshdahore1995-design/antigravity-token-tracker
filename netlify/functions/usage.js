// Netlify Function: /api/usage (or /.netlify/functions/usage)
// Serves 24/7 Antigravity token matrix data even when user's PC is turned off.

import fs from 'fs';
import path from 'path';

let inMemoryData = null;

export async function handler(event, context) {
  // Support CORS for any device
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
    // If in-memory is empty, try loading from local public/antigravity-data.json
    if (!inMemoryData) {
      try {
        const filePath = path.resolve('./public/antigravity-data.json');
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          inMemoryData = JSON.parse(raw);
        }
      } catch (err) {
        console.warn('Could not read static JSON file:', err);
      }
    }

    if (!inMemoryData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No token telemetry found yet.' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(inMemoryData),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
