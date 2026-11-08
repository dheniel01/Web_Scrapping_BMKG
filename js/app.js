
// ── Helper Real-Time Formatting ─────────────────────────────────────────────
function formatDateTimeID(date) {
  const d = date || new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatBmkgUTC(date) {
  const d = date || new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00`;
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
 * Sumber data:
 *  - LIVE  : API publik InaTEWS BMKG (autogempa, gempaterkini, gempadirasakan)
 *  - LOKAL : data/geofisika_riau.json (metadata 13 stasiun)
 *  - SIMULASI: waktu data terakhir / latency stasiun (belum terhubung ke server
 *              telemetri BMKG). Ganti fungsi tickTelemetry() bila API tersedia.
 */

// ── Konfigurasi ────────────────────────────────────────────────────────────
const BMKG_API = {
  latest: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',
  m5: 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json',
  felt: 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json',
};
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
    "kode_sta": "BRSN",
    "site_id": "BPBD Prov. Riau",
    "nama_sta": "BPBD Prov. Riau",
    "tipe": "Accelerograph 2020",
    "lat": 0.51,
    "lon": 101.45,
    "kota_kab": "Kota Pekanbaru",
    "provinsi": "Riau",
    "digitizer": "Centaur",
    "sensor": "Titan",
    "status": "Online",
    "tanggal_instalasi": "2020",
    "slmon_color": "green",
    "slmon_upt": "Stageof-Padang-Panjang",
    "slmon_latency": "3s",
    "slmon_last_data": "29/10/2026 03:55"
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
    "kode_sta": "STA6024",
    "site_id": "ASRS Stasiun Klimatologi Riau",
    "nama_sta": "ASRS Stasiun Klimatologi Riau",
    "tipe": "Accelerograph 2020",
    "lat": 0.40751419,
    "lon": 101.21727325,
    "kota_kab": "Kab. Kampar",
    "provinsi": "Riau",
    "digitizer": "Centaur",
    "sensor": "Titan",
    "status": "Online",
    "tanggal_instalasi": "2020",
    "slmon_color": "green",
    "slmon_upt": "Stageof-Padang-Panjang",
    "slmon_latency": "8s",
    "slmon_last_data": "29/10/2026 04:10",
    "alias": "KRSN"
  },
  {
    "kode_sta": "PATU",
    "site_id": "Stasiun Meteorologi Klas IV Maritim Teluk Bayur",
    "nama_sta": "Stasiun Meteorologi Klas IV Maritim Teluk Bayur",
    "tipe": "Accelerograph Non Colocated",
    "lat": -1.0,
    "lon": 100.37,
    "kota_kab": "Kab. Rokan Hulu",
    "provinsi": "Riau",
    "digitizer": "Centaur",
    "sensor": "TSA-100",
    "status": "Online",
    "tanggal_instalasi": "2009",
    "slmon_color": "green",
    "slmon_upt": "Stageof-Padang-Panjang",
    "slmon_latency": "6s",
    "slmon_last_data": "29/10/2026 03:55"
  },
  {
    "kode_sta": "PESI",
    "site_id": "Stasiun Meteorologi Klas II Simpang Tiga Pekanbaru",
    "nama_sta": "Stasiun Meteorologi Klas II Simpang Tiga Pekanbaru",
    "tipe": "Accelerograph Non Colocated",
    "lat": 0.46,
    "lon": 101.45,
    "kota_kab": "Kota Pekanbaru",
    "provinsi": "Riau",
    "digitizer": "CENTAUR",
    "sensor": "Titan",
    "status": "Online",
    "tanggal_instalasi": "2010",
    "slmon_color": "green",
    "slmon_upt": "Stageof-Padang-Panjang",
    "slmon_latency": "4s",
    "slmon_last_data": "29/10/2026 03:55"
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
  // Geofisika (Akselerograf)
  'Accelerograph Colocated': { short: 'COL', shape: 'diamond', icon: 'fa-wave-square', title: 'Accelerograph Colocated' },
  'Accelerograph 2020': { short: '2020', shape: 'circle', icon: 'fa-circle-dot', title: 'Accelerograph 2020' },
  'Accelerograph Non Colocated': { short: 'NON', shape: 'triangle', icon: 'fa-triangle-exclamation', title: 'Accelerograph Non Colocated' },
  // AWS Center BMKG
  'AWS': { short: 'AWS', shape: 'circle', icon: 'fa-cloud-sun', title: 'Automatic Weather Station (AWS)' },
  'ARG': { short: 'ARG', shape: 'triangle', icon: 'fa-cloud-rain', title: 'Automatic Rain Gauge (ARG)' },
  'AAWS': { short: 'AAWS', shape: 'diamond', icon: 'fa-seedling', title: 'Agro-climate AWS (AAWS)' },
  'ASRS': { short: 'ASRS', shape: 'star', icon: 'fa-sun', title: 'Solar Radiation Station (ASRS)' },
  'IKRO': { short: 'IKRO', shape: 'hexagon', icon: 'fa-temperature-high', title: 'Stasiun Iklim Mikro (IKRO)' },
  'SOIL': { short: 'SOIL', shape: 'rect', icon: 'fa-layer-group', title: 'Soil Moisture Station (SOIL)' },
  'SHIP': { short: 'SHIP', shape: 'octagon', icon: 'fa-ship', title: 'AWS Kapal (SHIP)' },
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
let isMaskActive = true, isLabelsActive = true, isStationLabelsActive = true;
let filters = { kota: '', tipe: 'all', cat: -1 };
let eqCache = { latest: null, m5: null, felt: null };
let eqTab = 'latest';
let earthquakeMarker = null;
let earthquakeLine = null;
let currentModalStation = null;

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initClock();
  loadRiauBoundary();
  const maskBtn = document.getElementById('btn-toggle-mask');
  const maskText = document.getElementById('mask-status-text');
  if (maskBtn) maskBtn.classList.add('bg-blue-100', 'border-blue-400');
  if (maskText) maskText.textContent = 'Fokus: Hanya Riau';
  loadStationData();
  loadEarthquakes();
  setupEvents();

  setInterval(tickTelemetry, 5000);     // simulasi heartbeat stasiun
  setInterval(loadEarthquakes, 180000); // refresh gempa tiap 3 menit
});

// ── Helper bentuk SVG ──────────────────────────────────────────────────────
function shapeSVG(shape, fill, size, stroke = '#ffffff', sw = 2) {
  const shapes = {
    square: `<rect x="2" y="2" width="20" height="20" rx="3"/>`,
    circle: `<circle cx="12" cy="12" r="10"/>`,
    triangle: `<polygon points="12,1.5 23,21.5 1,21.5" stroke-linejoin="round"/>`,
    diamond: `<polygon points="12,1 23,12 12,23 1,12" stroke-linejoin="round"/>`,
    star: `<polygon points="12,1.5 14.8,8.2 22,8.8 16.5,13.6 18.2,20.7 12,17 5.8,20.7 7.5,13.6 2,8.8 9.2,8.2" stroke-linejoin="round"/>`,
    hexagon: `<polygon points="12,2 21,7.2 21,17.8 12,23 3,17.8 3,7.2" stroke-linejoin="round"/>`,
    octagon: `<polygon points="7.5,2 16.5,2 22,7.5 22,16.5 16.5,22 7.5,22 2,16.5 2,7.5" stroke-linejoin="round"/>`,
    rect: `<rect x="2" y="6" width="20" height="12" rx="2"/>`,
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${sw}">${shapes[shape] || shapes.circle}</svg>`;
}

// ── Peta ───────────────────────────────────────────────────────────────────
function initMap() {
  map = L.map('map', {
    center: RIAU_CENTER, zoom: RIAU_ZOOM, zoomControl: false,
    minZoom: 4, maxZoom: 18,
  });
  if (isMaskActive) {
    map.setMaxBounds(RIAU_BOUNDS);
  }

  // Base map gaya OpenStreetMap standar (persis seperti awscenter.bmkg.go.id, bebas blokir 403)
  const osmClassic = L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors | BMKG',
  }).addTo(map);

  const osmHot = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap Humanitarian | BMKG',
  });

  const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd', attribution: '&copy; CARTO &copy; OpenStreetMap',
  });

  const esriStreet = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Tiles &copy; Esri | BMKG Geofisika',
  });

  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18, attribution: 'Tiles &copy; Esri Satelit',
  });

  L.control.layers({
    '🗺️ Peta Standar (OSM)': osmClassic,
    '🌐 Peta OSM (HOT)': osmHot,
    '🧭 Peta Voyager': cartoVoyager,
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
      btn('<i class="fa fa-sync-alt"></i>', 'Muat ulang data', () => { loadStationData(); loadEarthquakes(); });
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

  // Event saat popup peta ditutup
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
      fillOpacity: 0.45,
      fillRule: 'evenodd',
      interactive: false,
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
    // Mode Fokus: Hanya Riau -> Aktifkan masking, kunci batas, dan pusatkan animasi peta langsung ke Riau
    if (riauMaskLayer && !map.hasLayer(riauMaskLayer)) {
      map.addLayer(riauMaskLayer);
    }
    map.setMaxBounds(RIAU_BOUNDS);
    map.flyTo(RIAU_CENTER, RIAU_ZOOM, { duration: 0.8 });
    if (textEl) textEl.textContent = 'Fokus: Peta Penuh';
    if (btn) btn.classList.add('bg-blue-100', 'border-blue-400');
  } else {
    // Mode Peta Penuh -> Lepas masking & maxBounds agar bisa navigasi bebas ke seluruh Indonesia
    if (riauMaskLayer && map.hasLayer(riauMaskLayer)) {
      map.removeLayer(riauMaskLayer);
    }
    map.setMaxBounds(null);
    if (textEl) textEl.textContent = 'Fokus: Hanya Riau';
    if (btn) btn.classList.remove('bg-blue-100', 'border-blue-400');
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

// ── Data stasiun + telemetri (simulasi) ────────────────────────────────────
async function loadStationData() {
  try {
    let geoRaw = null;
    let awsRaw = null;

    // 1. Fetch Geofisika Riau (Akselerograf & SLMON Bali)
    try {
      const resGeo = await fetch('data/geofisika_riau.json?t=' + Date.now());
      if (resGeo.ok) geoRaw = await resGeo.json();
    } catch (e) {
      console.warn('Gagal fetch data/geofisika_riau.json (menggunakan fallback):', e);
    }
    if (!geoRaw || !Array.isArray(geoRaw)) geoRaw = DEFAULT_STATIONS;

    // 2. Fetch AWS Center Riau (AWS, ARG, AAWS, ASRS, IKRO, SOIL)
    try {
      const resAws = await fetch('data/aws_riau.json?t=' + Date.now());
      if (resAws.ok) awsRaw = await resAws.json();
    } catch (e) {
      console.warn('Gagal fetch data/aws_riau.json (menggunakan fallback):', e);
    }
    if (!awsRaw || !Array.isArray(awsRaw)) awsRaw = DEFAULT_AWS_STATIONS;

    const now = Date.now();

    // Mapping stasiun Geofisika (Status On/Off & Latensi strictly mengikuti SLMON Bali secara Real-Time)
    const geoStations = geoRaw.map(s => {
      let ageMs = 5000;
      let status = 'Online';
      const latStr = s.slmon_latency || '5s';

      if (s.slmon_color === 'black' || latStr.includes('d')) {
        status = 'Offline';
        ageMs = (24 * 3600 + 7200) * 1000; // 1 hari lalu
      } else if (s.slmon_color === 'orange' || latStr.includes('m')) {
        status = 'Online'; // Delay
        const m = parseInt(latStr) || 2;
        ageMs = (m * 60 + 15) * 1000;
      } else {
        status = 'Online';
        const sec = parseInt(latStr) || 5;
        ageMs = sec * 1000;
      }

      const stDate = new Date(now - ageMs);

      return {
        ...s,
        base_latency: latStr,
        status: status,
        kategori_bidang: 'Geofisika',
        lastSeen: now - ageMs,
        slmon_last_data: formatDateTimeID(stDate),
        latency: 80 + Math.round(Math.random() * 250)
      };
    });

    // Mapping stasiun AWS Center Riau secara Real-Time
    const awsMapped = (awsRaw || []).map(a => {
      const dDay = a.diff_day !== undefined ? a.diff_day : 0;
      const dHour = a.diff_hour !== undefined ? a.diff_hour : 0;
      const dMin = a.diff_minute !== undefined ? a.diff_minute : 8;
      const totalMin = (dDay * 1440) + (dHour * 60) + dMin;
      const stDate = new Date(now - totalMin * 60000);
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
        lastSeen: now - totalMin * 60000,
        diff_day: dDay,
        diff_hour: dHour,
        diff_minute: dMin,
        diff_minutes_total: totalMin,
        tanggal_data: formatBmkgUTC(stDate),
        klasifikasi: a.klasifikasi || '1',
        icon_file: a.icon || `status_${a.type}_1.png`,
        status: totalMin <= 60 ? 'Online' : (totalMin <= 1440 ? 'Delay' : 'Offline')
      };
    });

    // Gabungkan kedua dataset: 13 Geofisika + 35 AWS Center = 48 Stasiun Riau
    stations = [...geoStations, ...awsMapped];
    console.log(`Berhasil memuat ${geoStations.length} stasiun Geofisika dan ${awsMapped.length} stasiun AWS Center Riau (Total: ${stations.length})`);

    populateDropdowns();
    renderMarkers(true);
    refreshStatusUI();
  } catch (e) {
    console.error('Gagal memuat data stasiun:', e);
  } finally {
    setTimeout(() => {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.classList.add('hidden');
    }, 400);
  }
}

function ageMinutes(s) { return (Date.now() - s.lastSeen) / 60000; }
function catIndex(s) { const a = ageMinutes(s); return STATUS_CATS.findIndex(c => a <= c.max); }

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

// Format waktu UTC standar BMKG: YYYY-MM-DD HH:mm:ss+00 (persis screenshot)
function formatBmkgUTC(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  const YYYY = d.getUTCFullYear();
  const MM = pad(d.getUTCMonth() + 1);
  const DD = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}+00`;
}

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
  const elLat = document.getElementById('modal-slmon-latency');
  const elLast = document.getElementById('modal-slmon-lastdata');
  const elTanggal = document.getElementById('modal-detail-tanggal');
  const elDiffDay = document.getElementById('modal-detail-diff-day');
  const elDiffHour = document.getElementById('modal-detail-diff-hour');
  const elDiffMin = document.getElementById('modal-detail-diff-minute');

  if (isAws) {
    const latAws = `${s.diff_day > 0 ? s.diff_day + 'd ' : ''}${s.diff_hour > 0 ? s.diff_hour + 'h ' : ''}${s.diff_minute || 0}m`;
    if (elLat) elLat.textContent = latAws;
    if (elLast) elLast.textContent = s.tanggal_data || '-';
    if (elTanggal) elTanggal.textContent = s.tanggal_data || '-';
    if (elDiffDay) elDiffDay.textContent = `${s.diff_day || 0} hari`;
    if (elDiffHour) elDiffHour.textContent = `${s.diff_hour || 0} jam`;
    if (elDiffMin) elDiffMin.textContent = `${s.diff_minute || 0} menit`;
  } else {
    const latStr = s.slmon_latency || '5s';
    if (elLat) elLat.textContent = latStr;
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

    if (s.kategori_bidang === 'Geofisika') {
      // Untuk stasiun Geofisika yang streaming (Online/Green)
      if (s.status === 'Online' && (!s.slmon_color || s.slmon_color === 'green')) {
        const baseNum = parseInt(s.base_latency) || 5;
        // Jitter natural antara (baseNum - 1) dan (baseNum + 2)
        const curSec = Math.max(2, baseNum + Math.floor(Math.random() * 3) - 1);
        s.slmon_latency = `${curSec}s`;
        s.lastSeen = now - curSec * 1000;
        s.slmon_last_data = formatDateTimeID(new Date(s.lastSeen));
      } else if (s.slmon_color === 'orange' || (s.slmon_latency && s.slmon_latency.includes('m'))) {
        // Stasiun Delay (1m - 2m)
        const curMin = parseInt(s.base_latency) || 1;
        s.lastSeen = now - (curMin * 60 + 15) * 1000;
        s.slmon_last_data = formatDateTimeID(new Date(s.lastSeen));
      }
    } else if (s.kategori_bidang === 'AWS Center') {
      // Stasiun AWS Center yang Online (< 60 menit)
      if (s.status === 'Online') {
        const totalMin = (s.diff_day || 0) * 1440 + (s.diff_hour || 0) * 60 + (s.diff_minute || 8);
        s.lastSeen = now - totalMin * 60000;
        s.tanggal_data = formatBmkgUTC(new Date(s.lastSeen));
      }
    }

    const after = catIndex(s);
    if (after !== before) {
      anyCatChanged = true;
      const m = markerByKode[s.kode_sta];
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
  const cfg = TYPE_CONFIG[s.tipe] || TYPE_CONFIG['Accelerograph Colocated'];
  const cat = catIndex(s);
  const color = STATUS_CATS[cat].color;
  const codeDisplay = isStationLabelsActive ? 'block' : 'none';
  return L.divIcon({
    className: '',
    iconSize: [40, 34],
    iconAnchor: [20, 10],
    popupAnchor: [0, -10],
    html: `
      <div class="sta-marker">
        ${cat === 0 ? '<div class="ring"></div>' : ''}
        ${shapeSVG(cfg.shape, color, 20, '#ffffff', 2.2)}
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
      if (fTipe === 'aws') {
        if (sTipe !== 'aws' && sTipe !== 'accelerograph 2020') return false;
      } else if (fTipe === 'arg') {
        if (sTipe !== 'arg' && sTipe !== 'accelerograph non colocated') return false;
      } else if (fTipe === 'aaws') {
        if (sTipe !== 'aaws' && sTipe !== 'accelerograph colocated') return false;
      } else if (fTipe === 'asrs') {
        if (sTipe !== 'asrs') return false;
      } else if (fTipe === 'ikro') {
        if (sTipe !== 'ikro' && sTipe !== 'iklimmikro') return false;
      } else if (fTipe === 'soil') {
        if (sTipe !== 'soil') return false;
      } else if (fTipe === 'ship') {
        if (sTipe !== 'ship') return false;
      } else if (fTipe.startsWith('accelerograph')) {
        if (sTipe !== fTipe) return false;
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
      if (fTipe === 'aws') {
        if (sTipe !== 'aws' && sTipe !== 'accelerograph 2020') return false;
      } else if (fTipe === 'arg') {
        if (sTipe !== 'arg' && sTipe !== 'accelerograph non colocated') return false;
      } else if (fTipe === 'aaws') {
        if (sTipe !== 'aaws' && sTipe !== 'accelerograph colocated') return false;
      } else if (fTipe === 'asrs') {
        if (sTipe !== 'asrs') return false;
      } else if (fTipe === 'ikro') {
        if (sTipe !== 'ikro' && sTipe !== 'iklimmikro') return false;
      } else if (fTipe === 'soil') {
        if (sTipe !== 'soil') return false;
      } else if (fTipe === 'ship') {
        if (sTipe !== 'ship') return false;
      } else if (fTipe.startsWith('accelerograph')) {
        if (sTipe !== fTipe) return false;
      } else {
        if (sTipe !== fTipe) return false;
      }
    }
    if (filters.cat >= 0 && catIndex(s) !== filters.cat) return false;
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
    m.bindTooltip(() => `<b>${s.kode_sta}</b> - ${s.nama_sta}<br><span style="color:#d97706;font-weight:600">Akselerograf: ${s.tipe}</span><br><span style="color:#6b7280">Data terakhir: ${formatAge(s)}</span>`,
      { direction: 'top', offset: [0, -8] });
    m.bindPopup(() => popupHTML(s), { minWidth: 295, maxWidth: 350 });
    (useClustering ? clusterGroup : plainGroup).addLayer(m);
    markerByKode[s.kode_sta] = m;
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
        <span class="bmkg-popup-tag" style="background: ${s.status === 'Online' ? '#ecfdf5' : '#fef2f2'}; color: ${s.status === 'Online' ? '#059669' : '#dc2626'}; border: 1px solid ${s.status === 'Online' ? '#a7f3d0' : '#fecaca'};">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${s.status === 'Online' ? '#10b981' : '#ef4444'}; margin-right:3px;"></span>
          ${s.status} ${s.slmon_latency ? `(${s.slmon_latency})` : ''}
        </span>
      </div>

      <!-- Data fields: Hanya menampilkan Site dan Lat/Lon -->
      <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: #334155; margin-bottom: 6px;">
        <div><strong style="color: #0f172a;">Name Station :</strong> ${siteName}</div>
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
        <button onclick="openStationModal('${s.kode_sta}')" style="padding: 5px 6px; background: #0284c7; color: #ffffff; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <i class="fa fa-chart-line"></i> Detail Lengkap
        </button>
      </div>

    </div>`;
}

// ── Modal Detail Stasiun Komprehensif ──────────────────────────────────────
function openStationModal(kode) {
  const s = stations.find(x => x.kode_sta === kode || x.alias === kode);
  if (!s) return;
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

  // Sub-seksi Telemetri: Last Data dan Data Latency (Sesuai SLMON Bali)
  const elTitle = document.getElementById('modal-telemetry-title');
  const elBadge = document.getElementById('modal-telemetry-badge');
  const elLat = document.getElementById('modal-slmon-latency');
  const elLatDesc = document.getElementById('modal-slmon-latency-desc');
  const elLast = document.getElementById('modal-slmon-lastdata');
  const elUpt = document.getElementById('modal-slmon-upt');

  if (isAws) {
    if (elTitle) elTitle.innerHTML = '<i class="fa fa-cloud-sun text-blue-500 mr-1.5"></i> Telemetri AWS Center';
    if (elBadge) {
      elBadge.className = isOnline ? 'px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700' : 'px-2 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700';
      elBadge.textContent = isOnline ? 'Real-time' : 'Offline';
    }
    const latAws = `${s.diff_day > 0 ? s.diff_day + 'd ' : ''}${s.diff_hour > 0 ? s.diff_hour + 'h ' : ''}${s.diff_minute || 0}m`;
    if (elLat) {
      elLat.textContent = latAws;
      elLat.className = `font-mono text-lg font-extrabold mt-1 ${isOnline ? 'text-emerald-600' : 'text-red-600'}`;
    }
    if (elLatDesc) elLatDesc.textContent = `Pembaruan AWS Center`;
    if (elLast) elLast.textContent = s.tanggal_data || '-';
    if (elUpt) elUpt.textContent = s.kota_kab || 'Provinsi Riau';
  } else {
    // Geofisika: Last Data & Data Latency asli dari SLMON Bali
    if (elTitle) elTitle.innerHTML = '<i class="fa fa-wave-square text-amber-500 mr-1.5"></i> Telemetri SLMON Bali';
    if (elBadge) {
      elBadge.className = isOnline ? 'px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700' : 'px-2 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700';
      elBadge.textContent = isOnline ? 'Real-time' : 'Offline';
    }
    const latStr = s.slmon_latency || '5s';
    if (elLat) {
      elLat.textContent = latStr;
      if (isOffline || latStr.includes('d')) {
        elLat.className = 'font-mono text-lg font-extrabold mt-1 text-red-600';
      } else if (latStr.includes('m')) {
        elLat.className = 'font-mono text-lg font-extrabold mt-1 text-amber-600';
      } else {
        elLat.className = 'font-mono text-lg font-extrabold mt-1 text-emerald-600';
      }
    }
    if (elLatDesc) {
      elLatDesc.textContent = isOffline ? 'Data Terputus' : (latStr.includes('m') ? 'Delay Normal' : 'Real-time Streaming');
    }
    if (elLast) elLast.textContent = s.slmon_last_data || '29/10/2026 03:55';
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

  const C = 2 * Math.PI * 14;
  let offset = 0;
  let svg = `<circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" stroke-width="7"/>`;
  if (total > 0) {
    counts.forEach((n, i) => {
      if (!n) return;
      const len = (n / total) * C;
      svg += `<circle cx="18" cy="18" r="14" fill="none" stroke="${STATUS_CATS[i].color}" stroke-width="7"
        stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}"/>`;
      offset += len;
    });
  }
  document.getElementById('donut-svg').innerHTML = svg;
  document.getElementById('donut-total').textContent = total;

  // Update SLMON Bali counts
  const cntGreen = typeFiltered.filter(s => (s.slmon_color ? s.slmon_color === 'green' : catIndex(s) === 0)).length;
  const cntYellow = typeFiltered.filter(s => (s.slmon_color ? (s.slmon_color === 'orange' || s.slmon_color === 'yellow') : (catIndex(s) === 1 || catIndex(s) === 2))).length;
  const cntRed = typeFiltered.filter(s => (s.slmon_color ? (s.slmon_color === 'black' || s.slmon_color === 'red') : catIndex(s) >= 3)).length;

  const elG = document.getElementById('slmon-cnt-green');
  const elY = document.getElementById('slmon-cnt-yellow');
  const elR = document.getElementById('slmon-cnt-red');
  if (elG) elG.textContent = cntGreen;
  if (elY) elY.textContent = cntYellow;
  if (elR) elR.textContent = cntRed;

  const elCol = document.getElementById('slmon-cnt-col');
  const el2020 = document.getElementById('slmon-cnt-2020');
  const elNon = document.getElementById('slmon-cnt-non');
  if (elCol) elCol.textContent = typeFiltered.filter(s => s.tipe === 'Accelerograph Colocated').length;
  if (el2020) el2020.textContent = typeFiltered.filter(s => s.tipe === 'Accelerograph 2020').length;
  if (elNon) elNon.textContent = typeFiltered.filter(s => s.tipe === 'Accelerograph Non Colocated').length;

  renderStationList();
}

