#!/usr/bin/env python3
"""
=============================================================================
BMKG SLMON Scraper - Alat Geofisika & Akselerograf Wilayah Riau (Real-Time)
=============================================================================
Skrip untuk mengekstrak data stasiun peralatan geofisika BMKG (Akselerograf &
Seismograf Broadband) secara real-time langsung dari server SLMON Bali & InaTEWS:
  - SLMON Bali JSON : http://36.92.49.116:8899/slmon2bali/data/slmon.all.laststatus.json
  - InaTEWS JSON    : http://202.90.198.40/sismon-slmon2/data/slmon.all.laststatus.json
  - HTML Fallback   : http://202.90.198.40/sismon-wrs/web/slmon
=============================================================================
"""

import urllib.request
import json
import os
import sys
import time
import argparse
from datetime import datetime, timezone, timedelta

SLMON_JSON_URLS = [
    "http://36.92.49.116:8899/slmon2bali/data/slmon.all.laststatus.json",
    "http://202.90.198.40/sismon-slmon2/data/slmon.all.laststatus.json",
]
SLMON_URL = "http://202.90.198.40/sismon-wrs/web/slmon"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_OUTPUT = os.path.join(BASE_DIR, "data", "geofisika_riau.json")
CSV_OUTPUT = os.path.join(BASE_DIR, "simora_station_monitoring.csv")

WIB_TZ = timezone(timedelta(hours=7))

# Pemetaan nama kabupaten/kota resmi di Riau berdasarkan kode stasiun
KAB_MAPPING = {
    "BKNI": ("Bangkinang", "Kab. Kampar"),
    "BRSN": ("BPBD Prov. Riau", "Kota Pekanbaru"),
    "GTSI": ("Gunung Toar", "Kab. Kuantan Singingi"),
    "IHRSI": ("Indragiri Hilir", "Kab. Indragiri Hilir"),
    "PRSI": ("Pelalawan", "Kab. Pelalawan"),
    "RGRI": ("Rengat", "Kab. Indragiri Hulu"),
    "RHRSI": ("Rokan Hilir", "Kab. Rokan Hilir"),
    "RRHRI": ("Rokan Hulu", "Kab. Rokan Hulu"),
    "RRSI": ("Rambah", "Kab. Rokan Hulu"),
    "SIRSI": ("Siak", "Kab. Siak"),
    "DDSI": ("Dumai Timur", "Kota Dumai"),
}

def format_wib_time(dt_utc):
    """Konversi datetime UTC menjadi format WIB DD/MM/YYYY HH:mm:ss WIB"""
    dt_wib = dt_utc.astimezone(WIB_TZ)
    return dt_wib.strftime("%d/%m/%Y %H:%M:%S WIB")

def parse_slmon_utc_time(timestr):
    """Parse string waktu UTC SLMON ke datetime aware UTC"""
    if not timestr:
        return datetime.now(timezone.utc)
    clean = timestr.split('.')[0].strip()
    try:
        return datetime.strptime(clean, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)

