// api/slmon.js - Vercel Serverless Function
// Live Real-Time Scraper for BMKG SLMON Bali & InaTEWS (Alat Geofisika & Akselerograf Riau)
// Primary JSON: http://36.92.49.116:8899/slmon2bali/data/slmon.all.laststatus.json
// Mirror JSON : http://202.90.198.40/sismon-slmon2/data/slmon.all.laststatus.json

const SLMON_ENDPOINTS = [
  'http://36.92.49.116:8899/slmon2bali/data/slmon.all.laststatus.json',
  'http://202.90.198.40/sismon-slmon2/data/slmon.all.laststatus.json',
];

const SLMON_HTML_FALLBACK = 'http://202.90.198.40/sismon-wrs/web/slmon';

const KAB_MAPPING = {
  'BKNI': { nama: 'Bangkinang', kota: 'Kab. Kampar' },
  'DDSI': { nama: 'Dumai Timur', kota: 'Kota Dumai' },
  'GTSI': { nama: 'Gunung Toar', kota: 'Kab. Kuantan Singingi' },
  'IHRSI': { nama: 'Indragiri Hilir', kota: 'Kab. Indragiri Hilir' },
  'PRSI': { nama: 'Pelalawan', kota: 'Kab. Pelalawan' },
  'RGRI': { nama: 'Rengat', kota: 'Kab. Indragiri Hulu' },
  'RHRSI': { nama: 'Rokan Hilir', kota: 'Kab. Rokan Hilir' },
  'RRHRI': { nama: 'Rokan Hulu', kota: 'Kab. Rokan Hulu' },
  'RRSI': { nama: 'Rambah', kota: 'Kab. Rokan Hulu' },
  'SIRSI': { nama: 'Siak', kota: 'Kab. Siak' }
};

const pad = n => String(n).padStart(2, '0');

/** Parse UTC timestamp string like "2026-11-11 02:25:50.3931" into Date */
function parseSlmonUtcTime(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.split('.')[0].trim();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, y, m, d, hh, mm, ss] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
}

/** Format Date as WIB (UTC+7) DD/MM/YYYY HH:mm:ss */
function formatWibID(dateObj) {
  const d = new Date(dateObj.getTime() + 7 * 3600 * 1000);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} WIB`;
}

async function fetchSlmonJson(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data || !Array.isArray(data.features)) throw new Error('Format JSON SLMON tidak valid');
    return { fc: data, source: url };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSlmonHtmlFallback(timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(SLMON_HTML_FALLBACK, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    if (!resp.ok) throw new Error(`SLMON HTML HTTP ${resp.status}`);
    const html = await resp.text();
    const marker = 'var datapeta = ';
    const startIdx = html.indexOf(marker);
    if (startIdx === -1) throw new Error("Variabel 'datapeta' tidak ditemukan");
    const jsonStart = startIdx + marker.length;
    let jsonEnd = html.indexOf('};\n', jsonStart);
    if (jsonEnd === -1) jsonEnd = html.indexOf('};', jsonStart);
    if (jsonEnd === -1) throw new Error('Akhir GeoJSON tidak ditemukan');
    const fc = JSON.parse(html.substring(jsonStart, jsonEnd + 1).trim());
    return { fc, source: SLMON_HTML_FALLBACK };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let result;
    try {
      // Balap paralel antara server SLMON Bali JSON dan InaTEWS JSON
      result = await Promise.any(SLMON_ENDPOINTS.map(u => fetchSlmonJson(u, 22000)));
    } catch {
      result = await fetchSlmonHtmlFallback(20000);
    }

    const { fc, source } = result;
    const features = fc.features || [];
    const now = new Date();
    const riauStations = [];

    for (const f of features) {
      const p = f.properties || {};
      const coords = (f.geometry && f.geometry.coordinates) || [];
      if (coords.length < 2) continue;

      const sta = String(p.sta || '').trim().toUpperCase();
      const prov = String(p.provin || '').trim();
      const loc = String(p.location || '').trim();

      const isRiau = (prov.toLowerCase().includes('riau') && !prov.toLowerCase().includes('kepulauan')) || (sta in KAB_MAPPING);
      if (!isRiau) continue;

      const acMerk = p.merkac || 'Accelerograph';
      const bbMerk = p.merkbb || '';
      const dgtzMerk = p.merkdgtz || 'Digitizer';
      const upt = p.uptbmkg || 'Stageof-Padang-Panjang';

      const latAc = String(p.latency4 || p.latency1 || '5s').trim();
      const colAc = String(p.color4 || p.color1 || 'green').trim().toLowerCase();

      let status = 'Online';
      if (colAc === 'black' || colAc === 'grey' || colAc === 'red' || latAc.toLowerCase().includes('d') || latAc.toLowerCase().includes('h')) {
        status = 'Offline';
      } else if (colAc === 'yellow' || colAc === 'orange' || latAc.toLowerCase().includes('m')) {
        status = 'Delay';
      }

      const tipe = 'Accelerograph Colocated';
      const rawTime = p.timech4 || p.timech1 || p.time;
      const dtLast = parseSlmonUtcTime(rawTime) || now;
      const mapInfo = KAB_MAPPING[sta] || { nama: loc || sta, kota: `Kab. ${loc || prov}` };

      riauStations.push({
        kode_sta: sta,
        site_id: loc || mapInfo.nama,
        nama_sta: mapInfo.nama,
        tipe: tipe,
        lat: Number(coords[1]),
        lon: Number(coords[0]),
        kota_kab: mapInfo.kota,
        provinsi: 'Riau',
        digitizer: dgtzMerk.split('-')[0],
        digitizer_full: dgtzMerk,
        sensor: acMerk.split('-')[0],
        sensor_accelerograph: acMerk,
        sensor_broadband: bbMerk || 'Seismograph BB',
        status: status,
        slmon_latency: latAc,
        slmon_color: colAc,
        slmon_last_data: formatWibID(dtLast),
        last_data_iso: dtLast.toISOString(),
        slmon_upt: upt,
        last_updated: now.toISOString()
      });
    }

    return res.status(200).json({
      status: 'success',
      source,
      timestamp: now.toISOString(),
      total: riauStations.length,
      stations: riauStations
    });

  } catch (err) {
    return res.status(502).json({
      status: 'error',
      message: err.message || 'Gagal mengambil data dari server SLMON Bali / InaTEWS'
    });
  }
}