function filterByCat(i) {
  filters.cat = filters.cat === i ? -1 : i;
  renderMarkers();
  refreshStatusUI();
}

// ── Tombol tipe alat BMKG (Persis awscenter.bmkg.go.id) ───────────────────
// Mapping bentuk simbol BMKG ke tipe akselerograf:
// AWS  = Bulat         -> Accelerograph 2020 (2 stasiun: BRSN, STA6024)
// ARG  = Segitiga      -> Accelerograph Non Colocated (2 stasiun: PATU, PESI)
// AAWS = Belah Ketupat -> Accelerograph Colocated (9 stasiun: BKNI, GTSI, IHRSI, PRSI, RGRI, RHRSI, RRHRI, RRSI, SIRSI)
// ALL  = Semua Tipe    -> 13 stasiun
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
    if (tv === 'aws' || tv === 'accelerograph 2020') targetIconId = 'aws';
    else if (tv === 'arg' || tv === 'accelerograph non colocated') targetIconId = 'arg';
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
  const cnt2020 = stations.filter(s => s.tipe === 'Accelerograph 2020').length;
  const cntNON = stations.filter(s => s.tipe === 'Accelerograph Non Colocated').length;

  const typeOptions = [
    { value: '', label: `Semua Peralatan BMKG (${stations.length} Stasiun)` },
    { value: 'opt_group_aws', label: '── Peralatan Cuaca & Iklim (AWS Center) ──', disabled: true },
    { value: 'ARG', label: `ARG - Automatic Rain Gauge (${cntARG})` },
    { value: 'AWS', label: `AWS - Automatic Weather Station (${cntAWS})` },
    { value: 'AAWS', label: `AAWS - Agro-climate AWS (${cntAAWS})` },
    { value: 'ASRS', label: `ASRS - Solar Radiation Station (${cntASRS})` },
    { value: 'IKRO', label: `IKRO - Stasiun Iklim Mikro (${cntIKRO})` },
    { value: 'SOIL', label: `SOIL - Soil Moisture Station (${cntSOIL})` },
    { value: 'opt_group_geo', label: '── Peralatan Geofisika (Akselerograf) ──', disabled: true },
    { value: 'Accelerograph Colocated', label: `Accelerograph Colocated (${cntCOL})` },
    { value: 'Accelerograph 2020', label: `Accelerograph 2020 (${cnt2020})` },
    { value: 'Accelerograph Non Colocated', label: `Accelerograph Non Colocated (${cntNON})` },
  ];

  tipe.innerHTML = typeOptions.map(t => 
    t.disabled ? `<optgroup label="${t.label}"></optgroup>` : `<option value="${t.value}">${t.label}</option>`
  ).join('');

  kota.value = filters.kota;
  tipe.value = filters.tipe === 'all' ? '' : filters.tipe;
}

