
// ── Helper Real-Time Formatting ─────────────────────────────────────────────
function formatDateTimeID(dateOrTs) {
  const d = dateOrTs ? new Date(dateOrTs) : new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatBmkgUTC(dateOrTs) {
  const d = dateOrTs ? new Date(dateOrTs) : new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00`;
}

/** Parse BMKG timestamp string ("2026-11-11 02:09:00+00", ISO, or "DD/MM/YYYY HH:mm:ss WIB") ke epoch ms */
function parseBmkgTimestampMs(rawStr) {
  if (!rawStr || typeof rawStr !== 'string') return NaN;
  const s = rawStr.trim();
  const isoCandidate = s.replace(' ', 'T').replace(/\+00(:00)?$/, 'Z');
  const t = Date.parse(isoCandidate);
  if (!Number.isNaN(t)) return t;
  const mId = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?(?:\s*WIB)?$/i);
  if (mId) {
    const [, dd, mm, yyyy, hh, mi, ss] = mId;
    return Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh) - 7, Number(mi), Number(ss || 0));
  }
  return NaN;
}

function stationKey(s) {
  return `${s.kategori_bidang === 'AWS Center' ? 'AWS' : 'GEO'}:${s.kode_sta}`;
}

const RIAU_KAB_REGEX = /(pekanbaru|dumai|kampar|bengkalis|siak|pelalawan|rokan\s*(hulu|hilir)|indragiri|indragri|kuantan\s*singingi|meranti|riau)/i;
const NON_RIAU_REGEX = /(kepulauan\s*riau|kepri|padang|sumatera\s*(barat|utara|selatan)|sumbar|sumut|jambi|batam|bintan|karimun|lingga|natuna|anambas|tanjungpinang)/i;
const EXCLUDED_NON_RIAU_CODES = new Set(['PATU']);
const EXCLUDED_NON_API_GEO_CODES = new Set(['BRSN', 'PESI', 'STA6024']);

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function isPointInRiauPolygon(lat, lon) {
  const numLat = Number(lat), numLon = Number(lon);
  if (Number.isNaN(numLat) || Number.isNaN(numLon)) return false;
  if (numLat < -1.18 || numLat > 2.60 || numLon < 100.0 || numLon > 103.90) return false;
  const gj = window.RIAU_GEOJSON;
  if (!gj || !Array.isArray(gj.features)) return true;

  // Cek tepat di dalam poligon atau toleransi pesisir (~0.04 derajat / ~4.4 km untuk stasiun pantai Bengkalis/Meranti)
  const offsets = [[0, 0], [0.04, 0], [-0.04, 0], [0, 0.04], [0, -0.04]];
  for (const [dLat, dLon] of offsets) {
    const tLat = numLat + dLat, tLon = numLon + dLon;
    for (const feat of gj.features) {
      const g = feat.geometry;
      if (!g) continue;
      const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
      for (const poly of polys) {
        if (poly && poly[0] && pointInRing(tLon, tLat, poly[0])) return true;
      }
    }
  }
  return false;
}

function isRiauStation(s) {
  if (!s) return false;
  const code = String(s.kode_sta || s.id_station || '').trim().toUpperCase();
  if (EXCLUDED_NON_RIAU_CODES.has(code)) return false;
  const prov = String(s.provinsi || s.nama_provinsi || '').trim();
  const kota = String(s.kota_kab || s.nama_kota || '').trim();
  const name = String(s.nama_sta || s.name_station || '').trim();
  if (NON_RIAU_REGEX.test(prov) || NON_RIAU_REGEX.test(kota) || NON_RIAU_REGEX.test(name)) return false;
  if (prov && !/^riau$/i.test(prov)) return false;
  if (kota && !RIAU_KAB_REGEX.test(kota)) return false;
  const lat = Number(s.lat);
  const lon = Number(s.lon !== undefined ? s.lon : s.lng);
  return isPointInRiauPolygon(lat, lon);
}

let currentLegendTab = 'slmon';
function switchLegendTab(tab) {
  currentLegendTab = tab;
  const slmonContent = document.getElementById('content-legend-slmon');
  const awsContent = document.getElementById('content-legend-aws');
  const tabSlmon = document.getElementById('tab-legend-slmon');
  const tabAws = document.getElementById('tab-legend-aws');

  if (tab === 'slmon') {
    if (slmonContent) slmonContent.classList.remove('hidden');
    if (awsContent) awsContent.classList.add('hidden');
    if (tabSlmon) {
      tabSlmon.className = 'px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-white shadow-xs transition';
    }
    if (tabAws) {
      tabAws.className = 'px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition';
    }
  } else {
    if (slmonContent) slmonContent.classList.add('hidden');
    if (awsContent) awsContent.classList.remove('hidden');
    if (tabAws) {
      tabAws.className = 'px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-white shadow-xs transition';
    }
    if (tabSlmon) {
      tabSlmon.className = 'px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition';
    }
  }
}

/**
 * ============================================================================
 * PUSAT MONITORING ALAT GEOFISIKA BMKG - WILAYAH RIAU
 * Gaya visual mengikuti https://awscenter.bmkg.go.id/
 * ============================================================================
 *
 * Sumber data live:
 *  - SLMON Bali / InaTEWS : /api/slmon (Geofisika Riau)
 *  - AWS Center BMKG      : /api/awscenter (Cuaca & Iklim Riau)
 *  - Cache CDN Lokal      : data/geofisika_riau.json & data/aws_riau.json
 */

// ── Konfigurasi ────────────────────────────────────────────────────────────
const RIAU_CENTER = [0.55, 101.65];
const RIAU_ZOOM = 8;
const RIAU_BOUNDS = L.latLngBounds(L.latLng(-1.25, 99.90), L.latLng(2.65, 103.95));

// Fallback data stasiun jika dibuka langsung via file:/// (CORS fetch lokal diblokir browser)

const DEFAULT_AWS_STATIONS = [
  {
    "id_station": "STA0150",
    "name_station": "ARG Tanah Putih",
    "nama_kota": "Kab. Rokan Hilir",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 1.5586775,
    "lng": 101.0003386,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA3202",
    "name_station": "AAWS Tambang Kampar",
    "nama_kota": "Kab. Kampar",
    "nama_provinsi": "Riau",
    "type": "aaws",
    "lat": 0.40751419,
    "lng": 101.21727325,
    "tanggal": "2026-11-02 20:20:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 25,
    "diff_minutes_total": 25,
    "icon": "status_aaws_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA2176",
    "name_station": "AWS Pekan Arba Indragiri Hilir",
    "nama_kota": "Kab. Indragri Hilir",
    "nama_provinsi": "Riau",
    "type": "aws",
    "lat": -0.297028,
    "lng": 103.13228,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_aws_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STW1145",
    "name_station": "AWS Bukit Raya Pekanbaru",
    "nama_kota": "Kota Pekanbaru",
    "nama_provinsi": "Riau",
    "type": "aws",
    "lat": 0.47019412,
    "lng": 101.45804555,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_aws_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0155",
    "name_station": "ARG XIII Koto Kampar",
    "nama_kota": "Kab. Kampar",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.317775,
    "lng": 100.735327,
    "tanggal": "2026-11-02 20:30:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 15,
    "diff_minutes_total": 15,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0152",
    "name_station": "ARG Siak",
    "nama_kota": "Kab. Siak",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.814548,
    "lng": 102.021211,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0207",
    "name_station": "ARG Tebing Tinggi",
    "nama_kota": "Kab. Kep. Meranti",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 1.007886,
    "lng": 102.716065,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA3259",
    "name_station": "ARG SMPK Bunga Raya",
    "nama_kota": "Kab. Siak",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.960321,
    "lng": 102.072948,
    "tanggal": "2026-11-01 11:00:00+00",
    "diff_day": 1,
    "diff_hour": 9,
    "diff_minute": 45,
    "diff_minutes_total": 2025,
    "icon": "status_arg_11_30.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "150118",
    "name_station": "ARG Pusako",
    "nama_kota": "Kab. Siak",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 1.017705,
    "lng": 102.116015,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0202",
    "name_station": "ARG Bukit Batu",
    "nama_kota": "Kab. Bengkalis",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 1.364224,
    "lng": 102.154964,
    "tanggal": "2026-11-02 20:30:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 15,
    "diff_minutes_total": 15,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STW1054",
    "name_station": "AWS Bandar Laksamana Bengkalis",
    "nama_kota": "Kab. Bengkalis",
    "nama_provinsi": "Riau",
    "type": "aws",
    "lat": 1.594608,
    "lng": 101.817134,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_aws_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0154",
    "name_station": "ARG Pasir Pangaraian",
    "nama_kota": "Kab. Rokan Hulu",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.896111,
    "lng": 100.3039,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "150119",
    "name_station": "ARG Tandun",
    "nama_kota": "Kab. Rokan Hulu",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.611507,
    "lng": 100.55404,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "150120",
    "name_station": "ARG Tambusai",
    "nama_kota": "Kab. Rokan Hulu",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 1.056944,
    "lng": 100.2611,
    "tanggal": "2026-11-02 20:30:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 15,
    "diff_minutes_total": 15,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0174",
    "name_station": "ARG Teluk Meranti",
    "nama_kota": "Kab. Pelalawan",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.149333,
    "lng": 102.5604,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "50015",
    "name_station": "Iklim Mikro Stasiun Klimatologi Riau",
    "nama_kota": "Kab. Kampar",
    "nama_provinsi": "Riau",
    "type": "ikro",
    "lat": 0.40751419,
    "lng": 101.21727325,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_ikro_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STM1026",
    "name_station": "Soil Moisture Stasiun Klimatologi Riau",
    "nama_kota": "Kab. Kampar",
    "nama_provinsi": "Riau",
    "type": "soil",
    "lat": 0.40721,
    "lng": 101.216989,
    "tanggal": "2026-11-02 20:30:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 15,
    "diff_minutes_total": 15,
    "icon": "status_soil_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA6024",
    "name_station": "ASRS Stasiun Klimatologi Riau",
    "nama_kota": "Kab. Kampar",
    "nama_provinsi": "Riau",
    "type": "asrs",
    "lat": 0.40751419,
    "lng": 101.21727325,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_asrs_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STW1032",
    "name_station": "AWS Mesonetwork Rokan Hulu",
    "nama_kota": "Kab. Rokan Hulu",
    "nama_provinsi": "Riau",
    "type": "aws",
    "lat": 0.841434,
    "lng": 100.3375,
    "tanggal": "2026-11-02 20:32:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 13,
    "diff_minutes_total": 13,
    "icon": "status_aws_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0151",
    "name_station": "ARG Bantan",
    "nama_kota": "Kab. Bengkalis",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 1.499444,
    "lng": 102.1459,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "150116",
    "name_station": "ARG Kuala Kampar",
    "nama_kota": "Kab. Pelalawan",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.531027,
    "lng": 103.2677,
    "tanggal": "2026-11-02 20:39:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 6,
    "diff_minutes_total": 6,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STAL041",
    "name_station": "ARG BPP Rumbai Timur",
    "nama_kota": "Kota Pekanbaru",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.566667,
    "lng": 101.46,
    "tanggal": "2026-10-28 14:20:00+00",
    "diff_day": 5,
    "diff_hour": 6,
    "diff_minute": 25,
    "diff_minutes_total": 7585,
    "icon": "status_arg_11_30.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "150117",
    "name_station": "ARG Minas",
    "nama_kota": "Kab. Siak",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.699143,
    "lng": 101.438512,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0205",
    "name_station": "ARG Rokan IV Koto",
    "nama_kota": "Kab. Rokan Hilir",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.571355,
    "lng": 100.427113,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0133",
    "name_station": "ARG Kandis",
    "nama_kota": "Kab. Siak",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.8896927,
    "lng": 101.2369606,
    "tanggal": "2026-11-02 20:30:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 15,
    "diff_minutes_total": 15,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0201",
    "name_station": "ARG SMPK Bangkinang",
    "nama_kota": "Kab. Kampar",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.326326,
    "lng": 101.039558,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0153",
    "name_station": "ARG Kuantan Tengah",
    "nama_kota": "Kab. Kuantan Singingi",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": -0.540839,
    "lng": 101.554764,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "AAWS0356",
    "name_station": "AAWS Gunung Toar Kuantan Singingi",
    "nama_kota": "Kab. Kuantan Singingi",
    "nama_provinsi": "Riau",
    "type": "aaws",
    "lat": -0.598066,
    "lng": 101.48648,
    "tanggal": "2026-11-02 20:20:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 25,
    "diff_minutes_total": 25,
    "icon": "status_aaws_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STW1037",
    "name_station": "AWS  Mesonetwork  Kampar",
    "nama_kota": "Kab. Kampar",
    "nama_provinsi": "Riau",
    "type": "aws",
    "lat": 0.614,
    "lng": 100.9734,
    "tanggal": "2026-11-02 14:56:00+00",
    "diff_day": 0,
    "diff_hour": 5,
    "diff_minute": 49,
    "diff_minutes_total": 349,
    "icon": "status_aws_6_10.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0209",
    "name_station": "ARG Dumai Timur",
    "nama_kota": "Kota Dumai",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 1.669771,
    "lng": 101.459353,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0208",
    "name_station": "ARG Batang Cenaku",
    "nama_kota": "Kab. Indragiri Hulu",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": -0.663637,
    "lng": 102.278824,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA5021",
    "name_station": "AWS Digi Stamet Pekanbaru",
    "nama_kota": "Kota Pekanbaru",
    "nama_provinsi": "Riau",
    "type": "aws",
    "lat": 0.46083,
    "lng": 101.444,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_aws_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA3203",
    "name_station": "AAWS Rimba Melintang Rokan Hilir",
    "nama_kota": "Kab. Rokan Hilir",
    "nama_provinsi": "Riau",
    "type": "aaws",
    "lat": 1.84561319,
    "lng": 100.97833333,
    "tanggal": "2026-11-02 20:16:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 29,
    "diff_minutes_total": 29,
    "icon": "status_aaws_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STA0206",
    "name_station": "ARG Tembilahan",
    "nama_kota": "Kab. Indragri Hilir",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": -0.324388,
    "lng": 103.157754,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  },
  {
    "id_station": "STAL042",
    "name_station": "ARG BPP Kampar Kiri",
    "nama_kota": "Kab. Kampar",
    "nama_provinsi": "Riau",
    "type": "arg",
    "lat": 0.04721,
    "lng": 101.204541,
    "tanggal": "2026-11-02 20:40:00+00",
    "diff_day": 0,
    "diff_hour": 0,
    "diff_minute": 5,
    "diff_minutes_total": 5,
    "icon": "status_arg_1.png",
    "klasifikasi": "1"
  }
];
const DEFAULT_STATIONS = [
  {
    "kode_sta": "BKNI",
    "site_id": "Bangkinang",
    "nama_sta": "Bangkinang",
    "tipe": "Accelerograph Colocated",
    "lat": 0.33,
    "lon": 101.04,
    "kota_kab": "Kab. Kampar",
    "provinsi": "Riau",
    "digitizer": "Q330",
    "sensor": "FBA ES-T",
    "status": "Online",
    "tanggal_instalasi": "14/03/2008",
    "slmon_latency": "5s",
    "slmon_color": "green",
    "slmon_last_data": "29/10/2026 03:55",
    "slmon_upt": "Stageof-Padang-Panjang"
  },
  {
    "kode_sta": "GTSI",
    "site_id": "Gunung Toar, Kuantan Singingi",
    "nama_sta": "Gunung Toar",
    "tipe": "Accelerograph Colocated",
    "lat": -0.6,
    "lon": 101.49,
    "kota_kab": "Kab. Kuantan Singingi",
    "provinsi": "Riau",
    "digitizer": "Centaur",
    "sensor": "Titan",
    "status": "Offline",
    "tanggal_instalasi": "2019",
    "slmon_latency": "1d 0h",
    "slmon_color": "black",
    "slmon_last_data": "27/10/2026 23:49",
    "slmon_upt": "Stageof-Padang-Panjang"
  },
  {
    "kode_sta": "IHRSI",
    "site_id": "Indragiri Hilir",
    "nama_sta": "Indragiri Hilir",
    "tipe": "Accelerograph Colocated",
    "lat": 0.02,
    "lon": 103.17,
    "kota_kab": "Kab. Indragri Hilir",
    "provinsi": "Riau",
    "digitizer": "Guralp",
    "sensor": "Guralp Fortis",
    "status": "Online",
    "tanggal_instalasi": "-",
    "slmon_latency": "8s",
    "slmon_color": "green",
    "slmon_last_data": "29/10/2026 03:55",
    "slmon_upt": "Stageof-Padang-Panjang"
  },
  {
    "kode_sta": "PRSI",
    "site_id": "Pelalawan, Riau",
    "nama_sta": "Pelalawan",
    "tipe": "Accelerograph Colocated",
    "lat": 0.37,
    "lon": 102.17,
    "kota_kab": "Kab. Pelalawan",
    "provinsi": "Riau",
    "digitizer": "Guralp",
    "sensor": "Guralp Fortis",
    "status": "Online",
    "tanggal_instalasi": "-",
    "slmon_latency": "9s",
    "slmon_color": "green",
    "slmon_last_data": "29/10/2026 03:55",
    "slmon_upt": "Stageof-Padang-Panjang"
  },
  {
    "kode_sta": "RGRI",
    "site_id": "Rengat",
    "nama_sta": "Rengat",
    "tipe": "Accelerograph Colocated",
    "lat": -0.35,
    "lon": 102.33,
    "kota_kab": "Kab. Indragiri Hulu",
    "provinsi": "Riau",
    "digitizer": "Centaur",
    "sensor": "Titan",
    "status": "Online",
    "tanggal_instalasi": "11/29/2019",
    "slmon_latency": "2s",
    "slmon_color": "green",
    "slmon_last_data": "29/10/2026 03:55",
    "slmon_upt": "Stageof-Padang-Panjang"
  },
  {
    "kode_sta": "RHRSI",
    "site_id": "Rokan Hilir, Riau",
    "nama_sta": "Rokan Hilir",
    "tipe": "Accelerograph Colocated",
    "lat": 1.44,
    "lon": 100.51,
    "kota_kab": "Kab. Rokan Hilir",
    "provinsi": "Riau",
    "digitizer": "Guralp",
    "sensor": "Guralp Fortis",
    "status": "Online",
    "tanggal_instalasi": "-",
    "slmon_latency": "1m 0s",
    "slmon_color": "orange",
    "slmon_last_data": "29/10/2026 03:54",
    "slmon_upt": "Stageof-Padang-Panjang"
  },
  {
    "kode_sta": "RRHRI",
    "site_id": "Rokan IV Koto, Rokan Hulu",
    "nama_sta": "Rokan Hulu",
    "tipe": "Accelerograph Colocated",
    "lat": 0.57,
    "lon": 100.43,
    "kota_kab": "Kab. Rokan Hulu",
    "provinsi": "Riau",
    "digitizer": "Centaur",
    "sensor": "Titan",
    "status": "Online",
    "tanggal_instalasi": "2022",
    "slmon_latency": "2m 0s",
    "slmon_color": "orange",
    "slmon_last_data": "29/10/2026 03:53",
    "slmon_upt": "Stageof-Padang-Panjang"
  },
  {
    "kode_sta": "RRSI",
    "site_id": "Rambah, Rokan Hulu",
    "nama_sta": "Rambah",
    "tipe": "Accelerograph Colocated",
    "lat": 0.84,
    "lon": 100.35,
    "kota_kab": "Kab. Rokan Hulu",
    "provinsi": "Riau",
    "digitizer": "Centaur",
    "sensor": "Titan",
    "status": "Online",
    "tanggal_instalasi": "2019",
    "slmon_latency": "4s",
    "slmon_color": "green",
    "slmon_last_data": "29/10/2026 03:55",
    "slmon_upt": "Stageof-Padang-Panjang"
  },
  {
    "kode_sta": "SIRSI",
    "site_id": "Siak, Riau",
    "nama_sta": "Siak",
    "tipe": "Accelerograph Colocated",
    "lat": 0.86,
    "lon": 101.66,
    "kota_kab": "Kab. Siak",
    "provinsi": "Riau",
    "digitizer": "Guralp",
    "sensor": "Guralp Fortis",
    "status": "Online",
    "tanggal_instalasi": "-",
    "slmon_latency": "7s",
    "slmon_color": "green",
    "slmon_last_data": "29/10/2026 03:55",
    "slmon_upt": "Stageof-Padang-Panjang"
  }
];

// Kategori status berdasarkan umur data terakhir (persis legenda awscenter)
const STATUS_CATS = [
  { label: '<= 30 Menit', color: '#43a047', max: 30 },
  { label: '31 - 60 Menit', color: '#fdd835', max: 60 },
  { label: '1 - 24 Jam', color: '#ffb74d', max: 1440 },
  { label: '1 - 30 Hari', color: '#a1665e', max: 43200 },
  { label: '> 30 Hari', color: '#f44336', max: Infinity },
];

// Bentuk ikon per tipe alat (gaya tombol awscenter)
const TYPE_CONFIG = {
  'all': { short: 'ALL', shape: 'square', icon: 'fa-check', title: 'Semua Tipe' },
  // Geofisika (Akselerograf) - Bangun Datar Polos
  'Accelerograph Colocated': { short: 'COL', shape: 'hexagon', icon: 'fa-wave-square', title: 'Accelerograph Colocated (Segi Enam Polos)' },
  // AWS Center BMKG (Cuaca & Iklim) - Bangun Datar Polos
  'AWS': { short: 'AWS', shape: 'circle', icon: 'fa-cloud-sun', title: 'AWS (Lingkaran Polos)' },
  'ARG': { short: 'ARG', shape: 'triangle', icon: 'fa-cloud-rain', title: 'ARG (Segitiga Polos)' },
  'AAWS': { short: 'AAWS', shape: 'diamond', icon: 'fa-seedling', title: 'AAWS (Belah Ketupat Polos)' },
  'ASRS': { short: 'ASRS', shape: 'star', icon: 'fa-sun', title: 'ASRS (Bintang Polos)' },
  'IKRO': { short: 'IKRO', shape: 'square', icon: 'fa-temperature-high', title: 'IKRO (Persegi Polos)' },
  'SOIL': { short: 'SOIL', shape: 'rect', icon: 'fa-layer-group', title: 'SOIL (Persegi Panjang Polos)' },
  'SHIP': { short: 'SHIP', shape: 'octagon', icon: 'fa-ship', title: 'SHIP (Segi Delapan Polos)' },
};

const RIAU_KABUPATEN = [
  { nama: 'Kota Pekanbaru', lat: 0.56, lon: 101.45 },
  { nama: 'Kota Dumai', lat: 1.60, lon: 101.40 },
  { nama: 'Kab. Kampar', lat: 0.20, lon: 100.95 },
  { nama: 'Kab. Bengkalis', lat: 1.40, lon: 101.95 },
  { nama: 'Kab. Siak', lat: 0.90, lon: 101.95 },
  { nama: 'Kab. Pelalawan', lat: 0.15, lon: 102.40 },
  { nama: 'Kab. Rokan Hulu', lat: 0.95, lon: 100.40 },
  { nama: 'Kab. Rokan Hilir', lat: 2.00, lon: 100.85 },
  { nama: 'Kab. Indragiri Hulu', lat: -0.55, lon: 102.30 },
  { nama: 'Kab. Indragiri Hilir', lat: -0.45, lon: 103.25 },
  { nama: 'Kab. Kuantan Singingi', lat: -0.65, lon: 101.55 },
  { nama: 'Kab. Kep. Meranti', lat: 1.00, lon: 102.75 },
];

// ── State ──────────────────────────────────────────────────────────────────
let map, clusterGroup, plainGroup, riauMaskLayer, riauLabelsLayer;
let stations = [];             // data stasiun + telemetri
const markerByKode = {};
let useClustering = false;
let isMaskActive = false, isLabelsActive = true, isStationLabelsActive = true;
let filters = { kota: '', tipe: 'all', cat: -1, slmonStatus: '' };
let rawGeoCache = [];
let rawAwsCache = [];
let syncState = { slmon: 'loading', aws: 'loading', slmonAt: null, awsAt: null, awsErr: '' };
let currentModalStation = null;

function updateLiveSyncBadge() {
  const badge = document.getElementById('live-sync-badge');
  const dot = document.getElementById('live-sync-dot');
  if (!badge) return;
  const bothOk = syncState.slmon === 'live' && syncState.aws === 'live';
  const anyOk = syncState.slmon === 'live' || syncState.aws === 'live';
  const anyLoading = syncState.slmon === 'loading' || syncState.aws === 'loading';
  if (bothOk) {
    badge.textContent = 'SLMON + AWS Live';
    badge.className = 'ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-100 text-emerald-800';
    if (dot) dot.className = 'w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse';
  } else if (anyLoading) {
    badge.textContent = syncState.slmon === 'live' ? 'SLMON Live · Sync AWS...' : 'Menyinkronkan BMKG...';
    badge.className = 'ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800';
    if (dot) dot.className = 'w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse';
  } else if (anyOk) {
    badge.textContent = syncState.aws === 'live' ? 'AWS Live' : 'SLMON Live · AWS Cache';
    badge.className = 'ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-sky-100 text-sky-800';
    if (dot) dot.className = 'w-2.5 h-2.5 bg-sky-500 rounded-full animate-pulse';
  } else {
    badge.textContent = 'Mode Cache Lokal';
    badge.className = 'ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-100 text-rose-800';
    if (dot) dot.className = 'w-2.5 h-2.5 bg-rose-500 rounded-full';
  }
  const slTime = syncState.slmonAt ? formatTime(syncState.slmonAt) : '-';
  const awsTime = syncState.awsAt ? formatTime(syncState.awsAt) : (syncState.awsErr || '-');
  badge.title = `SLMON Bali: ${syncState.slmon} (${slTime}) | AWS Center: ${syncState.aws} (${awsTime})`;
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initClock();
  loadRiauBoundary();
  loadStationData();
  setupEvents();

  setInterval(tickTelemetry, 5000);                                                            // update umur data live tiap 5 detik tanpa memalsukan waktu
  setInterval(() => refreshLiveTelemetryInBackground({ slmon: true, aws: false }), 30000);     // SLMON Bali live tiap 30 detik
  setInterval(() => refreshLiveTelemetryInBackground({ slmon: false, aws: true }), 60000);     // AWS Center live tiap 60 detik
});

// ── Helper bentuk SVG ──────────────────────────────────────────────────────
function shapeSVG(shape, fill, size, stroke = '#ffffff', sw = 2) {
  const shapes = {
    circle: `<circle cx="12" cy="12" r="10"/>`,
    triangle: `<polygon points="12,2 22.5,21 1.5,21" stroke-linejoin="round"/>`,
    'triangle-down': `<polygon points="1.5,3 22.5,3 12,22" stroke-linejoin="round"/>`,
    diamond: `<polygon points="12,1.5 22.5,12 12,22.5 1.5,12" stroke-linejoin="round"/>`,
    hexagon: `<polygon points="12,1.5 21.5,7 21.5,17 12,22.5 2.5,17 2.5,7" stroke-linejoin="round"/>`,
    octagon: `<polygon points="7.5,1.5 16.5,1.5 22.5,7.5 22.5,16.5 16.5,22.5 7.5,22.5 1.5,16.5 1.5,7.5" stroke-linejoin="round"/>`,
    square: `<rect x="2.5" y="2.5" width="19" height="19" rx="2"/>`,
    rect: `<rect x="2" y="6" width="20" height="12" rx="2"/>`,
    star: `<polygon points="12,1.5 14.8,8.2 22,8.8 16.5,13.6 18.2,20.7 12,17 5.8,20.7 7.5,13.6 2,8.8 9.2,8.2" stroke-linejoin="round"/>`,
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${sw}">${shapes[shape] || shapes.circle}</svg>`;
}

function getStationShape(s) {
  if (!s) return 'circle';
  // 1. Geofisika (Akselerograf) - Bangun Datar Polos
  if (s.tipe === 'Accelerograph Colocated') return 'hexagon';       // Segi Enam Polos

  // 2. AWS Center BMKG (Cuaca & Iklim) - Bangun Datar Polos
  const t = (s.tipe || '').toUpperCase();
  if (t === 'AAWS') return 'diamond';       // Belah Ketupat Polos
  if (t === 'AWS') return 'circle';         // Lingkaran Polos
  if (t === 'ARG') return 'triangle';       // Segitiga Polos
  if (t === 'ASRS') return 'star';          // Bintang Polos
  if (t === 'IKRO') return 'square';        // Persegi Polos
  if (t === 'SOIL') return 'rect';          // Persegi Panjang Polos
  if (t === 'SHIP') return 'octagon';

  const cfg = TYPE_CONFIG[s.tipe] || TYPE_CONFIG['Accelerograph Colocated'];
  return cfg.shape || 'circle';
}

// ── Peta ───────────────────────────────────────────────────────────────────
function initMap() {
  map = L.map('map', {
    center: RIAU_CENTER, zoom: RIAU_ZOOM, zoomControl: false,
    minZoom: 4, maxZoom: 18,
    maxBoundsViscosity: 1.0,
  });
  if (isMaskActive) {
    map.setMinZoom(7);
    map.setMaxBounds(RIAU_BOUNDS);
  }

  // Base map gaya OpenStreetMap standar (Default aktif pertama kali buka web)
  const osmClassic = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, subdomains: ['a', 'b', 'c'], attribution: '&copy; OpenStreetMap contributors | BMKG',
  }).addTo(map);

  const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd', attribution: '&copy; CARTO &copy; OpenStreetMap | BMKG',
  });

  const osmHot = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap Humanitarian | BMKG',
  });

  const esriStreet = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Tiles &copy; Esri | BMKG Geofisika',
  });

  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18, attribution: 'Tiles &copy; Esri Satelit',
  });

  L.control.layers({
    '🗺️ Peta Standar (OSM)': osmClassic,
    '🧭 Peta Voyager': cartoVoyager,
    '🌐 Peta OSM (HOT)': osmHot,
    '🏢 Peta Esri Street': esriStreet,
    '🛰️ Citra Satelit': sat,
  }, null, { position: 'topright' }).addTo(map);

  // Kontrol kiri atas: zoom, recenter, reload (seperti awscenter)
  const Ctl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const c = L.DomUtil.create('div', 'leaflet-bar');
      const btn = (html, title, fn) => {
        const a = L.DomUtil.create('a', '', c);
        a.innerHTML = html; a.href = '#'; a.title = title;
        L.DomEvent.on(a, 'click', (e) => { L.DomEvent.preventDefault(e); fn(); });
      };
      btn('+', 'Perbesar', () => map.zoomIn());
      btn('−', 'Perkecil', () => map.zoomOut());
      btn('<i class="fa fa-crosshairs"></i>', 'Pusatkan ke Riau', () => {
        if (isMaskActive) map.setMaxBounds(RIAU_BOUNDS);
        map.setView(RIAU_CENTER, RIAU_ZOOM);
      });
      btn('<i class="fa fa-sync-alt"></i>', 'Muat ulang data', () => { loadStationData(); });
      return c;
    },
  });
  map.addControl(new Ctl());

  clusterGroup = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 40 });
  plainGroup = L.layerGroup().addTo(map);
  riauLabelsLayer = L.layerGroup().addTo(map);

  RIAU_KABUPATEN.forEach(k => {
    L.marker([k.lat, k.lon], {
      interactive: false, zIndexOffset: -1000,
      icon: L.divIcon({ className: '', iconSize: null, html: `<div class="region-label" style="transform:translate(-50%,-50%)">${k.nama}</div>` }),
    }).addTo(riauLabelsLayer);
  });

  // Klik daerah di luar Provinsi Riau tidak memunculkan menu/popup apapun
  map.on('click', (e) => {
    if (e && e.latlng && !isPointInRiauPolygon(e.latlng.lat, e.latlng.lng)) {
      map.closePopup();
      closeStationModal();
    }
  });
  map.on('popupclose', () => {});
}

