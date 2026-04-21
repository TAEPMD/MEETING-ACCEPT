export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  function normalizeGasUrl(url) {
    return String(url || '').trim().replace(/\/$/, '');
  }

  function isValidGasExecUrl(url) {
    return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(url);
  }

  try {
    const body = req.body || {};
    const action = String(body.action || '').trim();
    const payload = Array.isArray(body.payload) ? body.payload : [];
    const runtimeGasUrl = normalizeGasUrl(body.gasApiUrl);
    const envGasUrl = normalizeGasUrl(process.env.GAS_API_URL);
    const gasUrl = isValidGasExecUrl(runtimeGasUrl) ? runtimeGasUrl : envGasUrl;

    if (!action) {
      res.status(400).json({ success: false, error: 'Missing action' });
      return;
    }

    if (!gasUrl) {
      res.status(500).json({
        success: false,
        error: 'Missing GAS_API_URL env on Vercel'
      });
      return;
    }

    if (!isValidGasExecUrl(gasUrl)) {
      res.status(400).json({
        success: false,
        error: 'Invalid GAS URL format. Expected Apps Script Web App URL ending with /exec'
      });
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
      const trimmed = String(text || '').trim();
      const preview = trimmed.slice(0, 240);
      const htmlLike = /^<!doctype html|^<html|<body/i.test(trimmed);
      data = {
        success: false,
        error: htmlLike
          ? 'Invalid JSON from GAS (received HTML). Check GAS deploy access and /exec URL'
          : 'Invalid JSON from GAS',
        raw: preview
      };
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}