function setupEvents() {
  document.getElementById('select-kota').addEventListener('change', e => { filters.kota = e.target.value; renderMarkers(true); });
  document.getElementById('select-tipe').addEventListener('change', e => { syncBmkgIconsFromDropdown(e.target.value); });
  document.getElementById('checkbox-cluster').addEventListener('change', e => { useClustering = e.target.checked; renderMarkers(); });
  document.getElementById('station-search').addEventListener('input', renderStationList);

  BMKG_ICONS.forEach(ico => {
    const el = document.getElementById(`icon-${ico.id}`);
    if (el) {
      el.addEventListener('click', () => selectBmkgIcon(ico.id));
    }
  });
  document.querySelectorAll('.eq-tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.eq-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    eqTab = t.dataset.tab;
    renderEarthquakeTab();
  }));

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
    const c = STATUS_CATS[catIndex(s)];
    const cfg = TYPE_CONFIG[s.tipe] || TYPE_CONFIG['Accelerograph Colocated'];
    return `
      <li class="flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 hover:bg-amber-50 cursor-pointer group" onclick="focusStation('${s.kode_sta}')">
        ${shapeSVG(cfg.shape, c.color, 14, '#fff', 2)}
        <div class="flex-1 min-w-0">
          <div class="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
            <span>${s.kode_sta}</span>
            <span class="font-normal text-gray-400">&bull; ${cfg.short}</span>
            <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-bold ${s.status === 'Online' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}">
              <span class="w-1 h-1 rounded-full ${s.status === 'Online' ? 'bg-emerald-500' : 'bg-red-500'} mr-1"></span>${s.status}
            </span>
          </div>
          <div class="text-[10px] text-gray-500 truncate">${s.nama_sta} &bull; ${s.kota_kab}</div>
        </div>
        <span class="text-[9px] ${s.status === 'Online' ? 'text-gray-400' : 'text-red-500 font-semibold'} whitespace-nowrap">${s.slmon_latency ? s.slmon_latency : formatAge(s)}</span>
        <button onclick="event.stopPropagation(); openStationModal('${s.kode_sta}')" class="text-gray-300 group-hover:text-blue-600 hover:text-blue-800 p-0.5 ml-0.5 transition" title="Lihat detail lengkap ${s.kode_sta}">
          <i class="fa fa-circle-info text-[11px]"></i>
        </button>
      </li>`;
  }).join('') || '<li class="text-center text-[11px] text-gray-400 py-3">Tidak ada stasiun</li>';

  // Pertahankan posisi scroll agar tidak melompat setiap 5 detik saat tickTelemetry berjalan
  ul.scrollTop = prevScrollTop;
}

