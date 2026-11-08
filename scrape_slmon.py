#!/usr/bin/env python3
"""
=============================================================================
BMKG SLMON Scraper - Alat Geofisika & Akselerograf Wilayah Riau (Real-Time)
=============================================================================
Skrip untuk mengekstrak data stasiun peralatan geofisika BMKG (Akselerograf &
Seismograf Broadband) secara real-time langsung dari server SLMON InaTEWS:
  http://202.90.198.40/sismon-wrs/web/slmon

Fitur:
- Ekstraksi real-time langsung dari variabel 'datapeta' (GeoJSON FeatureCollection)
- Filter khusus Provinsi Riau (stasiun BKNI, GTSI, IHRSI, PRSI, RGRI, RHRSI,
  RRHRI, RRSI, SIRSI, DDSI, BRSN)
- Ekstraksi detail:
  * Merk Accelerograph (merkac: Nanometrics Titan, Guralp Fortis, Kinemetrics FBA)
  * Merk Seismograph Broadband (merkbb: Streckeisen, Nanometrics Trillium, Guralp 3T)
  * Merk Digitizer (merkdgtz: Centaur, Minimus, Q330)
  * Latensi real-time channel Akselerograf (latency4 & color4) dan Broadband (latency1 & color1)
  * Waktu data telemetri real-time (timech4, timech1, time)
- Output otomatis ke:
  * data/geofisika_riau.json (untuk web dashboard)
  * simora_station_monitoring.csv (dataset tabel CSV)
- Dukungan mode loop real-time: python scrape_slmon.py --live --interval 5
=============================================================================
"""

import urllib.request
import json
import os
import sys
import time
import argparse
from datetime import datetime

SLMON_URL = "http://202.90.198.40/sismon-wrs/web/slmon"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_OUTPUT = os.path.join(BASE_DIR, "data", "geofisika_riau.json")
CSV_OUTPUT = os.path.join(BASE_DIR, "simora_station_monitoring.csv")

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

def format_id_time(dt):
    """Format datetime ke format Indonesia: DD/MM/YYYY HH:mm:ss"""
    return dt.strftime("%d/%m/%Y %H:%M:%S")

def parse_slmon_time(timestr):
    """Parse string waktu SLMON ke datetime object"""
    if not timestr:
        return datetime.now()
    # Contoh format: 2026-11-08 15:58:02 atau 2026-11-08 15:57:56.4968
    clean = timestr.split('.')[0].strip()
    try:
        return datetime.strptime(clean, "%Y-%m-%d %H:%M:%S")
    except Exception:
        return datetime.now()

def scrape_slmon(timeout=15):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now_str}] Menghubungkan ke server SLMON: {SLMON_URL}...")

    req = urllib.request.Request(
        SLMON_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Connection": "close"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status != 200:
                print(f"[ERROR] HTTP {resp.status} dari SLMON")
                return None
            raw = resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"[ERROR] Gagal menghubungi SLMON: {e}")
        return None

    # Cari variabel datapeta di dalam HTML
    marker = "var datapeta = "
    start_idx = raw.find(marker)
    if start_idx == -1:
        print("[ERROR] Variabel 'datapeta' tidak ditemukan di halaman SLMON.")
        return None

    start_idx += len(marker)
    end_idx = raw.find("};\n", start_idx)
    if end_idx == -1:
        end_idx = raw.find("};", start_idx)
    if end_idx == -1:
        print("[ERROR] Akhir GeoJSON tidak ditemukan.")
        return None

    json_str = raw[start_idx:end_idx + 1].strip()
    try:
        fc = json.loads(json_str)
    except Exception as e:
        print(f"[ERROR] Gagal parse JSON datapeta: {e}")
        return None

    features = fc.get("features", [])
    print(f"[OK] Sukses mengunduh telemetri {len(features)} stasiun InaTEWS nasional.")

    # Baca stasiun geofisika yang sudah ada (untuk mempertahankan stasiun lokal seperti BRSN jika tidak ada di SLMON)
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

    for f in features:
        p = f.get("properties", {})
        coords = f.get("geometry", {}).get("coordinates", [])
        if len(coords) < 2:
            continue

        sta = str(p.get("sta", "")).strip().upper()
        prov = str(p.get("provin", "")).strip()
        loc = str(p.get("location", "")).strip()

        # Filter: Provinsi Riau (bukan Kepulauan Riau)
        is_riau = ("riau" in prov.lower() and "kepulauan" not in prov.lower()) or (sta in KAB_MAPPING)

        if not is_riau:
            continue

        scraped_codes.add(sta)
        lon = float(coords[0])
        lat = float(coords[1])

        # Ambil telemetri Accelerograph (channel 4/HN*) dan Broadband (channel 1/SH*)
        ac_merk = p.get("merkac", "") or "Accelerograph"
        bb_merk = p.get("merkbb", "") or "Seismograph BB"
        dgtz_merk = p.get("merkdgtz", "") or "Digitizer"
        upt = p.get("uptbmkg", "Stageof-Padang-Panjang")

        # Latensi & warna: prioritaskan sensor akselerograf (channel 4), fallback ke broadband (channel 1)
        lat_ac = p.get("latency4") or p.get("latency1") or "5s"
        col_ac = p.get("color4") or p.get("color1") or "green"

        # Tentukan status online / delay / offline
        if col_ac == "black" or "d" in str(lat_ac).lower():
            status = "Offline"
        elif col_ac in ("yellow", "orange") or "m" in str(lat_ac).lower():
            status = "Online"  # Delay
        else:
            status = "Online"

        # Tipe alat
        if bb_merk and ac_merk:
            tipe = "Accelerograph Colocated"
        else:
            tipe = "Accelerograph 2020"

        # Waktu telemetri
        t_raw = p.get("timech4") or p.get("time")
        dt_last = parse_slmon_time(t_raw)
        formatted_last_data = format_id_time(dt_last)

        # Nama dan Kota
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
            "slmon_upt": upt,
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        riau_scraped.append(station_obj)

    # Tambahkan stasiun lokal yang ada sebelumnya jika belum ter-scrape (misal BRSN)
    for code, existing in existing_stations.items():
        if code not in scraped_codes:
            # Perbarui waktu agar tetap realtime
            existing["slmon_last_data"] = format_id_time(datetime.now())
            existing["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            riau_scraped.append(existing)

    # Urutkan berdasarkan kode stasiun
    riau_scraped.sort(key=lambda x: x["kode_sta"])

    # 1. Simpan ke data/geofisika_riau.json
    os.makedirs(os.path.dirname(JSON_OUTPUT), exist_ok=True)
    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(riau_scraped, f, indent=2, ensure_ascii=False)

    # 2. Simpan ke simora_station_monitoring.csv
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
