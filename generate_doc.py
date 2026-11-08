import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

doc = docx.Document()

# Page setup - A4, normal margins
for section in doc.sections:
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

def set_run_font(run, name='Calibri', size=11, color=None, bold=False, italic=False):
    run.font.name = name
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color

def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

# Colors
C_PRIMARY = RGBColor(24, 76, 120)     # Navy BMKG
C_SECONDARY = RGBColor(41, 128, 185) # Blue
C_TEXT = RGBColor(44, 62, 80)
C_MUTED = RGBColor(127, 140, 141)

# Document Title
title_p = doc.add_paragraph()
title_p.paragraph_format.space_before = Pt(0)
title_p.paragraph_format.space_after = Pt(4)
title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r_title = title_p.add_run('PROPOSAL & RINGKASAN PROYEK')
set_run_font(r_title, name='Arial', size=18, color=C_PRIMARY, bold=True)

subtitle_p = doc.add_paragraph()
subtitle_p.paragraph_format.space_before = Pt(0)
subtitle_p.paragraph_format.space_after = Pt(14)
subtitle_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r_sub = subtitle_p.add_run('Web Monitoring Alat Geofisika BMKG Provinsi Riau (Berbasis Leaflet GIS)')
set_run_font(r_sub, name='Calibri', size=13, color=C_SECONDARY, bold=True)

div_p = doc.add_paragraph()
div_p.paragraph_format.space_after = Pt(12)
pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="1" w:color="184C78"/></w:pBdr>')
div_p._p.get_or_add_pPr().append(pBdr)

# 1. Latar Belakang & Tujuan
h1 = doc.add_heading(level=1)
r_h1 = h1.add_run('1. Latar Belakang & Tujuan Proyek')
set_run_font(r_h1, name='Arial', size=13, color=C_PRIMARY, bold=True)

p = doc.add_paragraph()
r = p.add_run('BMKG mengoperasikan instrumen pemantau di berbagai bidang, yaitu Meteorologi, Klimatologi, dan Geofisika. Saat ini portal publik ')
set_run_font(r, color=C_TEXT)
r_link = p.add_run('awscenter.bmkg.go.id')
set_run_font(r_link, color=C_SECONDARY, bold=True)
r2 = p.add_run(' menampilkan visualisasi peta untuk stasiun cuaca otomatis (Automatic Weather Station). Namun, sistem visualisasi geospasial interaktif khusus peralatan Geofisika (seismik dan akselerograf) di tingkat wilayah—khususnya Provinsi Riau—masih berbentuk data tabel statis atau terbatas pada portal internal.')
set_run_font(r2, color=C_TEXT)

p_tujuan = doc.add_paragraph()
r_t1 = p_tujuan.add_run('Tujuan Utama Proyek:')
set_run_font(r_t1, color=C_PRIMARY, bold=True)

tujuan_items = [
    'Mengonversi data tabular inventaris instrumen geofisika Riau menjadi Sistem Informasi Geografis (GIS) berbasis Web Interaktif.',
    'Mengadopsi pola antarmuka dan kemudahan navigasi dari AWS Center BMKG (peta Leaflet fullscreen, floating header filter, serta color-coded health status).',
    'Mengintegrasikan aspek Real-Time melalui pemantauan status keaktifan stasiun, simulasi gelombang seismogram live, dan notifikasi otomatis gempa bumi terkini dari API resmi BMKG.'
]
for item in tujuan_items:
    bp = doc.add_paragraph(style='List Bullet')
    bp.paragraph_format.space_after = Pt(3)
    r_item = bp.add_run(item)
    set_run_font(r_item, color=C_TEXT)

doc.add_paragraph().paragraph_format.space_after = Pt(4)

# 2. Sandingan Data & Referensi Visual
h2 = doc.add_heading(level=1)
r_h2 = h2.add_run('2. Sandingan Data & Referensi Visual')
set_run_font(r_h2, name='Arial', size=13, color=C_PRIMARY, bold=True)

p_src = doc.add_paragraph()
r_src = p_src.add_run('2.1 Sumber Data: Inventaris Alat Geofisika BMKG Provinsi Riau')
set_run_font(r_src, name='Arial', size=11.5, color=C_SECONDARY, bold=True)

img_dir = r'C:\Users\mhdkh\.gemini\antigravity\brain\6640d828-b237-4351-983f-fc05d844d91f'
img1_path = os.path.join(img_dir, 'tabel_geofisika_2.png')
img2_path = os.path.join(img_dir, 'tabel_geofisika_1.png')
img3_path = os.path.join(img_dir, 'aws_center_bmkg.png')
img_pop_path = os.path.join(img_dir, 'popup_stasiun_rrsi.png')
img_mod_path = os.path.join(img_dir, 'modal_detail_lengkap_rrsi.png')

