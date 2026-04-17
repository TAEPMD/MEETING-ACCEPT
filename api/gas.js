export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const gasUrl = process.env.GAS_API_URL;
  if (!gasUrl) {
    res.status(500).json({
      success: false,
      error: 'Missing GAS_API_URL env on Vercel'
    });
    return;
  }

  try {
    const body = req.body || {};
    const action = String(body.action || '').trim();
    const payload = Array.isArray(body.payload) ? body.payload : [];

    if (!action) {
      res.status(400).json({ success: false, error: 'Missing action' });
      return;
    }

    const form = new URLSearchParams();
    form.set('action', action);
    form.set('payload', JSON.stringify(payload));

    const gasResp = await fetch(gasUrl, {
      method: 'POST',
      body: form
    });

    const text = await gasResp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { success: false, error: 'Invalid JSON from GAS', raw: text };
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}
