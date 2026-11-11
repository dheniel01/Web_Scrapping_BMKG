// api/awscenter.js - Vercel Serverless Function
// Live Real-Time Scraper for BMKG AWS Center (Peralatan Cuaca & Iklim Riau)
// Source: https://awscenter.bmkg.go.id/base/marker_login_map

/** Convert BMKG UTC string "YYYY-MM-DD HH:MM:SS+00" to ISO 8601 string */
function parseAwsUtcIso(tanggalStr) {
  if (!tanggalStr || typeof tanggalStr !== 'string') return null;
  const normalized = tanggalStr.trim().replace(' ', 'T').replace(/\+00(:00)?$/, 'Z');
  const ts = Date.parse(normalized);
  return Number.isNaN(ts) ? null : new Date(ts).toISOString();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const AWS_URL = 'https://awscenter.bmkg.go.id/base/marker_login_map';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const resp = await fetch(AWS_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin': 'https://awscenter.bmkg.go.id',
        'Referer': 'https://awscenter.bmkg.go.id/',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    const rawText = await resp.text();
    if (!resp.ok) {
      throw new Error(`AWS Center HTTP ${resp.status}`);
    }

    const trimmed = rawText.trim();
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      throw new Error('Respon AWS Center bukan JSON (kemungkinan halaman proteksi Cloudflare)');
    }

    const data = JSON.parse(trimmed);
    const riauStations = [];

    for (const item of data) {
      const provCode = item.kode_provinsi || '';
      const provName = String(item.nama_provinsi || '').trim().toLowerCase();

      if (provCode === 'PR005' || (provName === 'riau' && !provName.includes('kepulauan'))) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

        let tType = String(item.type || '').toLowerCase().trim();
        if (tType === 'iklimmikro') tType = 'ikro';

        const dDay = parseInt(item.diff_day || 0, 10);
        const dHour = parseInt(item.diff_hour || 0, 10);
        const dMin = parseInt(item.diff_minute || 0, 10);
        const totalMin = (dDay * 1440) + (dHour * 60) + dMin;

        riauStations.push({
          id_station: item.id_station,
          name_station: String(item.name_station || '').trim(),
          nama_kota: String(item.nama_kota || '').trim(),
          nama_provinsi: 'Riau',
          type: tType,
          lat: lat,
          lng: lng,
          tanggal: item.tanggal || '',
          tanggal_iso: parseAwsUtcIso(item.tanggal),
          diff_day: dDay,
          diff_hour: dHour,
          diff_minute: dMin,
          diff_minutes_total: totalMin,
          icon: item.icon || '',
          klasifikasi: item.klasifikasi || '1'
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      source: AWS_URL,
      timestamp: new Date().toISOString(),
      total: riauStations.length,
      stations: riauStations
    });

  } catch (err) {
    return res.status(502).json({
      status: 'error',
      message: err.message || 'Gagal mengambil data dari server AWS Center BMKG'
    });
  } finally {
    clearTimeout(timeout);
  }
}