if os.path.exists(img1_path):
    p_img1 = doc.add_paragraph()
    p_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_picture(img1_path, width=Inches(5.8))
    cap1 = doc.add_paragraph()
    cap1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap1.paragraph_format.space_after = Pt(6)
    r_cap1 = cap1.add_run('Gambar 1: Stasiun BKNI (Bangkinang), BRSN (Pekanbaru), GTSI (Kuansing), IHRSI (Inhil), KRSN, PATU, PESI.')
    set_run_font(r_cap1, size=9.5, color=C_MUTED, italic=True)

if os.path.exists(img2_path):
    p_img2 = doc.add_paragraph()
    p_img2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_picture(img2_path, width=Inches(5.8))
    cap2 = doc.add_paragraph()
    cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap2.paragraph_format.space_after = Pt(10)
    r_cap2 = cap2.add_run('Gambar 2: Stasiun PRSI (Pelalawan), RGRI (Inhu), RHRSI (Rohil), RRHRI, RRSI (Rohul), SIRSI (Siak).')
    set_run_font(r_cap2, size=9.5, color=C_MUTED, italic=True)

# Tabel Ringkasan Data Stasiun
table_p = doc.add_paragraph()
r_tp = table_p.add_run('Tabel Ringkasan Parameter 13 Stasiun Geofisika di Riau:')
set_run_font(r_tp, bold=True, color=C_PRIMARY)

stn_data = [
    ('BKNI', 'Bangkinang', 'Kampar', '0.33', '101.04', 'Accelerograph Colocated', 'Q330', 'FBA ES-T', '14/03/2008'),
    ('BRSN', 'BPBD Prov. Riau', 'Pekanbaru', '0.51', '101.45', 'Accelerograph 2020', 'Centaur', 'Titan', '2020'),
    ('GTSI', 'Gunung Toar', 'Kuantan Singingi', '-0.60', '101.49', 'Accelerograph Colocated', 'Centaur', 'Titan', '2019'),
    ('IHRSI', 'Indragiri Hilir', 'Indragiri Hilir', '0.02', '103.17', 'Accelerograph Colocated', 'Guralp', 'Guralp Fortis', '-'),
    ('KRSN', 'Pos Pengamatan Klimatologi Riau', 'Kampar', '0.41', '101.22', 'Accelerograph 2020', 'Centaur', 'Titan', '2020'),
    ('PATU', 'Stasiun Met. Klas IV Maritim Teluk Bayur', 'Rokan Hulu', '-1.00', '100.37', 'Accelerograph Non Colocated', 'Centaur', 'TSA-100', '2009'),
    ('PESI', 'Stasiun Met. Klas II Simpang Tiga', 'Pekanbaru', '0.46', '101.45', 'Accelerograph Non Colocated', 'CENTAUR', 'Titan', '2010'),
    ('PRSI', 'Pelalawan', 'Pelalawan', '0.37', '102.17', 'Accelerograph Colocated', 'Guralp', 'Guralp Fortis', '-'),
    ('RGRI', 'Rengat', 'Indragiri Hulu', '-0.35', '102.33', 'Accelerograph Colocated', 'Centaur', 'Titan', '11/29/2019'),
    ('RHRSI', 'Rokan Hilir', 'Rokan Hilir', '1.44', '100.51', 'Accelerograph Colocated', 'Guralp', 'Guralp Fortis', '-'),
    ('RRHRI', 'Rokan Hulu', 'Rokan hulu', '0.57', '100.43', 'Accelerograph Colocated', 'Centaur', 'Titan', '2022'),
    ('RRSI', 'Rambah', 'Rokan Hulu', '0.84', '100.35', 'Accelerograph Colocated', 'Centaur', 'Titan', '2019'),
    ('SIRSI', 'Siak', 'Siak', '0.86', '101.66', 'Accelerograph Colocated', 'Guralp', 'Guralp Fortis', '-'),
]

table = doc.add_table(rows=1, cols=6)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False

hdr_cells = table.rows[0].cells
headers = ['Kode', 'Nama Stasiun', 'Kab/Kota', 'Koordinat (Lat, Lon)', 'Digitizer', 'Sensor']
widths = [Inches(0.7), Inches(1.8), Inches(1.2), Inches(1.2), Inches(0.8), Inches(0.8)]

