// Cloudflare Pages Function: /api/usage
import initialData from '../../src/data/initialData.json';

export async function onRequestGet() {
  return new Response(JSON.stringify(initialData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
