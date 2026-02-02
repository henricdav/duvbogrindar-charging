/**
 * GET /api/test-ip
 * Test endpoint to validate trust proxy configuration
 * Returns the client's IP address as detected by the serverless function
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get IP from various headers (Vercel sets these)
  const xForwardedFor = req.headers['x-forwarded-for'];
  const xRealIp = req.headers['x-real-ip'];
  
  // Parse the first IP from x-forwarded-for (client IP)
  const clientIp = xForwardedFor 
    ? xForwardedFor.split(',')[0].trim() 
    : xRealIp || 'unknown';

  res.json({
    ip: clientIp,
    headers: {
      'x-forwarded-for': xForwardedFor || null,
      'x-real-ip': xRealIp || null
    },
    note: 'This endpoint validates that trust proxy is working correctly'
  });
}