// ── Batas & masking Riau ───────────────────────────────────────────────────
async function loadRiauBoundary() {
  try {
    let gj = window.RIAU_GEOJSON;
    if (!gj) {
      try {
        const res = await fetch('data/riau.geojson?t=' + Date.now());
        if (res.ok) gj = await res.json();
      } catch (fetchErr) {
        console.warn('Fetch riau.geojson gagal (file:///):', fetchErr);
      }
    }

    if (!gj || !gj.features) {
      console.warn('Data geojson batas Riau tidak tersedia');
      return;
    }

    const rings = [[[90, -180], [90, 180], [-90, 180], [-90, -180]]];
    gj.features.forEach(f => {
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
      polys.forEach(p => rings.push(p[0].map(pt => [pt[1], pt[0]])));
    });

    riauMaskLayer = L.polygon(rings, {
      stroke: false,
      fillColor: '#0f172a',
      fillOpacity: 0.55,
      fillRule: 'evenodd',
      interactive: true,
    });

    // Saat Fokus Hanya Riau aktif, klik area luar Riau menutup popup/detail bila ada
    riauMaskLayer.on('click', (e) => {
      if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
      map.closePopup();
      closeStationModal();
    });
    riauMaskLayer.on('add', () => {
      const el = riauMaskLayer.getElement?.();
      if (el) el.style.cursor = 'default';
    });

    if (isMaskActive) {
      riauMaskLayer.addTo(map);
    }

    L.geoJSON(gj, {
      interactive: false,
      style: { color: '#0284c7', weight: 3, opacity: 0.9, dashArray: '6,6', fillOpacity: 0 },
    }).addTo(map);
  } catch (e) {
    console.warn('Gagal memuat batas Riau:', e);
  }
}

