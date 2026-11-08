import json
import re

# 1. User provided AWS Center Riau Dataset (35 stations)
raw_aws = """id_station;name_station;nama_kota;nama_provinsi;type;lat;lng;tanggal;diff_day;diff_hour;diff_minute;klasifikasi
STA0150;ARG Tanah Putih;Kab. Rokan Hilir;Riau;arg;15.586.775;1.010.003.386;2026-10-29 04:10:00+00;0;0;8;1
STA3202;AAWS Tambang Kampar;Kab. Kampar;Riau;aaws;0.40751419;10.121.727.325;2026-10-29 04:00:00+00;0;0;18;1
STA2176;AWS Pekan Arba Indragiri Hilir;Kab. Indragri Hilir;Riau;aws;-0.297028;10.313.228;2026-10-29 04:10:00+00;0;0;8;1
STW1145;AWS Bukit Raya Pekanbaru;Kota Pekanbaru;Riau;aws;0.47019412;10.145.804.555;2026-10-29 04:10:00+00;0;0;8;1
STA0155;ARG XIII Koto Kampar;Kab. Kampar;Riau;arg;0.317775;100.735.327;2026-10-29 04:00:00+00;0;0;18;1
STA0152;ARG Siak;Kab. Siak;Riau;arg;0.814548;102.021.211;2026-10-29 04:10:00+00;0;0;8;1
STA0207;ARG Tebing Tinggi;Kab. Kep. Meranti;Riau;arg;1.007.886;102.716.065;2026-10-29 04:10:00+00;0;0;8;1
STA3259;ARG SMPK Bunga Raya;Kab. Siak;Riau;arg;0.960321;102.072.948;2026-10-29 04:00:00+00;0;0;18;1
150118;ARG Pusako;Kab. Siak;Riau;arg;1.017.705;102.116.015;2026-10-29 04:09:00+00;0;0;9;1
STA0202;ARG Bukit Batu;Kab. Bengkalis;Riau;arg;1.364.224;102.154.964;2026-10-29 04:00:00+00;0;0;18;1
STW1054;AWS Bandar Laksamana Bengkalis;Kab. Bengkalis;Riau;aws;1.594.608;101.817.134;2026-10-29 04:10:00+00;0;0;8;1
STA0154;ARG Pasir Pangaraian;Kab. Rokan Hulu;Riau;arg;0.896111;1.003.039;2026-10-29 04:10:00+00;0;0;8;1
150119;ARG Tandun;Kab. Rokan Hulu;Riau;arg;0.611507;10.055.404;2026-10-29 04:10:00+00;0;0;8;1
150120;ARG Tambusai;Kab. Rokan Hulu;Riau;arg;1.056.944;1.002.611;2026-10-29 04:00:00+00;0;0;18;1
STA0174;ARG Teluk Meranti;Kab. Pelalawan;Riau;arg;0.149333;1.025.604;2026-10-29 04:10:00+00;0;0;8;1
50015;Iklim Mikro Stasiun Klimatologi Riau;Kab. Kampar;Riau;iklimmikro;0.40751419;10.121.727.325;2026-10-28 12:00:00+00;0;16;18;1
STM1026;Soil Moisture Stasiun Klimatologi Riau;Kab. Kampar;Riau;soil;0.4072100;1.012.169.890;2026-10-28 12:10:00+00;0;16;8;1
STA6024;ASRS Stasiun Klimatologi Riau;Kab. Kampar;Riau;asrs;0.40751419;10.121.727.325;2026-10-29 04:10:00+00;0;0;8;1
STW1032;AWS Mesonetwork Rokan Hulu;Kab. Rokan Hulu;Riau;aws;0.841434;1.003.375;2026-10-29 04:02:00+00;0;0;16;1
STA0151;ARG Bantan;Kab. Bengkalis;Riau;arg;1.499.444;1.021.459;2026-10-29 04:10:00+00;0;0;8;1
150116;ARG Kuala Kampar;Kab. Pelalawan;Riau;arg;0.531027;1.032.677;2026-10-29 04:10:00+00;0;0;8;1
STAL041;ARG BPP Rumbai Timur;Kota Pekanbaru;Riau;arg;0.566667;101.46;2026-10-28 14:20:00+00;0;13;58;1
150117;ARG Minas;Kab. Siak;Riau;arg;0.699143;101.438.512;2026-10-29 04:10:00+00;0;0;8;1
STA0205;ARG Rokan IV Koto;Kab. Rokan Hilir;Riau;arg;0.571355;100.427.113;2026-10-29 04:10:00+00;0;0;8;1
STA0133;ARG Kandis;Kab. Siak;Riau;arg;0.8896927;1.012.369.606;2026-10-29 04:00:00+00;0;0;18;1
STA0201;ARG SMPK Bangkinang;Kab. Kampar;Riau;arg;0.3263260;1.010.395.580;2026-10-29 04:10:00+00;0;0;8;1
STA0153;ARG Kuantan Tengah;Kab. Kuantan Singingi;Riau;arg;-0.540839;101.554.764;2026-10-29 04:10:00+00;0;0;8;1
AAWS0356;AAWS Gunung Toar Kuantan Singingi;Kab. Kuantan Singingi;Riau;aaws;-0.598066;10.148.648;2026-10-29 04:00:00+00;0;0;18;1
STW1037;AWS  Mesonetwork  Kampar;Kab. Kampar;Riau;aws;0.614;1.009.734;2026-10-23 11:17:00+00;5;17;1;1
STA0209;ARG Dumai Timur;Kota Dumai;Riau;arg;1.669.771;101.459.353;2026-10-29 04:10:00+00;0;0;8;1
STA0208;ARG Batang Cenaku;Kab. Indragiri Hulu;Riau;arg;-0.663637;102.278.824;2026-10-29 04:10:00+00;0;0;8;1
STA5021;AWS Digi Stamet Pekanbaru;Kota Pekanbaru;Riau;aws;0.460830;101.444.000;2026-10-29 04:10:00+00;0;0;8;1
STA3203;AAWS Rimba Melintang Rokan Hilir;Kab. Rokan Hilir;Riau;aaws;184.561.319;10.097.833.333;2026-10-29 03:56:00+00;0;0;22;1
STA0206;ARG Tembilahan;Kab. Indragri Hilir;Riau;arg;-0.324388;103.157.754;2026-10-29 04:10:00+00;0;0;8;1
STAL042;ARG BPP Kampar Kiri;Kab. Kampar;Riau;arg;0.047210;101.204.541;2026-10-29 04:10:00+00;0;0;8;1"""