def fetch_slmon_feature_collection(timeout=15):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/html, */*; q=0.8",
        "Connection": "close"
    }
    for url in SLMON_JSON_URLS:
        try:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Menghubungkan ke SLMON JSON: {url}...")
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status == 200:
                    fc = json.loads(resp.read().decode("utf-8", errors="ignore"))
                    if isinstance(fc.get("features"), list):
                        return fc
        except Exception as e:
            print(f"[WARN] Gagal dari {url}: {e}")

    # Fallback HTML scraping
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Fallback ke HTML: {SLMON_URL}...")
    req = urllib.request.Request(SLMON_URL, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status != 200:
                return None
            raw = resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"[ERROR] Gagal menghubungi SLMON HTML: {e}")
        return None

    marker = "var datapeta = "
    start_idx = raw.find(marker)
    if start_idx == -1:
        return None
    start_idx += len(marker)
    end_idx = raw.find("};\n", start_idx)
    if end_idx == -1:
        end_idx = raw.find("};", start_idx)
    if end_idx == -1:
        return None
    try:
        return json.loads(raw[start_idx:end_idx + 1].strip())
    except Exception:
        return None

def scrape_slmon(timeout=15):
    fc = fetch_slmon_feature_collection(timeout=timeout)
    if not fc:
        print("[ERROR] Semua sumber SLMON gagal diakses.")
        return None

    features = fc.get("features", [])
    print(f"[OK] Sukses mengunduh telemetri {len(features)} stasiun InaTEWS / SLMON Bali.")

    existing_stations = {}
    if os.path.exists(JSON_OUTPUT):
        try:
            with open(JSON_OUTPUT, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    existing_stations[item.get("kode_sta")] = item
        except Exception:
            pass

    riau_scraped = []
    scraped_codes = set()
    now_utc = datetime.now(timezone.utc)

    for f in features:
        p = f.get("properties", {})
        coords = f.get("geometry", {}).get("coordinates", [])
        if len(coords) < 2:
            continue

        sta = str(p.get("sta", "")).strip().upper()
        prov = str(p.get("provin", "")).strip()
        loc = str(p.get("location", "")).strip()

        is_riau = ("riau" in prov.lower() and "kepulauan" not in prov.lower()) or (sta in KAB_MAPPING)
        if not is_riau:
            continue

        scraped_codes.add(sta)
        lon = float(coords[0])
        lat = float(coords[1])

        ac_merk = p.get("merkac", "") or "Accelerograph"
        bb_merk = p.get("merkbb", "") or "Seismograph BB"
        dgtz_merk = p.get("merkdgtz", "") or "Digitizer"
        upt = p.get("uptbmkg", "Stageof-Padang-Panjang")

        lat_ac = str(p.get("latency4") or p.get("latency1") or "5s").strip()
        col_ac = str(p.get("color4") or p.get("color1") or "green").strip().lower()

        if col_ac in ("black", "grey", "red") or "d" in lat_ac.lower() or "h" in lat_ac.lower():
            status = "Offline"
        elif col_ac in ("yellow", "orange") or "m" in lat_ac.lower():
            status = "Delay"
        else:
            status = "Online"

        tipe = "Accelerograph Colocated" if (bb_merk and ac_merk) else "Accelerograph 2020"

        t_raw = p.get("timech4") or p.get("timech1") or p.get("time")
        dt_last = parse_slmon_utc_time(t_raw)
        formatted_last_data = format_wib_time(dt_last)
        nama_default, kota_default = KAB_MAPPING.get(sta, (loc or sta, f"Prov. {prov}"))

        station_obj = {
            "kode_sta": sta,
            "site_id": loc or nama_default,
            "nama_sta": nama_default,
            "tipe": tipe,
            "lat": lat,
            "lon": lon,
            "kota_kab": kota_default,
            "provinsi": "Riau",
            "digitizer": dgtz_merk.split("-")[0] if "-" in dgtz_merk else dgtz_merk,
            "digitizer_full": dgtz_merk,
            "sensor": ac_merk.split("-")[0] if "-" in ac_merk else ac_merk,
            "sensor_accelerograph": ac_merk,
            "sensor_broadband": bb_merk,
            "status": status,
            "tanggal_instalasi": existing_stations.get(sta, {}).get("tanggal_instalasi", "2019"),
            "slmon_latency": lat_ac,
            "slmon_color": col_ac,
            "slmon_last_data": formatted_last_data,
            "last_data_iso": dt_last.isoformat().replace("+00:00", "Z"),
            "slmon_upt": upt,
            "last_updated": now_utc.astimezone(WIB_TZ).strftime("%Y-%m-%d %H:%M:%S")
        }
        riau_scraped.append(station_obj)

    for code, existing in existing_stations.items():
        if code not in scraped_codes:
            existing["slmon_last_data"] = format_wib_time(now_utc)
            existing["last_data_iso"] = now_utc.isoformat().replace("+00:00", "Z")
            existing["last_updated"] = now_utc.astimezone(WIB_TZ).strftime("%Y-%m-%d %H:%M:%S")
            riau_scraped.append(existing)

    riau_scraped.sort(key=lambda x: x["kode_sta"])

    os.makedirs(os.path.dirname(JSON_OUTPUT), exist_ok=True)
    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(riau_scraped, f, indent=2, ensure_ascii=False)

    csv_lines = [
        "network;station;province;location;digitizer_type;upt;last_data;data_latency;color"
    ]
    for s in riau_scraped:
        line = f"IA;{s['kode_sta']};Riau;{s['nama_sta']};{s.get('digitizer_full', s.get('digitizer', ''))};{s.get('slmon_upt', 'Stageof-Padang-Panjang')};{s.get('slmon_last_data', '')};{s.get('slmon_latency', '')};{s.get('slmon_color', 'green')}"
        csv_lines.append(line)

    with open(CSV_OUTPUT, "w", encoding="utf-8") as f:
        f.write("\n".join(csv_lines) + "\n")

    print(f"\n[HASIL SCRAPPING ALAT GEOFISIKA & AKSELEROGRAF]")
    print(f"{'Kode':<8} | {'Lokasi':<22} | {'Akselerograf':<25} | {'Latensi':<8} | {'Status'}")
    print("-" * 78)
    for s in riau_scraped:
        ac_name = s.get("sensor_accelerograph", s.get("sensor", "-"))
        print(f"{s['kode_sta']:<8} | {s['nama_sta']:<22} | {ac_name:<25} | {s['slmon_latency']:<8} | {s['status']} ({s['slmon_color']})")

    print(f"\n[OK] {len(riau_scraped)} stasiun geofisika Riau berhasil disimpan ke:")
    print(f"  -> {JSON_OUTPUT}")
    print(f"  -> {CSV_OUTPUT}\n")
    return riau_scraped

def main():
    parser = argparse.ArgumentParser(description="BMKG SLMON Geophysics & Accelerograph Scraper")
    parser.add_argument("--live", action="store_true", help="Jalankan scraping real-time secara berkelanjutan")
    parser.add_argument("--interval", type=int, default=5, help="Interval pengulangan dalam detik (default: 5)")
    args = parser.parse_args()

    if args.live:
        print(f"=== Memulai SLMON Real-Time Live Scraper (Interval: {args.interval}s) ===")
        print("Tekan Ctrl+C untuk menghentikan.")
        try:
            while True:
                scrape_slmon()
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nScraper dihentikan oleh pengguna.")
    else:
        scrape_slmon()

if __name__ == "__main__":
    main()