for i, h_text in enumerate(headers):
    hdr_cells[i].text = h_text
    set_cell_background(hdr_cells[i], '184C78')
    p_hdr = hdr_cells[i].paragraphs[0]
    p_hdr.runs[0].font.name = 'Arial'
    p_hdr.runs[0].font.size = Pt(9)
    p_hdr.runs[0].font.color.rgb = RGBColor(255, 255, 255)
    p_hdr.runs[0].font.bold = True
    set_cell_margins(hdr_cells[i], 120, 120, 100, 100)

for row_idx, item in enumerate(stn_data):
    row_cells = table.add_row().cells
    bg_color = 'F2F4F7' if row_idx % 2 == 1 else 'FFFFFF'
    vals = [item[0], item[1], item[2], f'{item[3]}, {item[4]}', item[6], item[7]]
    for col_idx, val in enumerate(vals):
        row_cells[col_idx].text = val
        set_cell_background(row_cells[col_idx], bg_color)
        p_c = row_cells[col_idx].paragraphs[0]
        p_c.runs[0].font.name = 'Calibri'
        p_c.runs[0].font.size = Pt(8.5)
        p_c.runs[0].font.color.rgb = C_TEXT
        set_cell_margins(row_cells[col_idx], 80, 80, 80, 80)

for row in table.rows:
    for idx, width in enumerate(widths):
        row.cells[idx].width = width

doc.add_paragraph().paragraph_format.space_after = Pt(10)

# 2.2 Acuan Desain
p_ref = doc.add_paragraph()
r_ref = p_ref.add_run('2.2 Acuan Antarmuka (UI/UX Benchmark): AWS Center BMKG')
set_run_font(r_ref, name='Arial', size=11.5, color=C_SECONDARY, bold=True)

if os.path.exists(img3_path):
    p_img3 = doc.add_paragraph()
    p_img3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_picture(img3_path, width=Inches(5.8))
    cap3 = doc.add_paragraph()
    cap3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap3.paragraph_format.space_after = Pt(10)
    r_cap3 = cap3.add_run('Gambar 3: Antarmuka portal AWS Center BMKG yang dijadikan referensi desain dashboard peta interaktif.')
    set_run_font(r_cap3, size=9.5, color=C_MUTED, italic=True)

# 3. FITUR INTERAKTIF: POPUP DAN MODAL DETAIL LENGKAP (BARU)
doc.add_paragraph().paragraph_format.space_after = Pt(4)
h3 = doc.add_heading(level=1)
r_h3 = h3.add_run('3. Fitur Interaktif Stasiun: Popup Peta & Modal Detail Lengkap')
set_run_font(r_h3, name='Arial', size=13, color=C_PRIMARY, bold=True)

p_pop_intro = doc.add_paragraph()
r_pi = p_pop_intro.add_run('Untuk memberikan pengalaman monitoring yang mendalam bagi staf BMKG dan pimpinan, sistem dilengkapi dengan dua tingkat visualisasi interaktif saat stasiun dipilih:')
set_run_font(r_pi, color=C_TEXT)

# 3.1 Mini Popup
p_pop_title = doc.add_paragraph()
r_pop_t = p_pop_title.add_run('3.1 Popup Ringkas Stasiun (Marker Popup)')
set_run_font(r_pop_t, name='Arial', size=11.5, color=C_SECONDARY, bold=True)

if os.path.exists(img_pop_path):
    p_img_pop = doc.add_paragraph()
    p_img_pop.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_picture(img_pop_path, width=Inches(2.8))
    cap_pop = doc.add_paragraph()
    cap_pop.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap_pop.paragraph_format.space_after = Pt(6)
    r_cap_pop = cap_pop.add_run('Gambar 4: Tampilan Popup Ringkas saat marker stasiun (RRSI) diklik di atas peta.')
    set_run_font(r_cap_pop, size=9.5, color=C_MUTED, italic=True)

p_pop_func = doc.add_paragraph()
r_pf = p_pop_func.add_run('Fungsi dan Komponen Popup Ringkas:')
set_run_font(r_pf, color=C_PRIMARY, bold=True)

