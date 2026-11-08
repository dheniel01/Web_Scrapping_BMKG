#!/usr/bin/env python3
"""
=============================================================================
BMKG Real-Time Master Scraper: SLMON Geofisika & AWS Center Riau
=============================================================================
Skrip utama untuk mengekstrak seluruh peralatan BMKG di Wilayah Riau secara real-time:
1. SLMON InaTEWS (Alat Geofisika & Akselerograf):
   - URL: http://202.90.198.40/sismon-wrs/web/slmon
   - Output: data/geofisika_riau.json & simora_station_monitoring.csv
2. AWS Center BMKG (Alat Cuaca & Iklim: AWS, ARG, AAWS, ASRS, IKRO, SOIL):
   - URL: https://awscenter.bmkg.go.id/base/marker_login_map
   - Output: data/aws_riau.json & aws_center_provinsi_riau.csv

Penggunaan:
  python scrape_all.py             # Jalankan scrapping sekali
  python scrape_all.py --live      # Jalankan scrapping real-time berulang
  python scrape_all.py --live --interval 5  # Ulangi tiap 5 detik
=============================================================================
"""

import sys
import time
import argparse
from datetime import datetime

from scrape_slmon import scrape_slmon
from scrape_awscenter import scrape_awscenter

def run_all():
    start = datetime.now()
    print("=" * 80)
    print(f"[{start.strftime('%Y-%m-%d %H:%M:%S')}] MEMULAI SCRAPPING DATA REAL-TIME BMKG RIAU")
    print("=" * 80)

    # 1. Scrape SLMON Geofisika (Akselerograf & Seismograf)
    print("\n--- [1/2] MENGAMBIL DATA ALAT GEOFISIKA & AKSELEROGRAF (SLMON) ---")
    geo_data = scrape_slmon()

    # 2. Scrape AWS Center (AWS, ARG, AAWS, ASRS, IKRO, SOIL)
    print("\n--- [2/2] MENGAMBIL DATA ALAT CUACA/IKLIM (AWS CENTER) ---")
    aws_ok = scrape_awscenter()

    end = datetime.now()
    elapsed = (end - start).total_seconds()
    print("=" * 80)
    print(f"[{end.strftime('%Y-%m-%d %H:%M:%S')}] SCRAPPING SELESAI ({elapsed:.2f} detik)")
    print("=" * 80 + "\n")

def main():
    parser = argparse.ArgumentParser(description="BMKG Master Real-Time Scraper")
    parser.add_argument("--live", action="store_true", help="Jalankan scraping real-time secara berkelanjutan")
    parser.add_argument("--interval", type=int, default=10, help="Interval loop dalam detik (default: 10)")
    args = parser.parse_args()

    if args.live:
        print(f"=== Menjalankan Live Scraping BMKG Riau Setiap {args.interval} Detik ===")
        print("Tekan Ctrl+C untuk berhenti.\n")
        try:
            while True:
                run_all()
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nLive scraping dihentikan oleh pengguna.")
    else:
        run_all()

if __name__ == "__main__":
    main()
