#!/usr/bin/env python3
"""
=============================================================================
BMKG AWS Center Scraper - Wilayah Riau (Real-Time)
=============================================================================
Skrip untuk mengekstrak data stasiun peralatan cuaca/iklim BMKG (AWS, ARG, AAWS,
ASRS, IKRO, SOIL) secara real-time langsung dari server awscenter.bmkg.go.id.

Endpoint Resmi BMKG:
- Live Marker : https://awscenter.bmkg.go.id/base/marker_login_map
- Provinsi ID : PR005 (Riau)
=============================================================================
"""

import urllib.request
import ssl
import json
import os
import sys
from datetime import datetime

AWS_CENTER_URL = "https://awscenter.bmkg.go.id/base/marker_login_map"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "data", "aws_riau.json")
CSV_OUTPUT = os.path.join(os.path.dirname(__file__), "aws_center_provinsi_riau.csv")

def scrape_awscenter(timeout=15):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Menghubungkan ke {AWS_CENTER_URL}...")
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(
        AWS_CENTER_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://awscenter.bmkg.go.id/",
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01"
        }
    )
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            if resp.status != 200:
                print(f"Gagal: HTTP {resp.status}")
                return False
            
            raw = resp.read().decode("utf-8")
            data = json.loads(raw)
            print(f"Sukses mengunduh {len(data)} stasiun nasional.")
            
            # Filter khusus Provinsi Riau (kode PR005 atau nama Riau)
            riau_stations = []
            for item in data:
                prov_code = item.get("kode_provinsi", "")
                prov_name = str(item.get("nama_provinsi", "")).strip().lower()
                
                # Pastikan Riau, BUKAN Kepulauan Riau (PR010)
                if prov_code == "PR005" or (prov_name == "riau" and "kepulauan" not in prov_name):
                    try:
                        lat = float(item.get("lat", 0))
                        lng = float(item.get("lng", 0))
                    except (ValueError, TypeError):
                        continue
                    
                    t_type = item.get("type", "").lower().strip()
                    if t_type == "iklimmikro":
                        t_type = "ikro"
                        
                    d_day = int(item.get("diff_day") or 0)
                    d_hour = int(item.get("diff_hour") or 0)
                    d_min = int(item.get("diff_minute") or 0)
                    total_min = d_day * 1440 + d_hour * 60 + d_min
                    
                    riau_stations.append({
                        "id_station": item.get("id_station", ""),
                        "name_station": item.get("name_station", "").strip(),
                        "nama_kota": item.get("nama_kota", "").strip(),
                        "nama_provinsi": "Riau",
                        "type": t_type,
                        "lat": lat,
                        "lng": lng,
                        "tanggal": item.get("tanggal", ""),
                        "diff_day": d_day,
                        "diff_hour": d_hour,
                        "diff_minute": d_min,
                        "diff_minutes_total": total_min,
                        "icon": item.get("icon", ""),
                        "klasifikasi": item.get("klasifikasi", "1")
                    })
            
            print(f"Ditemukan {len(riau_stations)} stasiun aktif di Provinsi Riau.")
            
            # Simpan ke data/aws_riau.json
            os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(riau_stations, f, indent=2, ensure_ascii=False)
            
            # Simpan ke aws_center_provinsi_riau.csv
            csv_lines = ["id_station;name_station;nama_kota;nama_provinsi;type;lat;lng;tanggal;diff_day;diff_hour;diff_minute;klasifikasi"]
            for s in riau_stations:
                csv_lines.append(f"{s['id_station']};{s['name_station']};{s['nama_kota']};{s['nama_provinsi']};{s['type']};{s['lat']};{s['lng']};{s['tanggal']};{s['diff_day']};{s['diff_hour']};{s['diff_minute']};{s['klasifikasi']}")
            with open(CSV_OUTPUT, "w", encoding="utf-8") as f:
                f.write("\n".join(csv_lines) + "\n")

            print(f"Data tersimpan di:")
            print(f"  -> {OUTPUT_FILE}")
            print(f"  -> {CSV_OUTPUT}")
            
            # Ringkasan per tipe
            summary = {}
            for s in riau_stations:
                t = s["type"].upper()
                summary[t] = summary.get(t, 0) + 1
            
            print("\nRingkasan Tipe Peralatan Riau:")
            for t, cnt in sorted(summary.items()):
                print(f"  - {t:<6} : {cnt:>2} stasiun")
                
            return True
            
    except Exception as e:
        print(f"Terjadi kesalahan saat scraping: {e}")
        return False

if __name__ == "__main__":
    success = scrape_awscenter()
    sys.exit(0 if success else 1)