function toggleRiauMask() {
  isMaskActive = !isMaskActive;
  const btn = document.getElementById('btn-toggle-mask');
  const textEl = document.getElementById('mask-status-text');

  if (isMaskActive) {
    // Mode Fokus Hanya Riau -> aktifkan masking luar Riau & kunci kamera di batas Riau
    if (riauMaskLayer && !map.hasLayer(riauMaskLayer)) {
      riauMaskLayer.addTo(map);
    }
    map.setMinZoom(7);
    map.setMaxBounds(RIAU_BOUNDS);
    map.flyTo(RIAU_CENTER, RIAU_ZOOM, { duration: 0.8 });
    if (textEl) textEl.textContent = 'Fokus: Hanya Riau (Aktif)';
    if (btn) {
      btn.classList.remove('text-gray-700');
      btn.classList.add('bg-blue-100', 'border-blue-400', 'text-blue-900');
    }
  } else {
    // Mode Peta Penuh -> lepas masking & maxBounds agar seluruh peta membentang bebas
    if (riauMaskLayer && map.hasLayer(riauMaskLayer)) {
      map.removeLayer(riauMaskLayer);
    }
    map.setMinZoom(4);
    map.setMaxBounds(null);
    if (textEl) textEl.textContent = 'Fokus: Hanya Riau';
    if (btn) {
      btn.classList.remove('bg-blue-100', 'border-blue-400', 'text-blue-900');
      btn.classList.add('text-gray-700');
    }
  }
}

