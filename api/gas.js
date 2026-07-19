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
    const envGasUrl = normalizeGasUrl(process.env.GAS_API_URL);
    const gasUrl = envGasUrl;

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

    async function requestGas(method) {
      if (method === 'GET') {
        const url = new URL(gasUrl);
        url.searchParams.set('action', action);
        url.searchParams.set('payload', JSON.stringify(payload));
        return fetch(url.toString(), { method: 'GET' });
      }

      const form = new URLSearchParams();
      form.set('action', action);
      form.set('payload', JSON.stringify(payload));
      return fetch(gasUrl, {
        method: 'POST',
        body: form
      });
    }

    async function parseGasResponse(resp) {
      const text = await resp.text();
      try {
        return { data: JSON.parse(text), text };
      } catch (e) {
        return { data: null, text };
      }
    }

    let gasResp = await requestGas('POST');
    let parsed = await parseGasResponse(gasResp);
    let data = parsed.data;

    if (!data) {
      const trimmedPost = String(parsed.text || '').trim();
      const htmlLikePost = /^<!doctype html|^<html|<body/i.test(trimmedPost);
      if (htmlLikePost) {
        gasResp = await requestGas('GET');
        parsed = await parseGasResponse(gasResp);
        data = parsed.data;
      }
    }

    if (!data) {
      const text = parsed.text;
      const trimmed = String(text || '').trim();
      const preview = trimmed.slice(0, 240);
      const htmlLike = /^<!doctype html|^<html|<body/i.test(trimmed);
      data = {
        success: false,
        error: htmlLike
          ? 'Invalid JSON from GAS (received HTML). Check GAS deploy access, latest deployment, and /exec URL'
          : 'Invalid JSON from GAS',
        raw: preview
      };
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}