def clean_coord(val, is_lng=False):
    val = val.strip()
    is_neg = val.startswith('-')
    digits = val.replace('-', '').replace('.', '')
    if is_lng:
        if len(digits) >= 3:
            deg = digits[:3]
            dec = digits[3:]
            f = float(f'{deg}.{dec}')
            return -f if is_neg else f
    else:
        if digits.startswith('0'):
            f = float(f'0.{digits[1:]}')
        else:
            deg = digits[0]
            dec = digits[1:]
            f = float(f'{deg}.{dec}')
        return -f if is_neg else f

aws_stations = []
lines = raw_aws.strip().split('\n')[1:] # skip header
for line in lines:
    p = line.split(';')
    sid, name, kota, prov, tipe, lat_s, lng_s, tgl, d_d, d_h, d_m, klas = p
    lat = round(clean_coord(lat_s, False), 6)
    lng = round(clean_coord(lng_s, True), 6)
    
    # Normalize type name: iklimmikro -> ikro
    norm_type = tipe.lower().strip()
    if norm_type == 'iklimmikro':
        norm_type = 'ikro'
        
    diff_minutes_total = int(d_d) * 1440 + int(d_h) * 60 + int(d_m)
    
    aws_stations.append({
        "id_station": sid,
        "name_station": name.strip(),
        "nama_kota": kota.strip(),
        "nama_provinsi": prov.strip(),
        "type": norm_type,
        "lat": lat,
        "lng": lng,
        "tanggal": tgl.strip(),
        "diff_day": int(d_d),
        "diff_hour": int(d_h),
        "diff_minute": int(d_m),
        "diff_minutes_total": diff_minutes_total,
        "klasifikasi": klas.strip()
    })