function focusStation(kode) {
  let m = markerByKode[kode];
  // Jika stasiun tidak ditemukan karena sedang difilter (kota/tipe/kategori), reset filter agar marker muncul
  if (!m) {
    filters.kota = '';
    filters.tipe = 'all';
    filters.cat = -1;
    const selKota = document.getElementById('select-kota');
    if (selKota) selKota.value = '';
    syncBmkgIconsFromDropdown('all');
    renderMarkers();
    m = markerByKode[kode];
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

// ── Gempa (LIVE dari BMKG) ─────────────────────────────────────────────────
async function loadEarthquakes() {
  const get = async url => {
    try {
      const r = await fetch(url);
      return r.ok ? await r.json() : null;
    } catch (err) {
      console.warn('Gagal mengambil data dari:', url, err);
      return null;
    }
  };

  try {
    const [latest, m5, felt] = await Promise.all([
      get(BMKG_API.latest),
      get(BMKG_API.m5),
      get(BMKG_API.felt),
    ]);

    if (latest?.Infogempa?.gempa) eqCache.latest = latest.Infogempa.gempa;
    if (m5?.Infogempa?.gempa) eqCache.m5 = [].concat(m5.Infogempa.gempa);
    if (felt?.Infogempa?.gempa) eqCache.felt = [].concat(felt.Infogempa.gempa);

    renderEarthquakeTab();
    if (eqCache.latest) plotEarthquake(eqCache.latest, false);
  } catch (e) {
    console.warn('Gagal memuat gempa BMKG:', e);
    renderEarthquakeTab();
  }
}

function parseCoord(g) {
  if (!g) return [NaN, NaN];
  if (g.Coordinates && typeof g.Coordinates === 'string') {
    const parts = g.Coordinates.split(',');
    if (parts.length === 2) {
      const la = parseFloat(parts[0].trim());
      const lo = parseFloat(parts[1].trim());
      if (!isNaN(la) && !isNaN(lo)) return [la, lo];
    }
  }
  let lat = parseFloat(g.Lintang);
  let lon = parseFloat(g.Bujur);
  if (typeof g.Lintang === 'string' && /LS/i.test(g.Lintang)) lat = -Math.abs(lat);
  if (typeof g.Bujur === 'string' && /BB/i.test(g.Bujur)) lon = -Math.abs(lon);
  return [lat, lon];
}

function haversine(a, b) {
  const R = 6371, toR = d => d * Math.PI / 180;
  const dLat = toR(b[0] - a[0]), dLon = toR(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestStation(g) {
  if (!stations.length) return null;
  const p = parseCoord(g);
  if (isNaN(p[0]) || isNaN(p[1])) return null;
  return stations.map(s => ({ s, d: haversine(p, [s.lat, s.lon]) })).sort((a, b) => a.d - b.d)[0];
}

function magColor(m) { m = parseFloat(m); return m >= 5 ? 'bg-red-600' : m >= 4 ? 'bg-amber-500' : 'bg-emerald-500'; }

function focusEarthquake(g) {
  if (!g) return;
  plotEarthquake(g, true);
}

function focusEarthquakeFromList(tab, index) {
  const list = eqCache[tab];
  if (list && list[index]) {
    focusEarthquake(list[index]);
  }
}

// ── Navigasi ke Titik Lokasi Saat Ini (Geolocation) ──────────────────────
let userLocationMarker = null;
let userLocationCircle = null;

function goToCurrentLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation tidak didukung pada browser ini', 'info');
    map.flyTo(RIAU_CENTER, RIAU_ZOOM, { duration: 1.0 });
    return;
  }

  showToast('Mencari titik lokasi saat ini...', 'info');

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const acc = pos.coords.accuracy || 0;

      // Lepas batas sementara jika koordinat user di luar batas Riau
      const isOutsideRiau = !RIAU_BOUNDS.contains([lat, lon]);
      if (isOutsideRiau) {
        map.setMaxBounds(null);
      } else if (isMaskActive) {
        map.setMaxBounds(RIAU_BOUNDS);
      }

      if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
      }
      if (userLocationCircle) {
        map.removeLayer(userLocationCircle);
      }

      if (acc > 0) {
        userLocationCircle = L.circle([lat, lon], {
          radius: acc,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 1
        }).addTo(map);
      }

      const locIcon = L.divIcon({
        className: 'user-loc-pin',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        html: `<div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;">
          <span class="animate-ping" style="position:absolute;width:26px;height:26px;border-radius:50%;background:#3b82f6;opacity:0.75;"></span>
          <div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2.5px solid #ffffff;box-shadow:0 0 10px rgba(37,99,235,0.8);position:relative;z-index:2;"></div>
        </div>`
      });

      userLocationMarker = L.marker([lat, lon], {
        icon: locIcon,
        zIndexOffset: 3000
      }).bindPopup(`
        <div class="text-xs p-1" style="min-width:160px;">
          <div class="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
            <i class="fa fa-location-crosshairs text-blue-600"></i> Titik Lokasi Anda
          </div>
          <div class="text-gray-700 text-[11px] leading-tight">Koordinat: <b>${lat.toFixed(5)}, ${lon.toFixed(5)}</b></div>
          ${acc ? `<div class="text-[10px] text-gray-500 mt-0.5">Akurasi: ±${Math.round(acc)} meter</div>` : ''}
        </div>
      `).addTo(map);

      map.flyTo([lat, lon], Math.max(map.getZoom(), 13), { duration: 1.0 });
      map.once('moveend', () => userLocationMarker && userLocationMarker.openPopup());
      setTimeout(() => { if (userLocationMarker && !userLocationMarker.isPopupOpen()) userLocationMarker.openPopup(); }, 1200);

      showToast('Berhasil diarahkan ke titik lokasi saat ini!', 'success');
    },
    err => {
      console.warn('Geolocation error:', err);
      if (err.code === 1) {
        showToast('Izin lokasi ditolak pada browser. Mengarahkan ke pusat peta.', 'info');
      } else {
        showToast('Gagal mendeteksi lokasi saat ini. Mengarahkan ke pusat peta.', 'info');
      }
      map.flyTo(RIAU_CENTER, RIAU_ZOOM, { duration: 1.0 });
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}
window.goToCurrentLocation = goToCurrentLocation;

function renderEarthquakeTab() {
  const el = document.getElementById('earthquake-content');
  const failMsg = '<div class="py-2 text-center text-gray-400"><i class="fa fa-triangle-exclamation text-amber-500"></i> Data BMKG belum dapat diambil. Mencoba lagi otomatis.</div>';

  if (eqTab === 'latest') {
    const g = eqCache.latest;
    if (!g) { el.innerHTML = failMsg; return; }
    const near = nearestStation(g);
    const hasShakemap = g.Shakemap &&
      typeof g.Shakemap === 'string' &&
      g.Shakemap.trim() !== '' &&
      g.Shakemap.trim() !== '-' &&
      g.Shakemap.trim() !== 'null' &&
      !g.Shakemap.includes('undefined');

    el.innerHTML = `
      <div class="flex gap-3 cursor-pointer hover:bg-red-50/50 p-1 rounded transition" onclick="focusEarthquake(eqCache.latest)" title="Klik untuk fokus lokasi episenter gempa">
        <div class="w-14 h-14 rounded-lg ${magColor(g.Magnitude)} text-white flex flex-col items-center justify-center shrink-0 shadow">
          <span class="text-lg font-black leading-none">${g.Magnitude}</span><span class="text-[8px] font-bold">MAG</span>
        </div>
        <div class="flex-1 min-w-0 space-y-0.5">
          <div class="text-[11px] font-bold text-gray-800 leading-snug">${g.Wilayah}</div>
          <div class="text-[10px] text-gray-500"><i class="fa fa-clock w-3"></i> ${g.Tanggal} · ${g.Jam}</div>
          <div class="text-[10px] text-gray-500"><i class="fa fa-arrows-down-to-line w-3"></i> Kedalaman ${g.Kedalaman} · ${g.Lintang} ${g.Bujur}</div>
        </div>
      </div>
      <div class="flex gap-1.5 mt-2">
        <button onclick="focusEarthquake(eqCache.latest)" class="flex-1 text-[10px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded py-1 transition flex items-center justify-center">
          <i class="fa fa-crosshairs mr-1"></i> Lihat di Peta
        </button>
        <button onclick="goToCurrentLocation()" class="flex-1 text-[10px] font-semibold bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-900 rounded py-1 transition flex items-center justify-center" title="Arahkan peta ke titik lokasi saat ini">
          <i class="fa fa-location-crosshairs mr-1"></i> Titik Lokasi
        </button>
      </div>
      ${near ? `<div onclick="focusStation('${near.s.kode_sta}')" class="mt-1.5 text-[10px] bg-blue-50/60 border border-blue-100 text-blue-900 rounded px-2 py-1 cursor-pointer hover:bg-blue-100/70 transition" title="Klik untuk fokus stasiun ${near.s.kode_sta}">
        Stasiun terdekat: <b>${near.s.kode_sta}</b> (${near.s.kota_kab}) — <b>${Math.round(near.d)} km</b></div>` : ''}
      ${g.Potensi ? `<div class="mt-1.5 text-[10px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">${g.Potensi}</div>` : ''}
      ${g.Dirasakan ? `<div class="mt-1.5 text-[10px] text-gray-600"><b>Dirasakan:</b> ${g.Dirasakan}</div>` : ''}
      ${hasShakemap ? `<a class="block mt-1.5 text-[10px] text-blue-600 hover:underline" target="_blank" rel="noopener" href="https://data.bmkg.go.id/DataMKG/TEWS/${encodeURIComponent(g.Shakemap.trim())}"><i class="fa fa-image"></i> Lihat Shakemap BMKG</a>` : ''}`;
    return;
  }

  const list = eqCache[eqTab];
  if (!list || !list.length) { el.innerHTML = failMsg; return; }
  el.innerHTML = list.map((g, idx) => `
    <div class="flex items-center gap-2 py-1.5 border-b border-gray-100 hover:bg-amber-50 cursor-pointer px-1 rounded transition" onclick="focusEarthquakeFromList('${eqTab}', ${idx})" title="Klik untuk tampilkan di peta">
      <span class="w-9 h-7 rounded ${magColor(g.Magnitude)} text-white text-[11px] font-bold flex items-center justify-center shrink-0">${g.Magnitude}</span>
      <div class="flex-1 min-w-0">
        <div class="text-[10.5px] font-semibold text-gray-800 truncate" title="${g.Wilayah}">${g.Wilayah}</div>
        <div class="text-[9.5px] text-gray-500">${g.Tanggal} ${g.Jam} · ${g.Kedalaman}</div>
        ${eqTab === 'felt' && g.Dirasakan ? `<div class="text-[9.5px] text-amber-700 truncate" title="${g.Dirasakan}">${g.Dirasakan}</div>` : ''}
      </div>
      <i class="fa fa-chevron-right text-[10px] text-gray-300"></i>
    </div>`).join('');
}

function plotEarthquake(g, shouldFly = false) {
  const [lat, lon] = parseCoord(g);
  if (isNaN(lat) || isNaN(lon)) return;

  if (earthquakeMarker) map.removeLayer(earthquakeMarker);
  if (earthquakeLine) { map.removeLayer(earthquakeLine); earthquakeLine = null; }

  earthquakeMarker = L.marker([lat, lon], {
    zIndexOffset: 2000,
    icon: L.divIcon({
      className: '', iconSize: [30, 30], iconAnchor: [15, 15],
      html: `<div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center">
        <span class="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-75"></span>
        <div style="width:16px;height:16px;border-radius:50%;background:#dc2626;border:2px solid #fff;box-shadow:0 0 10px rgba(220,38,38,1);display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px;font-weight:900;">M</div>
      </div>`,
    }),
  }).bindTooltip(`<b>Gempa M${g.Magnitude}</b><br>${g.Wilayah}<br><span style="color:#6b7280">${g.Tanggal} ${g.Jam}</span>`, {
    direction: 'top', offset: [0, -10]
  }).addTo(map);

  // Jika episenter berada di luar batas Riau, lepas batasan maxBounds sementara agar peta dapat menampilkan episenter
  const isOutsideRiau = !RIAU_BOUNDS.contains([lat, lon]);
  if (isOutsideRiau) {
    map.setMaxBounds(null);
  } else if (isMaskActive) {
    map.setMaxBounds(RIAU_BOUNDS);
  }

  // Hubungkan episenter gempa dengan stasiun Riau terdekat via garis putus-putus
  const near = nearestStation(g);
  if (near && near.s) {
    earthquakeLine = L.polyline([[lat, lon], [near.s.lat, near.s.lon]], {
      color: '#dc2626', weight: 2, dashArray: '5, 6', opacity: 0.8,
    }).bindTooltip(`Jarak ke stasiun ${near.s.kode_sta}: ${Math.round(near.d)} km`, { sticky: true }).addTo(map);
  }

  if (shouldFly) {
    map.flyTo([lat, lon], Math.min(Math.max(map.getZoom(), 6), 9), { duration: 0.8 });
    map.once('moveend', () => earthquakeMarker?.openTooltip());
    setTimeout(() => earthquakeMarker?.openTooltip(), 900);
  }
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