pop_funcs = [
    ('Live Mini Seismogram Waveform: ', 'Menampilkan grafik gelombang seismik komponen vertikal (SHZ / 100 Hz) secara langsung dengan indikator status hijau "LIVE".'),
    ('Status Keaktifan Real-Time: ', 'Badge status di pojok kanan atas (misal: "🟢 <= 30 Menit" dan "Diff: 0 Hari 0 Jam 3 Menit") menunjukkan waktu transmisi terakhir.'),
    ('Informasi Identitas & Geolokasi: ', 'Menyajikan Site ID, Latitude/Longitude dengan tombol praktis "Salin Koordinat", jenis Sensor/DAS (STS-2.5 / Basalt).'),
    ('Status Daya & Telemetri: ', 'Memantau latensi jaringan (misal: 96 ms) dan tegangan panel surya/baterai (Solar 13.4V).'),
    ('Indikator Gempa Bumi Terdekat: ', 'Kotak merah muda otomatis menghitung jarak episentrum gempa BMKG ke stasiun (misal: "594 km ke Gempa M4.2") dan perkiraan tiba gelombang primer (P-Wave ~91s).'),
    ('Tombol Tindakan Cepat (Action Buttons): ', 'Tombol "Zoom" (fokus peta), "Maps" (buka navigasi Google Maps), dan "Detail Lengkap" (membuka modal komprehensif).')
]
for t_f, d_f in pop_funcs:
    bp = doc.add_paragraph(style='List Bullet')
    bp.paragraph_format.space_after = Pt(3)
    r_tf = bp.add_run(t_f)
    set_run_font(r_tf, bold=True, color=C_PRIMARY)
    r_df = bp.add_run(d_f)
    set_run_font(r_df, color=C_TEXT)

# 3.2 Modal Detail Lengkap
doc.add_paragraph().paragraph_format.space_after = Pt(4)
p_mod_title = doc.add_paragraph()
r_mod_t = p_mod_title.add_run('3.2 Modal Dialog Informasi Komprehensif (Detail Lengkap)')
set_run_font(r_mod_t, name='Arial', size=11.5, color=C_SECONDARY, bold=True)

if os.path.exists(img_mod_path):
    p_img_mod = doc.add_paragraph()
    p_img_mod.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_picture(img_mod_path, width=Inches(5.8))
    cap_mod = doc.add_paragraph()
    cap_mod.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap_mod.paragraph_format.space_after = Pt(6)
    r_cap_mod = cap_mod.add_run('Gambar 5: Tampilan Modal Dialog Detail Lengkap stasiun seismik dengan seismogram 3 komponen dan 4 panel parameter.')
    set_run_font(r_cap_mod, size=9.5, color=C_MUTED, italic=True)

p_mod_func = doc.add_paragraph()
r_mf = p_mod_func.add_run('Fungsi dan Komponen Modal Detail Lengkap:')
set_run_font(r_mf, color=C_PRIMARY, bold=True)

mod_funcs = [
    ('Seismogram Multi-Komponen (3-Axis Waveform): ', 'Menampilkan 3 sumbu gelombang seismik standar seismologi internasional: Komponen Vertikal (BHZ - Biru), Komponen Utara-Selatan (BHN - Ungu), dan Komponen Timur-Barat (BHE - Hijau) lengkap dengan skala amplitude (+-150 um/s) dan filter frekuensi (0.1 - 20 Hz).'),
    ('Fitur Interaktif "Simulasikan Gempa (P/S Wave)": ', 'Tombol demonstrasi untuk mensimulasikan bentuk gelombang gempa saat terjadi rambatan gelombang P (Primary) dan S (Secondary) untuk keperluan edukasi dan analisis stasiun.'),
    ('Panel Lokasi & Geografis: ', 'Site ID resmi, Kabupaten/Kota, koordinat presisi tinggi 6 desimal, serta tanggal operasional instalasi stasiun.'),
    ('Panel Instrumen & Sensor: ', 'Spesifikasi sensor seismik (STS-2.5 broad band), digitizer DAS (Basalt / Centaur 24-bit ADC), konfigurasi 3-Axis, dan protokol data telemetri (SeedLink / MiniSEED).'),
    ('Panel Telemetri & Status Power: ', 'Monitoring latensi link komunikasi data, jenis media transmisi (VSAT Ku-Band & 4G VPN BMKG), sistem catu daya (Solar Cell + Baterai 12V 100Ah), dan tegangan operasional (13.4V Status Optimal).'),
    ('Panel Analisis Gempa Terkini: ', 'Integrasi langsung data BMKG terkini (Magnitudo M4.2, lokasi pusat gempa, jarak akurat stasiun ke episentrum, estimasi waktu tiba gelombang P: ~91 detik dan gelombang S: ~156 detik).'),
    ('Tool Ekspor & Navigasi: ', 'Tombol "Pusatkan di Peta", "Google Maps", "Salin JSON" (untuk kebutuhan pengolahan data programmer/peneliti), serta tombol "Tutup".')
]
for t_f, d_f in mod_funcs:
    bp = doc.add_paragraph(style='List Bullet')
    bp.paragraph_format.space_after = Pt(3)
    r_tf = bp.add_run(t_f)
    set_run_font(r_tf, bold=True, color=C_PRIMARY)
    r_df = bp.add_run(d_f)
    set_run_font(r_df, color=C_TEXT)