with open('data/aws_riau.json', 'w', encoding='utf-8') as f:
    json.dump(aws_stations, f, indent=2, ensure_ascii=False)
print(f"SUCCESS: data/aws_riau.json written with {len(aws_stations)} stations")


# 2. User provided SLMON Bali Dataset (Geofisika)
raw_slmon = """network;station;province;location;digitizer_type;upt;last_data;data_latency;color
IA;BKNI;Riau;Bangkinang;Kinemetrics-Q330-2016-GSM;Stageof-Padang-Panjang;29/10/2026 03:55;5s;green
IA;GTSI;Riau;GunungToar,KuantanSingingi;Nanometrics-Centaur-2019-GSM;Stageof-Padang-Panjang;27/10/2026 23:49;1d 0h;black
IA;IHRSI;Riau;IndragiriHilir;GuralpMinimus+2021-GSM;Stageof-Padang-Panjang;29/10/2026 03:55;8s;green
IA;PRSI;Riau;Pelalawan,Riau;Guralp-Minimus+2021-Idirect;Stageof-Padang-Panjang;29/10/2026 03:55;9s;green
IA;RGRI;Riau;Rengat;Nanometrics-Centaur-2019-GSM;Stageof-Padang-Panjang;29/10/2026 03:55;2s;green
IA;RHRSI;Riau;Rokan-Hilir,Riau;Guralp-Minimus-2021-Idirect;Stageof-Padang-Panjang;29/10/2026 03:54;1m 0s;orange
IA;RRHRI;Riau;Rokan-IV-Kota,Rokan-Hulu;Nanometrics-Centaur-2022-Idirect;Stageof-Padang-Pajang;29/10/2026 03:53;2m 0s;orange
IA;RRSI;Riau;Rambah,Rokan-Hulu;Nanometrics-Centaur-2019-GSM;Stageof-Padang-Panjang;29/10/2026 03:55;4s;green
IA;SIRSI;Riau;Siak,Riau;Guralp-Minimus-2021-Idirect;Stageof-Padang-Panjang;29/10/2026 03:55;7s;green"""

slmon_stations = []
slmon_lines = raw_slmon.strip().split('\n')[1:]
for line in slmon_lines:
    net, sta, prov, loc, dig, upt, last_d, lat_d, col = line.split(';')
    slmon_stations.append({
        "network": net,
        "station": sta,
        "province": prov,
        "location": loc,
        "digitizer_type": dig,
        "upt": upt,
        "last_data": last_d,
        "data_latency": lat_d,
        "color": col
    })

with open('data/slmon_riau.json', 'w', encoding='utf-8') as f:
    json.dump(slmon_stations, f, indent=2, ensure_ascii=False)
print(f"SUCCESS: data/slmon_riau.json written with {len(slmon_stations)} stations")


# 3. Update data/geofisika_riau.json with SLMON Bali metadata
with open('data/geofisika_riau.json', 'r', encoding='utf-8') as f:
    geo = json.load(f)

slmon_map = {x['station']: x for x in slmon_stations}

for s in geo:
    k = s.get('kode_sta')
    if k in slmon_map:
        m = slmon_map[k]
        s['slmon_latency'] = m['data_latency']
        s['slmon_color'] = m['color']
        s['slmon_last_data'] = m['last_data']
        s['slmon_upt'] = m['upt']
        # If black / 1d 0h, status is Offline
        if m['color'] == 'black' or 'd' in m['data_latency']:
            s['status'] = 'Offline'
        else:
            s['status'] = 'Online'

with open('data/geofisika_riau.json', 'w', encoding='utf-8') as f:
    json.dump(geo, f, indent=2, ensure_ascii=False)
print("SUCCESS: data/geofisika_riau.json updated with SLMON Bali live data")