function toggleRiauLabels() {
  isLabelsActive = !isLabelsActive;
  isLabelsActive ? map.addLayer(riauLabelsLayer) : map.removeLayer(riauLabelsLayer);
}

function toggleStationLabels() {
  isStationLabelsActive = !isStationLabelsActive;
  const txt = document.getElementById('txt-toggle-sta-labels');
  const btn = document.getElementById('btn-toggle-sta-labels');
  if (txt) txt.textContent = isStationLabelsActive ? 'Label Akselero: On' : 'Label Akselero: Off';
  if (btn) {
    if (isStationLabelsActive) {
      btn.className = 'pill bg-amber-50 border-amber-300 text-amber-900 font-semibold';
    } else {
      btn.className = 'pill bg-white/80 opacity-60 text-gray-500 font-medium';
    }
  }
  const codes = document.querySelectorAll('.sta-marker .code');
  codes.forEach(el => {
    el.style.display = isStationLabelsActive ? 'block' : 'none';
  });
}

// ── Jam ────────────────────────────────────────────────────────────────────
function initClock() {
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    const d = new Date();
    const el = document.getElementById('clock-timestamp');
    if (el) {
      el.textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} WIB`;
    }
  };
  tick();
  setInterval(tick, 1000);
}

// ── Data stasiun + telemetri (Super Cepat < 50ms & Revalidasi Background) ────
function mergeGeoStations(baseGeo, liveGeo) {
  if (!Array.isArray(liveGeo) || !liveGeo.length) return baseGeo;
  const byCode = new Map((baseGeo || []).map(s => [s.kode_sta, s]));
  const seen = new Set();
  const merged = liveGeo.map(l => {
    seen.add(l.kode_sta);
    const prev = byCode.get(l.kode_sta) || {};
    return { ...prev, ...l };
  });
  for (const s of (baseGeo || [])) {
    if (!seen.has(s.kode_sta)) merged.push(s);
  }
  return merged;
}

function processAndRenderStations(geoRaw, awsRaw, fit = false) {
  const now = Date.now();
  rawGeoCache = geoRaw || rawGeoCache;
  rawAwsCache = awsRaw || rawAwsCache;

  const geoStations = (rawGeoCache || []).filter(s => s && !EXCLUDED_NON_API_GEO_CODES.has(String(s.kode_sta || '').toUpperCase()) && isRiauStation(s)).map(s => {
    const latStr = String(s.slmon_latency || '5s').trim();
    const col = String(s.slmon_color || 'green').trim().toLowerCase();
    let status = 'Online';
    if (col === 'black' || col === 'grey' || col === 'red' || latStr.toLowerCase().includes('d') || latStr.toLowerCase().includes('h')) {
      status = 'Offline';
    } else if (col === 'orange' || col === 'yellow' || latStr.toLowerCase().includes('m')) {
      status = 'Delay';
    }

    let parsedTs = parseBmkgTimestampMs(s.last_data_iso) || parseBmkgTimestampMs(s.slmon_last_data);
    if (Number.isNaN(parsedTs)) {
      let ageMs = 5000;
      if (latStr.includes('d')) ageMs = (parseInt(latStr, 10) || 1) * 86400000;
      else if (latStr.includes('h')) ageMs = (parseInt(latStr, 10) || 1) * 3600000;
      else if (latStr.includes('m')) ageMs = (parseInt(latStr, 10) || 1) * 60000;
      else ageMs = (parseInt(latStr, 10) || 5) * 1000;
      parsedTs = now - ageMs;
    }

    return {
      ...s,
      base_latency: latStr,
      slmon_color: col,
      status: status,
      kategori_bidang: 'Geofisika',
      lastSeen: parsedTs,
      slmon_last_data: s.slmon_last_data || formatDateTimeID(parsedTs),
      latency: 80 + Math.round(Math.random() * 250)
    };
  });

  const awsMapped = (rawAwsCache || []).map(a => {
    const parsedTs = parseBmkgTimestampMs(a.tanggal_iso) || parseBmkgTimestampMs(a.tanggal);
    const fallbackTotalMin = ((a.diff_day || 0) * 1440) + ((a.diff_hour || 0) * 60) + (a.diff_minute || 0);
    const lastSeenMs = !Number.isNaN(parsedTs) ? parsedTs : (now - fallbackTotalMin * 60000);
    const realTotalMin = Math.max(0, Math.floor((now - lastSeenMs) / 60000));
    const dDay = Math.floor(realTotalMin / 1440);
    const dHour = Math.floor((realTotalMin % 1440) / 60);
    const dMin = realTotalMin % 60;
    const tUpper = (a.type || 'aws').toUpperCase();

    return {
      kode_sta: a.id_station,
      site_id: a.name_station,
      nama_sta: a.name_station,
      kota_kab: a.nama_kota,
      provinsi: 'Riau',
      tipe: tUpper,
      kategori_bidang: 'AWS Center',
      lat: Number(a.lat),
      lon: Number(a.lng),
      lastSeen: lastSeenMs,
      diff_day: dDay,
      diff_hour: dHour,
      diff_minute: dMin,
      diff_minutes_total: realTotalMin,
      tanggal_data: a.tanggal || formatBmkgUTC(lastSeenMs),
      klasifikasi: a.klasifikasi || '1',
      icon_file: a.icon || `status_${a.type}_1.png`,
      status: realTotalMin <= 60 ? 'Online' : (realTotalMin <= 1440 ? 'Delay' : 'Offline')
    };
  }).filter(isRiauStation);

  stations = [...geoStations, ...awsMapped];
  if (currentModalStation) {
    const updated = stations.find(x => stationKey(x) === stationKey(currentModalStation));
    if (updated) currentModalStation = updated;
  }
  populateDropdowns();
  renderMarkers(fit);
  refreshStatusUI();
  refreshModalTelemetry();
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function loadStationData() {
  try {
    // 1. INSTAN (< 50ms): Ambil data lokal CDN terlebih dahulu secara paralel agar peta langsung tayang
    const [resGeo, resAws] = await Promise.all([
      fetch('data/geofisika_riau.json?t=' + Date.now()).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('data/aws_riau.json?t=' + Date.now()).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    const geoInitial = (resGeo && Array.isArray(resGeo)) ? resGeo : DEFAULT_STATIONS;
    const awsInitial = (resAws && Array.isArray(resAws)) ? resAws : DEFAULT_AWS_STATIONS;

    processAndRenderStations(geoInitial, awsInitial, true);

    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');

    // 2. LATAR BELAKANG: Tarik live SLMON Bali & AWS Center secara independen (tidak saling menjatuhkan)
    refreshLiveTelemetryInBackground({ slmon: true, aws: true });

  } catch (e) {
    console.error('Gagal memuat data stasiun:', e);
    processAndRenderStations(DEFAULT_STATIONS, DEFAULT_AWS_STATIONS, true);
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
}

async function refreshLiveTelemetryInBackground({ slmon = true, aws = true } = {}) {
  if (slmon) syncState.slmon = syncState.slmon === 'live' ? 'live' : 'loading';
  if (aws) syncState.aws = syncState.aws === 'live' ? 'live' : 'loading';
  updateLiveSyncBadge();

  const tasks = [];

  if (slmon) {
    tasks.push(
      fetchJsonWithTimeout('/api/slmon?t=' + Date.now(), 22000)
        .then(data => {
          if (data && Array.isArray(data.stations) && data.stations.length > 0) {
            syncState.slmon = 'live';
            syncState.slmonAt = Date.now();
            processAndRenderStations(data.stations, rawAwsCache, false);
            updateLiveSyncBadge();
          }
        })
        .catch(() => {
          if (syncState.slmon !== 'live') syncState.slmon = 'cache';
          updateLiveSyncBadge();
        })
    );
  }

  if (aws) {
    tasks.push(
      fetchJsonWithTimeout('/api/awscenter?t=' + Date.now(), 45000)
        .then(data => {
          if (data && Array.isArray(data.stations) && data.stations.length > 0) {
            syncState.aws = 'live';
            syncState.awsAt = Date.now();
            syncState.awsErr = '';
            processAndRenderStations(rawGeoCache, data.stations, false);
            updateLiveSyncBadge();
          }
        })
        .catch(err => {
          syncState.awsErr = err?.message || 'Timeout';
          if (syncState.aws !== 'live') syncState.aws = 'cache';
          updateLiveSyncBadge();
        })
    );
  }

  await Promise.allSettled(tasks);
}

function ageMinutes(s) { return Math.max(0, (Date.now() - s.lastSeen) / 60000); }
function catIndex(s) { const a = ageMinutes(s); const idx = STATUS_CATS.findIndex(c => a <= c.max); return idx === -1 ? 4 : idx; }

function slmonBucket(s) {
  const c = (s.slmon_color || '').toLowerCase();
  if (c === 'green') return 'green';
  if (c === 'yellow' || c === 'orange') return 'yellow';
  if (c === 'red' || c === 'black' || c === 'grey') return 'red';
  const ci = catIndex(s);
  return ci === 0 ? 'green' : (ci <= 2 ? 'yellow' : 'red');
}

function getMarkerColor(s) {
  if (s.kategori_bidang === 'Geofisika') {
    const c = (s.slmon_color || '').toLowerCase();
    if (c === 'green') return '#43a047';
    if (c === 'yellow') return '#fdd835';
    if (c === 'orange') return '#ffb74d';
    if (c === 'red') return '#f44336';
    if (c === 'black' || c === 'grey') return '#374151';
  }
  return STATUS_CATS[catIndex(s)].color;
}

function formatAge(s) {
  const m = ageMinutes(s);
  if (m < 1) return `${Math.round(m * 60)} detik lalu`;
  if (m < 60) return `${Math.floor(m)} menit lalu`;
  if (m < 1440) return `${Math.floor(m / 60)} jam lalu`;
  return `${Math.floor(m / 1440)} hari lalu`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// formatBmkgUTC didefinisikan di awal berkas

// Format selisih waktu standar BMKG: 0 Hari 0 Jam 5 Menit (persis screenshot)
function formatBmkgDiff(s) {
  const totalMin = Math.max(0, Math.floor(ageMinutes(s)));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  return `${days} Hari ${hours} Jam ${mins} Menit`;
}

// SIMULASI: stasiun "Online" mengirim paket secara acak. Ganti dengan API telemetri bila tersedia.

// ── Live Refresh Modal Telemetri ───────────────────────────────────────────
function refreshModalTelemetry() {
  if (!currentModalStation) return;
  const s = currentModalStation;
  const modal = document.getElementById('station-detail-modal');
  if (!modal || modal.classList.contains('hidden')) return;

  const isAws = (s.kategori_bidang === 'AWS Center');
  const elLast = document.getElementById('modal-slmon-lastdata');
  const elTanggal = document.getElementById('modal-detail-tanggal');
  const elDiffDay = document.getElementById('modal-detail-diff-day');
  const elDiffHour = document.getElementById('modal-detail-diff-hour');
  const elDiffMin = document.getElementById('modal-detail-diff-minute');

  if (isAws) {
    if (elLast) elLast.textContent = s.tanggal_data || '-';
    if (elTanggal) elTanggal.textContent = s.tanggal_data || '-';
    if (elDiffDay) elDiffDay.textContent = `${s.diff_day || 0} hari`;
    if (elDiffHour) elDiffHour.textContent = `${s.diff_hour || 0} jam`;
    if (elDiffMin) elDiffMin.textContent = `${s.diff_minute || 0} menit`;
  } else {
    const latStr = s.slmon_latency || '5s';
    if (elLast) elLast.textContent = s.slmon_last_data || '-';
    if (elTanggal) elTanggal.textContent = s.slmon_last_data || '-';

    let dDay = 0, dHour = 0, dMin = 0;
    if (latStr.includes('d')) {
      const matchDay = latStr.match(/(\d+)d/);
      const matchHr = latStr.match(/(\d+)h/);
      if (matchDay) dDay = parseInt(matchDay[1]);
      if (matchHr) dHour = parseInt(matchHr[1]);
    } else if (latStr.includes('m')) {
      const matchMin = latStr.match(/(\d+)m/);
      if (matchMin) dMin = parseInt(matchMin[1]);
    }
    if (elDiffDay) elDiffDay.textContent = `${dDay} hari`;
    if (elDiffHour) elDiffHour.textContent = `${dHour} jam`;
    if (elDiffMin) elDiffMin.textContent = `${dMin} menit`;
  }
}

function tickTelemetry() {
  if (!stations.length) return;
  const now = Date.now();
  let anyCatChanged = false;

  stations.forEach(s => {
    const before = catIndex(s);

    if (s.kategori_bidang === 'AWS Center') {
      // Hitung umur nyata dari tanggal_data BMKG (tanpa memalsukan jam!)
      const totalMin = Math.max(0, Math.floor((now - s.lastSeen) / 60000));
      s.diff_day = Math.floor(totalMin / 1440);
      s.diff_hour = Math.floor((totalMin % 1440) / 60);
      s.diff_minute = totalMin % 60;
      s.diff_minutes_total = totalMin;
      s.status = totalMin <= 60 ? 'Online' : (totalMin <= 1440 ? 'Delay' : 'Offline');
    }

    const after = catIndex(s);
    if (after !== before) {
      anyCatChanged = true;
      const m = markerByKode[stationKey(s)];
      if (m) m.setIcon(stationIcon(s));
    }
  });

  if (anyCatChanged && filters.cat >= 0) {
    renderMarkers();
  }

  refreshStatusUI();
  renderStationList();
  refreshModalTelemetry();
}

// ── Marker ─────────────────────────────────────────────────────────────────
function stationIcon(s) {
  const shape = getStationShape(s);
  const cat = catIndex(s);
  const color = getMarkerColor(s);
  const codeDisplay = isStationLabelsActive ? 'block' : 'none';
  return L.divIcon({
    className: '',
    iconSize: [40, 34],
    iconAnchor: [20, 10],
    popupAnchor: [0, -10],
    html: `
      <div class="sta-marker">
        ${cat === 0 ? '<div class="ring"></div>' : ''}
        ${shapeSVG(shape, color, 20, '#ffffff', 2.2)}
        <div class="code" style="display:${codeDisplay}">${s.kode_sta}</div>
      </div>`,
  });
}

function filteredStationsByTypeOnly() {
  return stations.filter(s => {
    if (filters.kota && s.kota_kab !== filters.kota) return false;
    if (filters.tipe && filters.tipe !== 'all') {
      const sTipe = (s.tipe || '').toLowerCase();
      const fTipe = filters.tipe.toLowerCase();
      if (fTipe === 'aaws') {
        if (sTipe !== 'aaws') return false;
      } else if (fTipe === 'aws') {
        if (sTipe !== 'aws') return false;
      } else if (fTipe === 'arg') {
        if (sTipe !== 'arg') return false;
      } else if (fTipe === 'asrs') {
        if (sTipe !== 'asrs') return false;
      } else if (fTipe === 'ikro') {
        if (sTipe !== 'ikro' && sTipe !== 'iklimmikro') return false;
      } else if (fTipe === 'soil') {
        if (sTipe !== 'soil') return false;
      } else if (fTipe === 'ship') {
        if (sTipe !== 'ship') return false;
      } else {
        if (sTipe !== fTipe) return false;
      }
    }
    return true;
  });
}

function filteredStations() {
  return stations.filter(s => {
    if (filters.kota && s.kota_kab !== filters.kota) return false;
    if (filters.tipe && filters.tipe !== 'all') {
      const sTipe = (s.tipe || '').toLowerCase();
      const fTipe = filters.tipe.toLowerCase();
      if (fTipe === 'aaws') {
        if (sTipe !== 'aaws') return false;
      } else if (fTipe === 'aws') {
        if (sTipe !== 'aws') return false;
      } else if (fTipe === 'arg') {
        if (sTipe !== 'arg') return false;
      } else if (fTipe === 'asrs') {
        if (sTipe !== 'asrs') return false;
      } else if (fTipe === 'ikro') {
        if (sTipe !== 'ikro' && sTipe !== 'iklimmikro') return false;
      } else if (fTipe === 'soil') {
        if (sTipe !== 'soil') return false;
      } else if (fTipe === 'ship') {
        if (sTipe !== 'ship') return false;
      } else {
        if (sTipe !== fTipe) return false;
      }
    }
    if (filters.cat >= 0 && catIndex(s) !== filters.cat) return false;
    if (filters.slmonStatus) {
      if (s.kategori_bidang !== 'Geofisika' || slmonBucket(s) !== filters.slmonStatus) return false;
    }
    return true;
  });
}

function renderMarkers(fit = false) {
  clusterGroup.clearLayers();
  plainGroup.clearLayers();
  Object.keys(markerByKode).forEach(k => delete markerByKode[k]);

  const list = filteredStations();
  list.forEach(s => {
    const m = L.marker([s.lat, s.lon], { icon: stationIcon(s), riseOnHover: true });
    const srcLabel = s.kategori_bidang === 'AWS Center'
      ? `<span style="color:#0284c7;font-weight:600">AWS Center: ${s.tipe}</span>`
      : `<span style="color:#d97706;font-weight:600">SLMON Bali: ${s.tipe}</span>`;
    m.bindTooltip(() => `<b>${s.kode_sta}</b> - ${s.nama_sta}<br>${srcLabel}<br><span style="color:#6b7280">Data terakhir: ${formatAge(s)}</span>`,
      { direction: 'top', offset: [0, -8] });
    m.bindPopup(() => popupHTML(s), { minWidth: 295, maxWidth: 350 });
    (useClustering ? clusterGroup : plainGroup).addLayer(m);
    markerByKode[stationKey(s)] = m;
  });

  if (useClustering) { map.addLayer(clusterGroup); map.removeLayer(plainGroup); }
  else { map.addLayer(plainGroup); map.removeLayer(clusterGroup); }

  if (fit) {
    if (filters.kota && list.length) map.fitBounds(L.latLngBounds(list.map(s => [s.lat, s.lon])), { padding: [80, 80], maxZoom: 11 });
    else map.setView(RIAU_CENTER, RIAU_ZOOM);
  }
  renderStationList();
}

// ── Kode Kanal Seismik berdasarkan Tipe Alat ──────────────────────────────
function getChannelCode(tipe) {
  if (tipe === 'Broadband Seismograph') return 'BHZ';
  if (tipe === 'Short Period Seismograph') return 'SHZ';
  if (tipe === 'Accelerograph') return 'HNZ';
  return 'BHZ';
}

// ── Popup Ringkas (Standar BMKG: Site, Lat/Lon + Quick Actions) ─────────────
function popupHTML(s) {
  if (!isRiauStation(s)) return '';
  const siteName = s.site_id || `${s.kode_sta}-${s.nama_sta}`;
  const latStr = Number(s.lat).toFixed(8);
  const lonStr = Number(s.lon).toFixed(8);
  const cat = catIndex(s);
  const catObj = STATUS_CATS[cat] || STATUS_CATS[0];

  return `
    <div class="bmkg-popup" style="padding: 12px 14px 10px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; min-width: 275px; max-width: 325px;">
      
      <!-- Header stasiun -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
        <div>
          <span style="font-weight: 800; font-size: 14px; color: #0f172a; font-family: monospace;">${s.kode_sta}</span>
          <span style="font-size: 11px; color: #64748b; margin-left: 4px;">${s.kota_kab}</span>
        </div>
        <span class="bmkg-popup-tag" style="background: ${s.status === 'Online' ? '#ecfdf5' : (s.status === 'Delay' ? '#fffbeb' : '#fef2f2')}; color: ${s.status === 'Online' ? '#059669' : (s.status === 'Delay' ? '#d97706' : '#dc2626')}; border: 1px solid ${s.status === 'Online' ? '#a7f3d0' : (s.status === 'Delay' ? '#fde68a' : '#fecaca')};">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${s.status === 'Online' ? '#10b981' : (s.status === 'Delay' ? '#f59e0b' : '#ef4444')}; margin-right:3px;"></span>
          ${s.status} ${s.slmon_latency ? `(${s.slmon_latency})` : `(${formatAge(s)})`}
        </span>
      </div>

      <!-- Data fields: Hanya menampilkan Site dan Lat/Lon -->
      <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: #334155; margin-bottom: 6px;">
        <div><strong style="color: #0f172a;">Name Station :</strong> ${siteName}</div>
        <div><strong style="color: #0f172a;">Update (${s.kategori_bidang === 'AWS Center' ? 'UTC' : 'WIB'}) :</strong> <span style="font-family:monospace;font-size:11px;">${s.kategori_bidang === 'AWS Center' ? (s.tanggal_data || '-') : (s.slmon_last_data || '-')}</span></div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div><strong style="color: #0f172a;">Lat/Lon :</strong> ${latStr}, ${lonStr}</div>
          <button onclick="copyCoords(${s.lat}, ${s.lon}, this)" title="Salin koordinat" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-size: 10px; color: #0284c7; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;">
            <i class="fa fa-copy"></i> Salin
          </button>
        </div>
      </div>

      <!-- Action buttons -->
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f5f9; display: grid; grid-template-columns: 1fr 1fr 1.35fr; gap: 5px;">
        <button onclick="map.flyTo([${s.lat}, ${s.lon}], 14)" style="padding: 5px 6px; background: #f59e0b; color: #ffffff; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <i class="fa fa-search-plus"></i> Zoom
        </button>
        <a href="https://www.google.com/maps?q=${s.lat},${s.lon}" target="_blank" rel="noopener" style="text-align: center; padding: 5px 6px; background: #ffffff; color: #475569; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; font-weight: 600; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <i class="fa fa-route" style="color: #f59e0b;"></i> Maps
        </a>
        <button onclick="openStationModal('${s.kode_sta}', '${s.kategori_bidang}')" style="padding: 5px 6px; background: #0284c7; color: #ffffff; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <i class="fa fa-chart-line"></i> Detail Lengkap
        </button>
      </div>

    </div>`;
}

// ── Modal Detail Stasiun Komprehensif ──────────────────────────────────────
function openStationModal(kode, bidang) {
  const s = stations.find(x => (x.kode_sta === kode || x.alias === kode) && (!bidang || x.kategori_bidang === bidang))
         || stations.find(x => x.kode_sta === kode || x.alias === kode);
  if (!s || !isRiauStation(s)) {
    closeStationModal();
    return;
  }
  currentModalStation = s;

  const modal = document.getElementById('station-detail-modal');
  if (!modal) return;

  const isAws = (s.kategori_bidang === 'AWS Center');

  // Header info: ID Station & Nama
  document.getElementById('modal-station-code').textContent = s.kode_sta;
  document.getElementById('modal-station-name').textContent = s.nama_sta;
  document.getElementById('modal-station-type').textContent = s.tipe;
  
  // Indikator Status Online / Offline (strictly real time SLMON Bali)
  const statusEl = document.getElementById('modal-station-status');
  const isOnline = (s.status === 'Online');
  const isOffline = (s.status === 'Offline');

  if (isOnline) {
    statusEl.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
    statusEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online';
  } else if (isOffline) {
    statusEl.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500/20 text-red-300 border border-red-400/30';
    statusEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> Offline';
  } else {
    statusEl.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30';
    statusEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Delay';
  }

  // Card 1: Lokasi & Geografis (ID Station & Site ID mengikuti name station di excel)
  const elId = document.getElementById('modal-info-id');
  if (elId) elId.textContent = s.kode_sta;
  const elSite = document.getElementById('modal-info-site');
  if (elSite) elSite.textContent = s.site_id || s.nama_sta;
  document.getElementById('modal-info-kab').textContent = `${s.kota_kab}, ${s.provinsi || 'Riau'}`;
  document.getElementById('modal-info-coords').textContent = `${Number(s.lat).toFixed(6)}, ${Number(s.lon).toFixed(6)}`;

  // Sub-seksi Telemetri: Last Data dengan indikator putih statis
  const elTitle = document.getElementById('modal-telemetry-title');
  const elBadge = document.getElementById('modal-telemetry-badge');
  const elLast = document.getElementById('modal-slmon-lastdata');
  const elUpt = document.getElementById('modal-slmon-upt');

  const badgeCls = isOnline ? 'bg-emerald-100 text-emerald-700' : (isOffline ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700');
  const badgeTxt = isOnline ? 'Real-time' : (isOffline ? 'Offline' : 'Delay');
  const staticWhiteDot = '<span class="inline-block w-2.5 h-2.5 rounded-full bg-white border border-slate-400 shrink-0 mr-1"></span>';

  if (isAws) {
    if (elTitle) elTitle.innerHTML = `${staticWhiteDot} Telemetri AWS Center`;
    if (elBadge) {
      elBadge.className = `px-2 py-0.5 rounded text-[9px] font-bold ${badgeCls}`;
      elBadge.textContent = badgeTxt;
    }
    if (elLast) elLast.textContent = s.tanggal_data || '-';
    if (elUpt) elUpt.textContent = s.kota_kab || 'Provinsi Riau';
  } else {
    // Geofisika: Telemetri SLMON Bali
    if (elTitle) elTitle.innerHTML = `${staticWhiteDot} Telemetri SLMON Bali`;
    if (elBadge) {
      elBadge.className = `px-2 py-0.5 rounded text-[9px] font-bold ${badgeCls}`;
      elBadge.textContent = badgeTxt;
    }
    if (elLast) elLast.textContent = s.slmon_last_data || '-';
    if (elUpt) elUpt.textContent = s.slmon_upt || 'Stageof-Padang-Panjang';
  }

  // Card 2: Detail Alat (Tipe Alat, Tanggal Update, Diff Day, Diff Hour, Diff Minute)
  const elTipe = document.getElementById('modal-detail-tipe');
  const elTanggal = document.getElementById('modal-detail-tanggal');
  const elDiffDay = document.getElementById('modal-detail-diff-day');
  const elDiffHour = document.getElementById('modal-detail-diff-hour');
  const elDiffMin = document.getElementById('modal-detail-diff-minute');

  if (isAws) {
    if (elTipe) elTipe.textContent = `${s.tipe} (AWS Center BMKG)`;
    if (elTanggal) elTanggal.textContent = s.tanggal_data || '-';
    if (elDiffDay) elDiffDay.textContent = `${s.diff_day || 0} hari`;
    if (elDiffHour) elDiffHour.textContent = `${s.diff_hour || 0} jam`;
    if (elDiffMin) elDiffMin.textContent = `${s.diff_minute || 0} menit`;
  } else {
    // Geofisika (SLMON Bali)
    if (elTipe) elTipe.textContent = `${s.tipe} (Geofisika BMKG)`;
    if (elTanggal) elTanggal.textContent = s.slmon_last_data || '-';

    let dDay = 0, dHour = 0, dMin = 0;
    const lat = s.slmon_latency || '5s';
    if (lat.includes('d')) {
      const matchDay = lat.match(/(\d+)d/);
      const matchHr = lat.match(/(\d+)h/);
      if (matchDay) dDay = parseInt(matchDay[1]);
      if (matchHr) dHour = parseInt(matchHr[1]);
    } else if (lat.includes('m')) {
      const matchMin = lat.match(/(\d+)m/);
      if (matchMin) dMin = parseInt(matchMin[1]);
    }

    if (elDiffDay) elDiffDay.textContent = `${dDay} hari`;
    if (elDiffHour) elDiffHour.textContent = `${dHour} jam`;
    if (elDiffMin) elDiffMin.textContent = lat.includes('s') ? `${lat} (0 menit)` : `${dMin} menit`;
  }

  // Google Maps link
  const mapsBtn = document.getElementById('modal-btn-maps');
  if (mapsBtn) mapsBtn.href = `https://www.google.com/maps?q=${s.lat},${s.lon}`;

  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeStationModal() {
  const modal = document.getElementById('station-detail-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  currentModalStation = null;
}

function handleModalBackdropClick(e) {
  if (e.target.id === 'station-detail-modal') {
    closeStationModal();
  }
}

// ── Utilitas Quick Actions (Copy & Toast) ───────────────────────────────────
function copyCoords(lat, lon, btn) {
  const text = `${Number(lat).toFixed(8)}, ${Number(lon).toFixed(8)}`;
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa fa-check" style="color: #10b981;"></i> Disalin!';
    showToast(`Koordinat ${text} disalin ke clipboard!`, 'success');
    setTimeout(() => {
      btn.innerHTML = original;
    }, 2000);
  }).catch(() => {
    prompt('Salin koordinat berikut:', text);
  });
}