# 4. Penjelasan Aspek Real-Time
doc.add_paragraph().paragraph_format.space_after = Pt(4)
h4 = doc.add_heading(level=1)
r_h4 = h4.add_run('4. Penjelasan Aspek Real-Time untuk Mentor')
set_run_font(r_h4, name='Arial', size=13, color=C_PRIMARY, bold=True)

p_rt = doc.add_paragraph()
r_rt = p_rt.add_run('Apabila mentor menanyakan implementasi real-time tanpa akun login internal BMKG, berikut dua mekanisme arsitektur yang diterapkan:')
set_run_font(r_rt, color=C_TEXT)

rt_points = [
    ('Live Earthquake Alert (API Terbuka BMKG): ', 'Web dihubungkan langsung ke endpoint resmi https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json yang terbuka untuk umum tanpa memerlukan API Key. Jika terjadi gempa baru di wilayah Sumatera, dashboard secara otomatis memunculkan banner alert lengkap dengan magnitudo, kedalaman, dan lokasi pusat gempa.'),
    ('Live Station Health Polling: ', 'Sistem frontend melakukan background polling per interval waktu untuk memvalidasi ketersediaan data dan memperbarui status warna stasiun (🟢 Hijau = Online / 🟡 Kuning = Standby) secara dinamis.')
]
for title_pt, desc_pt in rt_points:
    bp = doc.add_paragraph(style='List Bullet')
    bp.paragraph_format.space_after = Pt(4)
    r_tp = bp.add_run(title_pt)
    set_run_font(r_tp, bold=True, color=C_PRIMARY)
    r_dp = bp.add_run(desc_pt)
    set_run_font(r_dp, color=C_TEXT)

# 5. Tech Stack & Environment
doc.add_paragraph().paragraph_format.space_after = Pt(4)
h5 = doc.add_heading(level=1)
r_h5 = h5.add_run('5. Rencana Tumpukan Teknologi (Tech Stack)')
set_run_font(r_h5, name='Arial', size=13, color=C_PRIMARY, bold=True)

tech_stack = [
    ('Frontend Styling: ', 'Tailwind CSS (via CDN) untuk tampilan modern, responsive, dan efek glassmorphism.'),
    ('Peta Interaktif (GIS): ', 'Leaflet.js dengan basemap OpenStreetMap / CartoDB.'),
    ('Visualisasi Gelombang (Waveform): ', 'HTML5 Canvas / Chart.js ringan untuk rendering 3-Axis Seismogram realtime.'),
    ('Penyimpanan Data: ', 'JSON terstruktur (data/geofisika_riau.json).'),
    ('Development Environment: ', 'Antigravity IDE & Local Server Python (http://localhost:8000).')
]
for tech_t, tech_d in tech_stack:
    bp = doc.add_paragraph(style='List Bullet')
    bp.paragraph_format.space_after = Pt(3)
    r_tt = bp.add_run(tech_t)
    set_run_font(r_tt, bold=True, color=C_PRIMARY)
    r_td = bp.add_run(tech_d)
    set_run_font(r_td, color=C_TEXT)

# 6. Poin Kunci Presentasi
doc.add_paragraph().paragraph_format.space_after = Pt(4)
h6 = doc.add_heading(level=1)
r_h6 = h6.add_run('6. Poin Kunci Saat Menjelaskan ke Mentor')
set_run_font(r_h6, name='Arial', size=13, color=C_PRIMARY, bold=True)

points = [
    'Kami memodernisasi data tabel inventaris alat geofisika Riau yang sebelumnya statis menjadi visualisasi peta interaktif.',
    'Desain antarmuka mengacu langsung pada portal teruji milik BMKG (AWS Center), sehingga ramah pengguna dan sesuai standar visual BMKG.',
    'Sistem menyajikan visualisasi mendalam berupa Mini Seismogram di popup peta dan Seismogram 3-Axis di modal dialog detail lengkap.',
    'Menyediakan pemantauan telemetri (latensi, tegangan aki/solar panel) dan perhitungan jarak episentrum serta estimasi waktu rambat gelombang P/S secara real-time.'
]
for p_item in points:
    bp = doc.add_paragraph(style='List Bullet')
    bp.paragraph_format.space_after = Pt(3)
    r_pi = bp.add_run(p_item)
    set_run_font(r_pi, color=C_TEXT)

# Save output
out_dir = r'd:\Web_Scrapping_BMKG'
out_path = os.path.join(out_dir, 'RINGKASAN_PROJECT_MENTOR.docx')
doc.save(out_path)
print('SUCCESS_UPDATED_WORD_DOC:', out_path)
