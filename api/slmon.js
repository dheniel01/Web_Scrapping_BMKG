// api/slmon.js - Vercel Serverless Function
// Live Real-Time Scraper for BMKG SLMON InaTEWS (Alat Geofisika & Akselerograf Riau)
// Source: http://202.90.198.40/sismon-wrs/web/slmon

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SLMON_URL = 'http://202.90.198.40/sismon-wrs/web/slmon';

  const KAB_MAPPING = {
    'BKNI': { nama: 'Bangkinang', kota: 'Kab. Kampar' },
    'BRSN': { nama: 'BPBD Prov. Riau', kota: 'Kota Pekanbaru' },
    'GTSI': { nama: 'Gunung Toar', kota: 'Kab. Kuantan Singingi' },
    'IHRSI': { nama: 'Indragiri Hilir', kota: 'Kab. Indragiri Hilir' },
    'PRSI': { nama: 'Pelalawan', kota: 'Kab. Pelalawan' },
    'RGRI': { nama: 'Rengat', kota: 'Kab. Indragiri Hulu' },
    'RHRSI': { nama: 'Rokan Hilir', kota: 'Kab. Rokan Hilir' },
    'RRHRI': { nama: 'Rokan Hulu', kota: 'Kab. Rokan Hulu' },
    'RRSI': { nama: 'Rambah', kota: 'Kab. Rokan Hulu' },
    'SIRSI': { nama: 'Siak', kota: 'Kab. Siak' },
    'DDSI': { nama: 'Dumai Timur', kota: 'Kota Dumai' }
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const resp = await fetch(SLMON_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      throw new Error(`SLMON HTTP error: ${resp.status}`);
    }

    const html = await resp.text();
    const marker = 'var datapeta = ';
    const startIdx = html.indexOf(marker);

    if (startIdx === -1) {
      throw new Error("Variabel 'datapeta' tidak ditemukan di SLMON");
    }

    const jsonStart = startIdx + marker.length;
    let jsonEnd = html.indexOf('};\n', jsonStart);
    if (jsonEnd === -1) jsonEnd = html.indexOf('};', jsonStart);

    if (jsonEnd === -1) {
      throw new Error('Akhir GeoJSON tidak ditemukan');
    }

    const fc = JSON.parse(html.substring(jsonStart, jsonEnd + 1).trim());
    const features = fc.features || [];

    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const formatID = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

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
      const bbMerk = p.merkbb || 'Seismograph BB';
      const dgtzMerk = p.merkdgtz || 'Digitizer';
      const upt = p.uptbmkg || 'Stageof-Padang-Panjang';

      const latAc = p.latency4 || p.latency1 || '5s';
      const colAc = p.color4 || p.color1 || 'green';

      let status = 'Online';
      if (colAc === 'black' || String(latAc).toLowerCase().includes('d')) {
        status = 'Offline';
      } else if (colAc === 'yellow' || colAc === 'orange' || String(latAc).toLowerCase().includes('m')) {
        status = 'Online';
      }

      const tipe = (bbMerk && acMerk) ? 'Accelerograph Colocated' : 'Accelerograph 2020';

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
        sensor_broadband: bbMerk,
        status: status,
        slmon_latency: latAc,
        slmon_color: colAc,
        slmon_last_data: formatID(now),
        slmon_upt: upt,
        last_updated: now.toISOString()
      });
    }

    return res.status(200).json({
      status: 'success',
      source: SLMON_URL,
      timestamp: now.toISOString(),
      total: riauStations.length,
      stations: riauStations
    });

  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Gagal mengambil data dari server SLMON InaTEWS'
    });
  }
}