function copyModalCoords(btn) {
  if (!currentModalStation) return;
  copyCoords(currentModalStation.lat, currentModalStation.lon, btn);
}

function copyModalStationJSON() {
  if (!currentModalStation) return;
  const jsonStr = JSON.stringify(currentModalStation, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    showToast(`Metadata stasiun ${currentModalStation.kode_sta} disalin dalam format JSON!`, 'success');
  }).catch(() => {
    prompt('Salin JSON:', jsonStr);
  });
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-slate-900 border-emerald-500/50 text-white' : 'bg-slate-900 border-blue-500/50 text-white';
  const icon = type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-circle-info text-blue-400';
  toast.className = `${bg} px-4 py-2.5 rounded-lg shadow-xl border text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all duration-300 transform translate-y-2 opacity-0`;
  toast.innerHTML = `<i class="fa ${icon}"></i> <span>${msg}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// ── Legend 5 tingkat + donut ───────────────────────────────────────────────
function refreshStatusUI() {
  const counts = STATUS_CATS.map(() => 0);
  const typeFiltered = filteredStationsByTypeOnly();
  typeFiltered.forEach(s => counts[catIndex(s)]++);
  const total = typeFiltered.length;

  document.getElementById('legend-list').innerHTML = STATUS_CATS.map((c, i) => `
    <li class="flex items-center gap-2 cursor-pointer px-1 rounded ${filters.cat === i ? 'bg-amber-100 font-bold' : 'hover:bg-gray-100'}"
        onclick="filterByCat(${i})" title="Klik untuk filter">
      <span class="w-3 h-3 rounded-full inline-block" style="background:${c.color}"></span>
      <span class="flex-1">${c.label}</span>
      <span class="font-bold w-5 text-right">${counts[i]}</span>
    </li>`).join('');

  // Update SLMON Bali counts (khusus Geofisika agar tidak tercampur AWS!)
  const geoList = typeFiltered.filter(s => s.kategori_bidang === 'Geofisika');
  const cntGreen = geoList.filter(s => slmonBucket(s) === 'green').length;
  const cntYellow = geoList.filter(s => slmonBucket(s) === 'yellow').length;
  const cntRed = geoList.filter(s => slmonBucket(s) === 'red').length;

  const C = 2 * Math.PI * 14;
  let offset = 0;
  let svg = `<circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" stroke-width="7"/>`;
  const slmonDonut = [
    { n: cntGreen, color: '#10b981' },
    { n: cntYellow, color: '#f59e0b' },
    { n: cntRed, color: '#ef4444' },
  ];
  if (geoList.length > 0) {
    slmonDonut.forEach(item => {
      if (!item.n) return;
      const len = (item.n / geoList.length) * C;
      svg += `<circle cx="18" cy="18" r="14" fill="none" stroke="${item.color}" stroke-width="7"
        stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}"/>`;
      offset += len;
    });
  }
  document.getElementById('donut-svg').innerHTML = svg;
  document.getElementById('donut-total').textContent = geoList.length;

  const elG = document.getElementById('slmon-cnt-green');
  const elY = document.getElementById('slmon-cnt-yellow');
  const elR = document.getElementById('slmon-cnt-red');
  if (elG) elG.textContent = cntGreen;
  if (elY) elY.textContent = cntYellow;
  if (elR) elR.textContent = cntRed;

  ['green', 'yellow', 'red'].forEach(k => {
    const li = document.getElementById(`slmon-leg-${k}`);
    if (li) li.classList.toggle('bg-amber-100', filters.slmonStatus === k);
  });

  const elCol = document.getElementById('slmon-cnt-col');
  if (elCol) elCol.textContent = geoList.filter(s => s.tipe === 'Accelerograph Colocated').length;

  renderStationList();
}

