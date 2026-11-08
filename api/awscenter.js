// api/awscenter.js - Vercel Serverless Function
// Live Real-Time Scraper for BMKG AWS Center (Peralatan Cuaca & Iklim Riau)
// Source: https://awscenter.bmkg.go.id/base/marker_login_map

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const AWS_URL = 'https://awscenter.bmkg.go.id/base/marker_login_map';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const resp = await fetch(AWS_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Referer': 'https://awscenter.bmkg.go.id/',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      throw new Error(`AWS Center HTTP error: ${resp.status}`);
    }

    const data = await resp.json();
    const riauStations = [];

    for (const item of data) {
      const provCode = item.kode_provinsi || '';
      const provName = String(item.nama_provinsi || '').trim().toLowerCase();

      if (provCode === 'PR005' || (provName === 'riau' && !provName.includes('kepulauan'))) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng);
        if (isNaN(lat) || isNaN(lng)) continue;

        let tType = String(item.type || '').toLowerCase().trim();
        if (tType === 'iklimmikro') tType = 'ikro';

        const dDay = parseInt(item.diff_day || 0, 10);
        const dHour = parseInt(item.diff_hour || 0, 10);
        const dMin = parseInt(item.diff_minute || 0, 10);
        const totalMin = (dDay * 1440) + (dHour * 60) + dMin;

        riauStations.append || riauStations.push({
          id_station: item.id_station,
          name_station: String(item.name_station || '').trim(),
          nama_kota: String(item.nama_kota || '').trim(),
          nama_provinsi: 'Riau',
          type: tType,
          lat: lat,
          lng: lng,
          tanggal: item.tanggal || '',
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
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Gagal mengambil data dari server AWS Center BMKG'
    });
  }
}