function filterByCat(i) {
  filters.slmonStatus = '';
  filters.cat = filters.cat === i ? -1 : i;
  renderMarkers();
  refreshStatusUI();
}

function filterBySlmonStatus(bucket) {
  filters.cat = -1;
  filters.slmonStatus = filters.slmonStatus === bucket ? '' : bucket;
  renderMarkers();
  refreshStatusUI();
}

// ── Tombol tipe alat BMKG (Persis awscenter.bmkg.go.id) ───────────────────
// Mapping ikon tipe alat BMKG:
// AWS, ARG, AAWS, ASRS, IKRO, SOIL -> AWS Center BMKG
// Accelerograph Colocated          -> SLMON InaTEWS / Bali (10 stasiun)
// ASRS, IKRO, SHIP, SOIL = Tipe cuaca (0 stasiun di geofisika Riau)
const BMKG_ICONS = [
  { id: 'all',  name: 'ALL',  field: 'all',  shape: 'square',   actived: 'assets/icon/all_actived.png',  inactive: 'assets/icon/all.png' },
  { id: 'aws',  name: 'AWS',  field: 'aws',  shape: 'circle',   actived: 'assets/icon/aws_actived.png',  inactive: 'assets/icon/aws.png' },
  { id: 'arg',  name: 'ARG',  field: 'arg',  shape: 'triangle', actived: 'assets/icon/arg_actived.png',  inactive: 'assets/icon/arg.png' },
  { id: 'aaws', name: 'AAWS', field: 'aaws', shape: 'diamond',  actived: 'assets/icon/aaws_actived.png', inactive: 'assets/icon/aaws.png' },
  { id: 'asrs', name: 'ASRS', field: 'asrs', shape: 'star',     actived: 'assets/icon/asrs_actived.png', inactive: 'assets/icon/asrs.png' },
  { id: 'ikro', name: 'IKRO', field: 'ikro', shape: 'hexagon',  actived: 'assets/icon/ikro_actived.png', inactive: 'assets/icon/ikro.png' },
  { id: 'ship', name: 'SHIP', field: 'ship', shape: 'octagon',  actived: 'assets/icon/ship_actived.png', inactive: 'assets/icon/ship.png' },
  { id: 'soil', name: 'SOIL', field: 'soil', shape: 'rect',     actived: 'assets/icon/soil_actived.png', inactive: 'assets/icon/soil.png' },
];

function selectBmkgIcon(id) {
  const item = BMKG_ICONS.find(x => x.id === id);
  if (!item) return;

  // Toggle: jika tombol yang sama diklik lagi saat sudah aktif (selain 'all'), kembalikan ke 'all'
  if (id !== 'all' && filters.tipe === item.field) {
    return selectBmkgIcon('all');
  }

  if (id === 'all') {
    BMKG_ICONS.forEach(ico => {
      const el = document.getElementById(`icon-${ico.id}`);
      if (el) el.src = ico.actived;
    });
    filters.tipe = 'all';
    const selTipe = document.getElementById('select-tipe');
    if (selTipe) selTipe.value = '';
  } else {
    BMKG_ICONS.forEach(ico => {
      const el = document.getElementById(`icon-${ico.id}`);
      if (el) el.src = (ico.id === id) ? ico.actived : ico.inactive;
    });
    filters.tipe = item.field;
    const selTipe = document.getElementById('select-tipe');
    if (selTipe) {
      const opt = Array.from(selTipe.options).find(o => o.value.toLowerCase() === item.field.toLowerCase());
      selTipe.value = opt ? opt.value : '';
    }
  }

  renderMarkers();
  refreshStatusUI();
}

function syncBmkgIconsFromDropdown(tipeValue) {
  if (!tipeValue || tipeValue === 'all') {
    BMKG_ICONS.forEach(ico => {
      const el = document.getElementById(`icon-${ico.id}`);
      if (el) el.src = ico.actived;
    });
    filters.tipe = 'all';
  } else {
    let targetIconId = null;
    const tv = tipeValue.toLowerCase();
    if (tv === 'aws') targetIconId = 'aws';
    else if (tv === 'arg') targetIconId = 'arg';
    else if (tv === 'aaws' || tv === 'accelerograph colocated') targetIconId = 'aaws';
    else if (tv === 'asrs') targetIconId = 'asrs';
    else if (tv === 'ikro') targetIconId = 'ikro';
    else if (tv === 'soil') targetIconId = 'soil';
    else if (tv === 'ship') targetIconId = 'ship';

    BMKG_ICONS.forEach(ico => {
      const el = document.getElementById(`icon-${ico.id}`);
      if (el) el.src = (targetIconId && ico.id === targetIconId) ? ico.actived : ico.inactive;
    });
    filters.tipe = tipeValue;
  }
  renderMarkers();
  refreshStatusUI();
}

// ── Dropdown & events ──────────────────────────────────────────────────────
function populateDropdowns() {
  const kota = document.getElementById('select-kota');
  const tipe = document.getElementById('select-tipe');
  if (!kota || !tipe) return;

  const uniqueKota = [...new Set(stations.map(s => s.kota_kab))].filter(Boolean).sort();
  kota.innerHTML = '<option value="">Semua Kabupaten / Kota</option>' +
    uniqueKota.map(k => `<option value="${k}">${k}</option>`).join('');

  // Hitung jumlah stasiun per kategori
  const cntARG = stations.filter(s => s.tipe === 'ARG').length;
  const cntAWS = stations.filter(s => s.tipe === 'AWS').length;
  const cntAAWS = stations.filter(s => s.tipe === 'AAWS').length;
  const cntASRS = stations.filter(s => s.tipe === 'ASRS').length;
  const cntIKRO = stations.filter(s => s.tipe === 'IKRO').length;
  const cntSOIL = stations.filter(s => s.tipe === 'SOIL').length;
  const cntCOL = stations.filter(s => s.tipe === 'Accelerograph Colocated').length;

  const typeOptions = [
    { value: '', label: `Semua Peralatan BMKG (${stations.length} Stasiun)` },
    { value: 'opt_group_aws', label: '── Peralatan Cuaca & Iklim (AWS Center) ──', disabled: true },
    { value: 'ARG', label: `ARG - Automatic Rain Gauge (${cntARG})` },
    { value: 'AWS', label: `AWS - Automatic Weather Station (${cntAWS})` },
    { value: 'AAWS', label: `AAWS - Agro-climate AWS (${cntAAWS})` },
    { value: 'ASRS', label: `ASRS - Solar Radiation Station (${cntASRS})` },
    { value: 'IKRO', label: `IKRO - Stasiun Iklim Mikro (${cntIKRO})` },
    { value: 'SOIL', label: `SOIL - Soil Moisture Station (${cntSOIL})` },
    { value: 'opt_group_geo', label: '── Peralatan Geofisika (SLMON Live) ──', disabled: true },
    { value: 'Accelerograph Colocated', label: `Accelerograph Colocated (${cntCOL})` },
  ];

  tipe.innerHTML = typeOptions.map(t => 
    t.disabled ? `<optgroup label="${t.label}"></optgroup>` : `<option value="${t.value}">${t.label}</option>`
  ).join('');

  kota.value = filters.kota;
  tipe.value = filters.tipe === 'all' ? '' : filters.tipe;
}

function setupEvents() {
  document.getElementById('select-kota')?.addEventListener('change', e => { filters.kota = e.target.value; renderMarkers(true); });
  document.getElementById('select-tipe')?.addEventListener('change', e => { syncBmkgIconsFromDropdown(e.target.value); });
  document.getElementById('checkbox-cluster')?.addEventListener('change', e => { useClustering = e.target.checked; renderMarkers(); });
  document.getElementById('station-search')?.addEventListener('input', renderStationList);

  BMKG_ICONS.forEach(ico => {
    const el = document.getElementById(`icon-${ico.id}`);
    if (el) {
      el.addEventListener('click', () => selectBmkgIcon(ico.id));
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeStationModal();
  });
}

// ── Panel daftar stasiun ───────────────────────────────────────────────────
function renderStationList() {
  const ul = document.getElementById('station-list');
  if (!ul) return;
  const prevScrollTop = ul.scrollTop;
  const q = (document.getElementById('station-search')?.value || '').trim().toLowerCase();
  const list = filteredStations().filter(s =>
    !q || `${s.kode_sta} ${s.site_id || ''} ${s.nama_sta} ${s.kota_kab} ${s.provinsi || ''}`.toLowerCase().includes(q));

  const countEl = document.getElementById('station-count');
  if (countEl) countEl.textContent = list.length;
  ul.innerHTML = list.map(s => {
    const colHex = getMarkerColor(s);
    const cfg = TYPE_CONFIG[s.tipe] || TYPE_CONFIG['Accelerograph Colocated'];
    const stBadge = s.status === 'Online'
      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
      : (s.status === 'Delay' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-600 border-red-200');
    const stDot = s.status === 'Online' ? 'bg-emerald-500' : (s.status === 'Delay' ? 'bg-amber-500' : 'bg-red-500');
    return `
      <li class="flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 hover:bg-amber-50 cursor-pointer group" onclick="focusStation('${s.kode_sta}', '${s.kategori_bidang}')">
        ${shapeSVG(getStationShape(s), colHex, 14, '#fff', 2)}
        <div class="flex-1 min-w-0">
          <div class="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
            <span>${s.kode_sta}</span>
            <span class="font-normal text-gray-400">&bull; ${cfg.short}</span>
            <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-bold border ${stBadge}">
              <span class="w-1 h-1 rounded-full ${stDot} mr-1"></span>${s.status}
            </span>
          </div>
          <div class="text-[10px] text-gray-500 truncate">${s.nama_sta} &bull; ${s.kota_kab}</div>
        </div>
        <span class="text-[9px] ${s.status === 'Online' ? 'text-gray-400' : (s.status === 'Delay' ? 'text-amber-600 font-semibold' : 'text-red-500 font-semibold')} whitespace-nowrap">${s.slmon_latency ? s.slmon_latency : formatAge(s)}</span>
        <button onclick="event.stopPropagation(); openStationModal('${s.kode_sta}', '${s.kategori_bidang}')" class="text-gray-300 group-hover:text-blue-600 hover:text-blue-800 p-0.5 ml-0.5 transition" title="Lihat detail lengkap ${s.kode_sta}">
          <i class="fa fa-circle-info text-[11px]"></i>
        </button>
      </li>`;
  }).join('') || '<li class="text-center text-[11px] text-gray-400 py-3">Tidak ada stasiun</li>';

  // Pertahankan posisi scroll agar tidak melompat setiap 5 detik saat tickTelemetry berjalan
  ul.scrollTop = prevScrollTop;
}

function findMarkerByCode(kode, bidang) {
  if (bidang) {
    const exact = markerByKode[`${bidang === 'AWS Center' ? 'AWS' : 'GEO'}:${kode}`];
    if (exact) return exact;
  }
  return markerByKode[`GEO:${kode}`] || markerByKode[`AWS:${kode}`];
}

function focusStation(kode, bidang) {
  let m = findMarkerByCode(kode, bidang);
  // Jika stasiun tidak ditemukan karena sedang difilter (kota/tipe/kategori), reset filter agar marker muncul
  if (!m) {
    filters.kota = '';
    filters.tipe = 'all';
    filters.cat = -1;
    filters.slmonStatus = '';
    const selKota = document.getElementById('select-kota');
    if (selKota) selKota.value = '';
    syncBmkgIconsFromDropdown('all');
    renderMarkers();
    m = findMarkerByCode(kode, bidang);
  }
  if (!m) return;

  if (useClustering) {
    clusterGroup.zoomToShowLayer(m, () => m.openPopup());
  } else {
    map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 11), { duration: 0.6 });
    map.once('moveend', () => m.openPopup());
    setTimeout(() => { if (!m.isPopupOpen()) m.openPopup(); }, 700);
  }
}

function toggleStationPanel() {
  const body = document.getElementById('station-panel-body');
  const ch = document.getElementById('station-panel-chevron');
  body.classList.toggle('hidden');
  ch.classList.toggle('fa-chevron-up');
  ch.classList.toggle('fa-chevron-down');
}

// ── Utilitas ───────────────────────────────────────────────────────────────
function exportCSV() {
  const cols = ['kode_sta', 'nama_sta', 'tipe', 'lat', 'lon', 'kota_kab', 'provinsi', 'digitizer', 'sensor', 'status', 'tanggal_instalasi'];
  const rows = [cols.concat(['kategori_data', 'data_terakhir']).join(',')];
  // Ekspor stasiun sesuai filter yang sedang aktif, atau semua stasiun jika tanpa filter
  const list = filteredStations();
  list.forEach(s => rows.push(cols.map(c => `"${String(s[c] || '').replace(/"/g, '""')}"`)
    .concat([`"${STATUS_CATS[catIndex(s)].label}"`, `"${new Date(s.lastSeen).toLocaleString('id-ID')}"`]).join(',')));
  const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `stasiun_geofisika_riau_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function filterByTipeExact(tipeName) {
  if (filters.tipe === tipeName) {
    filters.tipe = 'all';
  } else {
    filters.tipe = tipeName;
  }
  const selTipe = document.getElementById('select-tipe');
  if (selTipe) selTipe.value = filters.tipe === 'all' ? '' : filters.tipe;
  renderMarkers();
  refreshStatusUI();
}
