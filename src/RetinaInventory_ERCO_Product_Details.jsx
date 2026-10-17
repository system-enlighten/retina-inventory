import React, { useState, useMemo, useEffect, useCallback } from "react";

// Safe browser-only storage for the frontend preview.
const safeLS = {
  get(key, fallback = null) {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn(e); }
  },
};


/* ============================================================
   RETINA INVENTORY — check-in / check-out, quick-commerce style
   ------------------------------------------------------------
   Product code:  D{housing}{variant}.{LED}.{driver}   e.g. D1a.1.1
   0 means "none"  e.g. D0.0.106 = driver 106 only, D223.32.0 = housing 223 + LED 32
   Old sale-log style codes (D.0.0.106, D.223.32) are converted automatically.

   Data: the lists below are embedded (from your CSV exports) until you paste an
   Apps Script URL in CONFIG.SCRIPT_URL — then it reads the live sheets.
   ============================================================ */

/* ---- Data from Database V2 (housing rows with no name and LED rows with #REF! are excluded) ---- */
const HOUSINGS=[{"n":1,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CR.3S","beam":"15° | 24° | 36°","mount":"Ceiling Recessed","aim":"Adjustable","ip":"IP44","dim":"Diameter: 63 · Opening: 55 · Height: 82","shape":"Circular","heat":"10W","ri":"Remote","type":"CKD | Import","adp":"1304/020/1507","sup":{"I.013.CN":"OG-TH-239-10W"}},{"n":2,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CR.3S","beam":"24°","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP44","dim":"Diameter: 80 · Opening: 70 · Height: 60","shape":"Circular","heat":"12W","ri":"Remote","type":"CKD | Local Purchase","adp":"1304/020/1507","sup":{"L.003.DEL":"COBREF12"}},{"n":3,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CR.6S","beam":"12°","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP44","dim":"Size: 131X131 · Opening: 125X125","shape":"Square","heat":"36W","ri":"Remote","type":"CKD Purchase | Import","adp":"SMD 5050","sup":{"I.013.CN":"XTD2-9"}},{"n":4,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CR.3S","beam":"24°","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP44","dim":"Diameter: 61 · Opening: 55 · Height: 62","heat":"7W","ri":"Remote","type":"Finished | Local Purchase","adp":"1304","sup":{"L.011.BOM":"EN-CB40-07"}},{"n":5,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CR.3S","beam":"24°","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP44","dim":"Diameter: 81 · Opening: 75 · Height: 78","heat":"12W","ri":"Remote","type":"Finished | Local Purchase","adp":"1507","sup":{"L.011.BOM":"EN-CB40-12"}},{"n":6,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CR.3S","beam":"24°","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP54","dim":"Diameter: 100 · Opening: 90 · Height: 75","heat":"Upto 10W","ri":"Remote","type":"CKD Purchase | Import","adp":"1507","sup":{"L.011.BOM":"EN-CB30"}},{"n":7,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CR.3S","beam":"24°","mount":"Ceiling Recessed","aim":"Adjustable","ip":"IP20","dim":"Diameter: 65 · Opening: 55 · Height: 78","heat":"7W","ri":"Remote","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-CB15"}},{"n":8,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CR.3S","beam":"24°","mount":"Ceiling Recessed","aim":"Adjustable","ip":"IP20","dim":"Diameter: 83 · Opening: 75 · Height: 88","heat":"12W","ri":"Remote","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-CB15"}},{"n":9,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CR.6S","beam":"24°","mount":"Ceiling Recessed","aim":"Adjustable","ip":"IP20","dim":"Diameter: 105 · Opening: 95 · Height: 100","heat":"18W","ri":"Remote","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-CB15"}},{"n":10,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CR.3S","beam":"14° - 32° [Zoomable]","mount":"Ceiling Recessed","aim":"Adjustable","ip":"IP44","dim":"Diameter: 83 · Opening: 75 · Height: 98","heat":"12W","ri":"Remote","type":"CKD Purchase | Import","adp":"020/1507","sup":{"I.013.CN":"OG-TH-201-3W-A"}},{"n":11,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CS.3S","beam":"24°","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","dim":"Diameter: 58 · Height: 75","heat":"7W","ri":"Inbuilt","type":"Finished | Local Purchase","sup":{"I.014.CN":"ND-0053F","L.003.DEL":"COBSMREF07"}},{"n":12,"b":"Glare Free","c":"India","name":"Floor Highlighter","fam":"D1CS.3S","beam":"24°","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","dim":"Diameter: 72 · Height: 90","heat":"12W","ri":"Inbuilt","type":"Finished | Local Purchase"},{"n":14,"b":"Retina","c":"India","name":"Floor Highlighter [Adjustable]","fam":"D1CR.3S","beam":"15° | 24° | 36°","mount":"Ceiling Recessed","aim":"Adjustable","heat":"12W","ri":"Remote","type":"CKD | Import","adp":"200mA"},{"n":15,"b":"Glare Free","c":"India","name":"Floor Highlighter [Fixed]","fam":"D1CT.3S","mount":"Ceiling Track","aim":"Fixed","dim":"Length: 112mm","heat":"6W","ri":"Inbuilt","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-MGLL-06","I.015.CN":"M20-LV-6W"}},{"n":16,"b":"Glare Free","c":"India","name":"Floor Highlighter [Adjustable]","fam":"D1CT.3S","mount":"Ceiling Track","aim":"Fixed","dim":"Length: 220mm","heat":"12W","ri":"Inbuilt","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-MGLL-12","I.015.CN":"M20-LV-12W"}},{"n":17,"b":"Glare Free","c":"India","name":"Floor Highlighter [Adjustable]","fam":"D+1CT.3S","mount":"Ceiling Track","aim":"Adjustable","ip":"IP20","dim":"Lenght:112mm · Width: 22mm · Height: 110mm","heat":"12W","ri":"Inbuilt","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-MGLLT-06","I.015.CN":"M20-LBF2-6W"}},{"n":18,"b":"Glare Free","c":"India","name":"Floor Highlighter [Adjustable]","fam":"D+1CT.3S","mount":"Ceiling Track","aim":"Adjustable","heat":"12W","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-MGLLR"}},{"n":19,"b":"Glare Free","c":"India","name":"Floor Highlighter","mount":"Ceiling Recessed","aim":"Fixed","dim":"Lenght:45 · Width: 49 · Height: 49 · Opening: 37*37","heat":"3W","ri":"Remote","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-LL06-3","I.013.CN":"XTD-A-01"}},{"n":20,"b":"Glare Free","c":"India","name":"Floor Highlighter","mount":"Ceiling Recessed","aim":"Fixed","dim":"Lenght:45 · Width: 49 · Height: 75 · Opening: 68*37","heat":"6W","ri":"Remote","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-LL06-6","I.013.CN":"XTD-A-02"}},{"n":21,"b":"Glare Free","c":"India","name":"Floor Highlighter","beam":"15,24,36","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","dim":"Lenght:45 · Width: 49 · Height: 147 · Opening:140*37","heat":"15W","ri":"Remote","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-LL06-15","I.013.CN":"XTD-A-05"}},{"n":22,"b":"Glare Free","c":"India","name":"Floor Highlighter","beam":"15,24,36","mount":"Ceiling Recessed","aim":"Fixed","dim":"Lenght:45 · Width: 49 · Height: 280 · Opening:237*37","heat":"30W","ri":"Remote","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-LL06-30","I.013.CN":"XTD-A-010"}},{"n":23,"b":"Glare Free","c":"India","name":"Floor Highlighter [Adjustable]","beam":"15,24,36","mount":"Ceiling Recessed","aim":"Adjustable","heat":"10W","ri":"Remote","type":"CKD Purchase | Import","sup":{"I.013.CN":"CE-GSD-S06"}},{"n":24,"b":"Glare Free","c":"India","name":"Floor Highlighter","beam":"30","mount":"Ceiling Surface","aim":"Fixed","heat":"10W","ri":"Remote","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-CY01","L.002.DL":"L.003.BOM","I.013.CN":"XTD-3470-305"}},{"n":25,"b":"Glare Free","c":"India","name":"Floor Highlighter","mount":"Ceiling Recessed","aim":"Fixed","dim":"Diameter: 173 · Opening: 165 · Height: 35","heat":"20W","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-LL04"}},{"n":26,"b":"Glare Free","c":"India","name":"Floor Highlighter","mount":"Ceiling Recessed","aim":"Fixed","dim":"Diameter: 218 · Opening: 205 · Height: 35","heat":"30W","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-LL04"}},{"n":27,"b":"Glare Free","c":"India","name":"Floor Highlighter","mount":"Ceiling Recessed","aim":"Fixed","heat":"18W","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-DL02-D-18R"}},{"n":28,"name":"Trimeless laserblade pushfit 5 leds"},{"n":29,"name":"Trimeless laserblade pushfit 10 leds"},{"n":30,"name":"Trimeless laserblade pushfit 3leds"},{"n":31,"name":"Floor Highlighter","beam":"36°"},{"n":32,"b":"Glare Free","c":"India","name":"Floor Highlighter [Adjustable]","fam":"D+1CT.3S","mount":"Ceiling Track","aim":"Adjustable","ip":"IP20","dim":"Lenght:112mm · Width: 22mm · Height: 110mm","heat":"12W","ri":"Inbuilt","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-MGLLT-12","I.015.CN":"M20-LBF2-12W"}},{"n":51,"b":"Retina","c":"India","name":"Wall Highlighter","fam":"W1CR.3S","beam":"12° - 45°","mount":"Ceiling Recessed","aim":"Adjustable","heat":"7W","ri":"Remote","type":"CKD Purchase | Import"},{"n":52,"b":"Glare Free","c":"India","name":"Wall Highlighter","beam":"24°","mount":"Ceiling Recessed","aim":"Adjustable","dim":"Diameter: 62 · Opening: 55 · Height: 80","heat":"7W","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-CB07"}},{"n":53,"b":"Glare Free","c":"India","name":"Wall Directional","fam":"W1CR.3S","mount":"Ceiling Recessed","aim":"Adjustable","ip":"IP20","heat":"6W","type":"Finished | Import Purchase"},{"n":55,"b":"Glare Free","c":"India","name":"Wall Directional","fam":"W1CT.3S","mount":"Ceiling Track","aim":"Adjustable","heat":"5W","ri":"Inbuilt","type":"Finished | Local Purchase","sup":{"I.015.CN":"UT25-SL-5W"}},{"n":56,"b":"Glare Free","c":"India","name":"Wall Directional","fam":"W1CT.3S","mount":"Ceiling Track","aim":"Adjustable","heat":"12W","ri":"Inbuilt","type":"Finished | Local Purchase","sup":{"I.015.CN":"UT25-SL-7W"}},{"n":57,"b":"Glare Free","c":"India","name":"Wall Directional","fam":"W1CT.3S","mount":"Ceiling Track","aim":"Adjustable","heat":"18W","ri":"Inbuilt","type":"Finished | Local Purchase","sup":{"I.015.CN":"UT25-SL-12W"}},{"n":58,"b":"Glare Free","c":"India","name":"Wall Directional","fam":"W1CT.3S","mount":"Ceiling Track","aim":"Adjustable","heat":"25W","ri":"Inbuilt","type":"Finished | Local Purchase","sup":{"I.015.CN":"UT25-SL-15W"}},{"n":59,"b":"Glare Free","c":"India","name":"Wall Directional","beam":"90°","mount":"Ceiling Track","aim":"Adjustable","dim":"Lenght:80 · Width: 35 · Height: 35","heat":"7W","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-MGTL"}},{"n":60,"b":"Glare Free","c":"India","name":"Wall Directional","beam":"90°","mount":"Ceiling Track","aim":"Adjustable","dim":"Lenght:100 · Width: 45 · Height: 45","heat":"12W","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-MGTL"}},{"n":61,"name":"Wall Directional","mount":"Ceiling Track","aim":"Adjustable","heat":"20W"},{"n":62,"name":"Wall Directional","mount":"Ceiling Recessed","aim":"Adjustable"},{"n":63,"b":"Glare Free","c":"India","name":"Wall Directional","beam":"30°","mount":"Ceiling Recessed","aim":"Adjustable","ip":"IP20","dim":"Diameter: 55 · Opening: 45 · Height: 105","heat":"3W","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-CB35"}},{"n":64,"name":"Wall Directional","fam":"W1CS.3S","beam":"15° - 60°","mount":"Ceiling Surface","aim":"Adjustable","ip":"IP44","dim":"Diameter: 52 · Height: 115mm","heat":"12W","type":"Finished | Local Purchase"},{"n":65,"name":"Wall Directional","fam":"W1CT.3S","beam":"15° - 60°","mount":"Ceiling Track","aim":"Adjustable","ip":"IP44","dim":"Diameter: 52 · Height: 115mm","heat":"12W","type":"Finished | Local Purchase"},{"n":66,"name":"Wall Directional","fam":"W1CS.3S","beam":"15° - 60°","mount":"Ceiling Recessed","aim":"Adjustable","ip":"IP44","dim":"Diameter: 52 · Opening: 65mm · Height: 115mm","heat":"12W","type":"Finished | Local Purchase"},{"n":67,"name":"Wall Directional","fam":"W1CS.3S","beam":"15° - 60°","mount":"Ceiling Surface","aim":"Adjustable","ip":"IP65","dim":"Diameter: 52 · Height: 115mm","heat":"12W","type":"Finished | Local Purchase"},{"n":69,"name":"Wall Highlighter","beam":"24°","mount":"Ceiling Recessed","aim":"Adjustable","heat":"7W","type":"CKD Purchase | Import"},{"n":70,"b":"Retina","c":"India","name":"Wall Directional 3°","fam":"W1CS.3S","beam":"3°","aim":"Adjustable","ip":"IP20","heat":"5W","ri":"Remote"},{"n":71,"b":"Retina","c":"India","name":"Wall Directional 5°","fam":"W1CS.3S","beam":"5°","aim":"Adjustable","ip":"IP20","heat":"5W","ri":"Remote"},{"n":72,"b":"Retina","c":"India","name":"Wall Directional · 8°","fam":"W1CS.3S","beam":"8°","aim":"Adjustable","ip":"IP20","heat":"5W","ri":"Remote"},{"n":73,"b":"Glare Free","c":"India","name":"Wall Directional","mount":"Ceiling Track","aim":"Adjustable","heat":"20W","ri":"Inbuilt","type":"Finished | Local Purchase"},{"n":74,"b":"Glare Free","c":"India","name":"Wall Directional","mount":"Ceiling Track","aim":"Adjustable","heat":"30W","ri":"Inbuilt","type":"Finished | Local Purchase"},{"n":76,"b":"Glare Free","c":"India","name":"Wall Washer","mount":"Ceiling Recessed","aim":"Fixed","dim":"Lenght:45 · Width: 45 · Height: 147 · Opening:140*37","heat":"15W","ri":"Remote","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-LL06-15-WW","L.002.DL":"L.003.BOM","I.013.CN":"XTD-WW-05"}},{"n":77,"b":"Glare Free","c":"India","name":"Wall Washer","mount":"Ceiling Recessed","aim":"Fixed","dim":"Lenght:45 · Width: 45 · Height: 280 · Opening:273*37","heat":"30W","ri":"Remote","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-LL06-30-WW","L.002.DL":"L.003.BOM","I.013.CN":"XTD-WW-010"}},{"n":78,"b":"Glare Free","c":"India","name":"Wall Washer","mount":"Ceiling Recessed","aim":"Fixed","dim":"Lenght:45 · Width: 45 · Height: 413 · Opening:405*37","heat":"45W","ri":"Remote","sup":{"L.011.BOM":"EN-LL06-45-WW","L.002.DL":"L.003.BOM","I.013.CN":"XTD-WW-015"}},{"n":79,"b":"Glare Free","c":"India","name":"Wall Washer","mount":"Ceiling Track","aim":"Fixed","dim":"Length: 112mm","heat":"6W","ri":"Inbuilt","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-MGWW-06","I.015.CN":"M20-LBP-6W"}},{"n":80,"b":"Glare Free","c":"India","name":"Wall Washer","mount":"Ceiling Track","aim":"Fixed","dim":"Length: 220mm","heat":"12W","ri":"Inbuilt","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-MGWW-12","I.015.CN":"M20-LBP-12W"}},{"n":81,"b":"Glare Free","c":"India","name":"Wall Washer","mount":"Ceiling Track","aim":"Adjustable","ri":"Remote"},{"n":82,"b":"Glare Free","c":"India","name":"Wall Washer","mount":"Ceiling Track","aim":"Adjustable","ri":"Remote","sup":{"I.013.CN":"KL-DZ1016-12W"}},{"n":83,"b":"Glare Free","c":"India","name":"Wall Washer","mount":"Ceiling Recessed","aim":"Fixed","ri":"Remote","type":"CKD Purchase | Import","adp":"1304","sup":{"I.013.CN":"KL-PG1001E75"}},{"n":84,"name":"Wall Washer","mount":"Ceiling Surface","aim":"Fixed","type":"Finished | Local Purchase"},{"n":85,"b":"Glare Free","c":"India","name":"Wall Washer","mount":"Ceiling Recessed","aim":"Fixed","heat":"5W","adp":"1304"},{"n":104,"name":"Uplight","fam":"U1FS.3S","beam":"3°","mount":"Floor Stake","aim":"Adjustable","ip":"IP65","heat":"3W","type":"Finished | Import Purchase"},{"n":105,"name":"Uplight","fam":"W1CS.3S","beam":"3°","mount":"Wall Surface","aim":"Adjustable","ip":"IP65","heat":"5W","type":"Finished | Import Purchase","sup":{"I.020.CN":"TG210"}},{"n":106,"b":"Glare Free","c":"India","name":"Uplight","beam":"8°","mount":"Floor Stake","aim":"Adjustable","ip":"IP65","dim":"Lenght:52 · Width: 110 · Height: 277","heat":"12W","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-OD02 - PHL","L.003.DEL":"COLUMNLIGHT-10"}},{"n":107,"name":"Uplight","fam":"W1CS.3S","beam":"3°","mount":"Wall Surface","aim":"Adjustable","ip":"IP65","heat":"10W","type":"Finished | Import Purchase","sup":{"I.020.CN":"TG205"}},{"n":108,"name":"Uplight","fam":"65.U1FR.6S","beam":"3°","mount":"Floor Recessed","aim":"Fixed","ip":"IP65","heat":"1w","type":"Finished | Import Purchase"},{"n":111,"name":"Uplight","fam":"65.U1FR.3S","beam":"3°","mount":"Floor Recessed","aim":"Fixed","ip":"IP65","heat":"3W","ri":"Remote","type":"Finished | Import Purchase","sup":{"I.020.CN":"IN-013B"}},{"n":112,"name":"Uplight","fam":"65.U1FR.6S","beam":"3°","mount":"Floor Recessed","aim":"Fixed","ip":"IP65","heat":"5W","ri":"Remote","type":"Finished | Import Purchase","sup":{"I.020.CN":"IN-015B"}},{"n":113,"name":"Brass Up Light Antique Bronze MR11","mount":"Floor Stake","aim":"Adjustable","ip":"IP65","type":"Finished | Import Purchase"},{"n":114,"name":"Brass Up Light Antique Bronze MR16","mount":"Wall Surface","aim":"Adjustable","ip":"IP65","type":"Finished | Import Purchase","maxl":"2"},{"n":115,"name":"Tree Light","mount":"Floor Stake","aim":"Adjustable"},{"n":116,"name":"Spike Light","beam":"24°","mount":"Floor Stake","aim":"Adjustable","ip":"IP65","heat":"10W","type":"Finished | Import Purchase"},{"n":117,"name":"LT2603 Down Light","fam":"MR16","mount":"Wall Surface","aim":"Adjustable","ip":"IP65","type":"Finished | Import Purchase","maxl":"2"},{"n":118,"name":"LT2601 Brass Deck Light Antique Bronze G4","mount":"Wall Surface","aim":"Fixed","ip":"IP65","type":"Finished | Import Purchase"},{"n":119,"name":"Brass Hardscape Light","mount":"Wall Surface","aim":"Fixed","type":"Finished | Import Purchase","maxl":"2"},{"n":120,"name":"LT2205A In-ground Light Antique Bronze PAR36","ip":"IP65","maxl":"2"},{"n":121,"name":"Flood Light","ip":"IP67","heat":"40W","adp":"12V","maxl":"2"},{"n":122,"name":"LT2203B In-ground Light Antique Bronze MR16","ip":"IP65"},{"n":124,"name":"Solar Spike Light","mount":"Floor Stake","aim":"Adjustable","ip":"IP65","dim":"290 · 95 · 340","type":"Finished | Local Purchase"},{"n":125,"name":"Uplight","mount":"Ceiling Surface","aim":"Adjustable","heat":"6W"},{"n":126,"name":"Uplight"},{"n":151,"b":"Glare Free","c":"India","name":"Texter Grazer","mount":"Ceiling Surface","aim":"Adjustable","ip":"IP65","dim":"30","heat":"36W","type":"Finished | Local Purchase","adp":"220V","maxl":"1","sup":{"L.011.BOM":"WW-36W-220V","L.003.DEL":"WW-36W-24V"}},{"n":152,"name":"Texter Grazer Linear Flex","mount":"Ceiling Surface","aim":"Adjustable","ip":"IP65","heat":"24W/M","type":"Finished | Local Purchase","adp":"24V","maxl":"5","sup":{"L.003.DEL":"WW-FLEXI-24W-24V"}},{"n":153,"name":"Texter Grazer RGB","mount":"Ceiling Surface","aim":"Adjustable","ip":"IP65","heat":"36W","type":"Finished | Local Purchase","adp":"220V","maxl":"1"},{"n":154,"name":"Texter Grazer Floor","mount":"Floor Recessed","aim":"Fixed","ip":"IP65","heat":"36W","type":"Finished | Local Purchase","adp":"24V","maxl":"1"},{"n":155,"name":"FLEXI GRAZER","mount":"Ceiling Surface","aim":"Adjustable","ip":"IP65","heat":"24W/M","type":"Finished | Local Purchase","adp":"24V","maxl":"6"},{"n":156,"b":"Glare Free","c":"India","name":"Texter Grazer","mount":"Ceiling Surface","aim":"Adjustable","ip":"IP65","heat":"18W","type":"Finished | Local Purchase","adp":"220V","maxl":"0.5"},{"n":157,"b":"Glare Free","c":"India","name":"Texter Grazer","mount":"Ceiling Surface","aim":"Adjustable","ip":"IP65","heat":"36W","type":"Finished | Local Purchase","adp":"24V","maxl":"1"},{"n":176,"name":"STRETCH CLOTH","mount":"Ceiling Recessed","aim":"Fixed"},{"n":177,"name":"STRETCH CLOTH"},{"n":178,"name":"Deep Reccessed Panel Light"},{"n":201,"name":"AL Profile","fam":"L1CR|026","beam":"Clear | Frosted | Milky","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade"},{"n":202,"name":"AL Profile","fam":"L1CR|027","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade"},{"n":203,"name":"AL Profile","fam":"L1CR|028","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade"},{"n":205,"name":"AL Profile","fam":"L1CR|030","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","heat":"30W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","sup":{"L.018.DEL":"LP 0907 HALF · ROUND WITH TRIM"}},{"n":206,"name":"AL Profile","fam":"L1CR|031","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"5mm","maxl":"3.6","sup":{"L.018.DEL":"091-ALS-R1335"}},{"n":207,"name":"AL Profile","fam":"L1CR|032","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"092-ALS-R3545"}},{"n":208,"name":"AL Profile","fam":"L1CR|033","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"093-ALS-R3572"}},{"n":210,"name":"Linear Flex","fam":"L+1FS|077","mount":"Ceiling Surface","aim":"Fixed","ip":"IP65","type":"Finished | Local Purchase","adp":"8mm Strip Insert Channel"},{"n":211,"name":"AL Profile","fam":"L1CS|078","ip":"IP20","type":"CKD | Local Purchase"},{"n":212,"name":"Linear Flex","fam":"L1NS|041A","ip":"IP65","type":"CKD | Local Purchase","adp":"5mm Strip Insert Channel · TwinFlexTM C-MaskTM · Working Temp. -40~55°C / -40~131°F · Max. Mounting Temp.  85°C / 185°F"},{"n":213,"name":"Linear Flex","fam":"L1NS|041C","ip":"IP65","type":"CKD | Local Purchase","adp":"5mm Strip Insert Channel · TwinFlexTM C-MaskTM · Working Temp. -40~55°C / -40~131°F · Max. Mounting Temp.  85°C / 185°F"},{"n":214,"name":"Linear Flex","fam":"L1NS|041D","ip":"IP65","type":"CKD | Local Purchase","adp":"5mm Strip Insert Channel · TwinFlexTM C-MaskTM · Working Temp. -40~55°C / -40~131°F · Max. Mounting Temp.  85°C / 185°F"},{"n":215,"name":"Linear Flex","fam":"L1NS|041E","ip":"IP65","type":"CKD | Local Purchase","adp":"8mm Strip Insert Channel · TwinFlexTM C-MaskTM · Working Temp. -40~55°C / -40~131°F · Max. Mounting Temp.  85°C / 185°F"},{"n":216,"name":"Linear Flex","fam":"L1NS|041F","ip":"IP65","type":"CKD | Local Purchase","adp":"5mm Strip Insert Channel · TwinFlexTM C-MaskTM · Working Temp. -40~55°C / -40~131°F · Max. Mounting Temp.  85°C / 185°F"},{"n":217,"name":"AL Profile","fam":"L1RS|075","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP65","heat":"20W","type":"CKD | Local Purchase","adp":"8mm Strip Insert Channel","x":"1","pcb":"8mm","maxl":"3","sup":{"L.018.DEL":"114-ALS-R3134"}},{"n":218,"name":"AL Profile","fam":"L1CS.3S|034","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","heat":"20W","type":"CKD | Local Purchase","x":"1","pcb":"8mm","maxl":"3","sup":{"L.018.DEL":"125-ALS-S1618"}},{"n":219,"name":"AL Profile","sup":{"L.018.DEL":"117-ALS-R2012"}},{"n":220,"name":"AL Profile","fam":"L1CR|029","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"40W","type":"CKD | Local Purchase","adp":"8mm Strip Insert Channel","x":"2","pcb":"8mm","maxl":"3.6","sup":{"L.018.DEL":"095-ALS-R8248"}},{"n":221,"name":"AL Profile","fam":"L1CR|021","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"40W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"8mm","maxl":"3.6","sup":{"L.018.DEL":"102-ALS-R8657"}},{"n":222,"name":"AL Profile","fam":"L1CS|023","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","heat":"15W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"8mm","maxl":"3","sup":{"L.018.DEL":"028-ALS-S1818","L.019.AMD":"RR 01818C200"}},{"n":223,"name":"AL Profile","fam":"L1CS|023","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","heat":"20W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"8mm","maxl":"3","sup":{"L.018.DEL":"029-ALS-S1919"}},{"n":224,"name":"AL Profile","fam":"L1CR|035A","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"10W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"5mm","maxl":"3","sup":{"L.018.DEL":"069-ALS-R0809"}},{"n":225,"name":"AL Profile","fam":"L1CR|035B","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"10W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"5mm","maxl":"3","sup":{"L.018.DEL":"070-ALS-R1013"}},{"n":226,"name":"AL Profile","fam":"L1NS|035C","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"10W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"8mm","maxl":"3.6","sup":{"L.018.DEL":"071-ALS-R1214"}},{"n":227,"name":"AL Profile","fam":"L1CR|035D","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"10W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"8mm","maxl":"3.6","sup":{"L.018.DEL":"072-ALS-R1525"}},{"n":228,"name":"AL Profile","fam":"L1CR|035E","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"10W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"10mm","maxl":"3","sup":{"L.018.DEL":"073-ALS-R1606"}},{"n":229,"name":"AL Profile","fam":"L1CR|035F","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"20W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"10mm","maxl":"3","sup":{"L.018.DEL":"074-ALS-R1612"}},{"n":231,"name":"AL Profile","fam":"L1CR|035H","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"30W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"076-ALS-R2512"}},{"n":232,"name":"AL Profile","fam":"L1CR|035I","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"30W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"077-ALS-R2520"}},{"n":233,"name":"AL Profile","fam":"L1CR|035J","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"30W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"078-ALS-R2525"}},{"n":234,"name":"AL Profile","fam":"L1CR|035K","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","heat":"30W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"080-ALS-R3524"}},{"n":235,"name":"AL Profile","fam":"L1CR|035L","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"081-ALS-3535"}},{"n":236,"name":"AL Profile","fam":"L1CR|035M","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"082-ALS-5024"}},{"n":237,"name":"AL Profile","fam":"L1CR|035N","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"083-ALS-5035"}},{"n":238,"name":"AL Profile","fam":"L1CR|035O","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"084-ALS-R5050"}},{"n":239,"name":"AL Profile","fam":"L1CR|035P","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"086-ALS-R6080"}},{"n":240,"name":"AL Profile","fam":"L1CR|035Q","beam":"Clear | Frosted | Milky | Prismatic","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"085-ALS-R7535"}},{"n":241,"name":"AL Profile","fam":"L1CS|020","beam":"Black, Clear, Frosted, Milky","ip":"IP20","dim":"#N/A","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"3.6","sup":{"L.018.DEL":"212-ALS-R8050"}},{"n":242,"name":"AL Profile","fam":"L1CS|021","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"8mm Strip Insert Channel","x":"1","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"213-ALS-R9752"}},{"n":243,"name":"AL Profile","fam":"L1WS|038A","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"5mm","maxl":"3","sup":{"L.018.DEL":"007-ALS-S0809"}},{"n":244,"name":"AL Profile","fam":"L1FS|038B","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"5mm","maxl":"3","sup":{"L.018.DEL":"008-ALS-S1013"}},{"n":245,"name":"AL Profile","fam":"L1CS|038C","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"8mm","maxl":"3.6","sup":{"L.018.DEL":"009-ALS-S1214"}},{"n":246,"name":"AL Profile","fam":"L1CS|038D","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","heat":"10W","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"3","sup":{"L.018.DEL":"ALS/LP 0107"}},{"n":247,"b":"Linear","c":"India","name":"AL Profile","fam":"L1CS|038E","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"10mm","maxl":"3","sup":{"L.018.DEL":"010-ALS-S1606"}},{"n":248,"name":"AL Profile","fam":"L1CS|038F","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"10mm","maxl":"3","sup":{"L.018.DEL":"011-ALS-S1612"}},{"n":249,"name":"AL Profile","fam":"L1CS|038G","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"10mm","maxl":"3","sup":{"L.018.DEL":"012-ALS-S1618"}},{"n":250,"name":"AL Profile","fam":"L1CS|038H","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade"},{"n":251,"name":"AL Profile","fam":"L1CS|038I","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"013-ALS-S2512"}},{"n":252,"name":"AL Profile","fam":"L1CS|038J","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"016-ALS-S2525"}},{"n":253,"name":"AL Profile","fam":"L1CS.038K","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"017-ALS-S3520"}},{"n":254,"name":"AL Profile","fam":"L1CS|038L","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"019-ALS-S3535"}},{"n":255,"name":"AL Profile","fam":"L1CS|038M","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"020-ALS-S5020"}},{"n":256,"name":"AL Profile","fam":"L1CS|038N","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"021-ALS-S5035"}},{"n":257,"name":"AL Profile","fam":"L1CS|038O","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"022-ALS-S5050"}},{"n":258,"name":"AL Profile","fam":"L1CS|038P","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"2","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"024-ALS-S6080"}},{"n":259,"name":"AL Profile","fam":"L1CS|038Q","beam":"Clear | Frosted | Milky","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"3","pcb":"10mm","maxl":"3.6","sup":{"L.018.DEL":"023-ALS-S7535"}},{"n":260,"name":"AL Profile","fam":"L1CS|038R","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","x":"1","pcb":"10mm","maxl":"3","sup":{"L.018.DEL":"040-ALS-S1806","L.003.DEL":"SVT-LP1806-FLEXI"}},{"n":261,"name":"AL Profile","fam":"L1CR|046","beam":"`","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"3","sup":{"L.018.DEL":"ALS SCORE 6/ FRAME"}},{"n":262,"name":"AL Profile","fam":"L1CR|047","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"3","sup":{"L.018.DEL":"ALS/SCORE 6/ MINIMAL"}},{"n":263,"name":"AL Profile","fam":"L1CR|048","beam":"Clear | Frosted | Milky","mount":"Ceiling Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"3.6","sup":{"L.018.DEL":"LP 011-04 PoP DEEP COVE 35MM"}},{"n":264,"name":"AL Profile","fam":"L1WR|049","mount":"Ceiling Recessed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"3.6","sup":{"L.018.DEL":"ALS/PoP CORNER OUT 1214"}},{"n":265,"name":"AL Profile","fam":"L1WR|050","mount":"Ceiling Recessed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"3.6","sup":{"L.018.DEL":"ALS/PoP CORNER IN 1214"}},{"n":266,"name":"AL Profile","fam":"L1WS|051","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"3.6","sup":{"L.018.DEL":"ALS SCORE 6/ UP OR DOWN"}},{"n":267,"name":"AL Profile","fam":"L1WS|052","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"3.6","sup":{"L.018.DEL":"ALS/SCORE 6/ UP & DOWN"}},{"n":268,"name":"AL Profile","fam":"L1NS|001","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"Finished | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"600mm"},{"n":269,"name":"AL Profile","fam":"L1NS|001","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"Finished | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"900mm"},{"n":270,"name":"AL Profile","fam":"L1NS|001","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"Finished | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"1200mm"},{"n":271,"name":"AL Profile","fam":"L1FR|004","mount":"Furniture Recessed","aim":"Fixed","ip":"IP20","type":"CKD | Local Purchase","adp":"Anodized AL 6063 aircraft grade","maxl":"3","sup":{"L.018.DEL":"ALS WARDROBE RECESSED ASYMMETRIC"}},{"n":272,"name":"AL Profile","fam":"L1NS|007","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":273,"name":"AL Profile","fam":"L1NS|005","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":274,"name":"AL Profile","fam":"L1NS|003","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":275,"name":"AL Profile","fam":"L1NS|018","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":276,"name":"AL Profile","fam":"L1NS|019","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":277,"name":"AL Profile","fam":"L1NS|011","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":278,"name":"AL Profile","fam":"L1NS|012","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":279,"name":"AL Profile","fam":"L1NS|015","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":280,"name":"AL Profile","fam":"L1NS|014","mount":"Furniture Recessed","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":281,"name":"AL Profile","fam":"L1NS|016","mount":"Furniture Recessed","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":282,"name":"AL Profile","fam":"L1NS|013","mount":"Furniture Recessed","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":283,"name":"AL Profile","fam":"L1NS|010","mount":"Furniture Recessed","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":284,"name":"AL Profile","fam":"L1NS|017","mount":"Furniture Recessed","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":285,"name":"AL Profile","fam":"LINR|058","mount":"Furniture Recessed","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":286,"name":"AL Profile","fam":"L1NS|059","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2"},{"n":287,"name":"Linear Flex","fam":"L1NS|025","ip":"IP20","type":"CKD Purchase | Import","adp":"8mm Strip Insert Channel · TwinFlexTM C-MaskTM · Working Temp. -40~55°C / -40~131°F · Max. Mounting Temp.  85°C / 185°F","maxl":"2"},{"n":288,"name":"Linear Flex","fam":"L1NS|041","ip":"IP20","type":"CKD Purchase | Import","adp":"8mm Strip Insert Channel · TwinFlexTM C-MaskTM · Working Temp. -40~55°C / -40~131°F · Max. Mounting Temp.  85°C / 185°F","maxl":"2","sup":{"L.018.DEL":"D33/360"}},{"n":289,"name":"Linear Profile","fam":"L1NS|062","mount":"Furniture Surface","aim":"Fixed","ip":"IP20","type":"CKD Purchase | Import","adp":"Anodized AL 6063 aircraft grade","maxl":"2","sup":{"L.018.DEL":"513"}},{"n":290,"name":"Linear Flex","fam":"L1NS|025J","mount":"Ceiling Surface","aim":"Fixed","ip":"IP20"},{"n":292,"name":"Linear Flex","fam":"L1FR|041B","mount":"Ceiling Surface","aim":"Fixed","dim":"6*12"},{"n":293,"name":"Fill Light [Linear]","fam":"L1CH|042","type":"CKD | Local Purchase"},{"n":294,"name":"10X10 Furniture Profile","mount":"Ceiling Recessed","aim":"Fixed","type":"Finished | Local Purchase","sup":{"L.003.DEL":"PROFILE-1010A-12V-3M"}},{"n":295,"name":"END CAPS PLUG WITH 2M LONG WIRE","type":"Finished | Local Purchase","sup":{"L.003.DEL":"PLUG1010A"}},{"n":296,"name":"50X70 HANGING PROFILE","mount":"Ceiling Hanging","aim":"Fixed","type":"Finished | Local Purchase","sup":{"L.003.DEL":"SVT-D5070H"}},{"n":297,"name":"70X70 CORNER PROFILE"},{"n":298,"name":"Linear Flex","dim":"15*5"},{"n":299,"name":"45W 3382 HANGING LINEAR LIGHT BLACK 9 REFLECTOR","sup":{"L.003.DEL":"SVT-D3382-45W9R"}},{"n":300,"name":"Asymmetric Profile","mount":"Furniture Recessed","aim":"Fixed","type":"CKD | Local Purchase"},{"n":304,"name":"Silicone Flex","fam":"L1XX|025N","mount":"Wall Surface","aim":"Fixed","ip":"IP68"},{"n":305,"name":"Linear Light","beam":"120","mount":"Ceiling Surface","aim":"Fixed","ip":"IP65","type":"CKD | Local Purchase"},{"n":309,"b":"Glare Free","c":"India","name":"Wall Highlighter Surface Mount","fam":"W1CS.3S","beam":"ZOOm","mount":"Ceiling Track","aim":"Fixed","type":"Finished | Local Purchase"},{"n":314,"name":"Tube Linkable","fam":"L1CS|070","beam":"120 Degree","mount":"Wall Surface","aim":"Fixed","ip":"IP20","dim":"Lenght: 250mm","heat":"6W","ri":"Inbuilt","type":"Finished | Local Purchase","b2":"CORVI","sup":{"L.010.DEL":"Tube Linkable - Tube 1"}},{"n":315,"name":"Tube Linkable","fam":"L1CS|071","beam":"120 Degree","mount":"Wall Surface","aim":"Fixed","ip":"IP20","dim":"Lenght: 500mm","heat":"12W","ri":"Inbuilt","type":"Finished | Local Purchase","b2":"CORVI","sup":{"L.010.DEL":"Tube Linkable - Tube 2"}},{"n":316,"name":"Tube Linkable","fam":"L1CS|072","beam":"120 Degree","mount":"Wall Surface","aim":"Fixed","ip":"IP20","dim":"Lenght: 1000mm","heat":"20W","ri":"Inbuilt","type":"Finished | Local Purchase","b2":"CORVI","sup":{"L.010.DEL":"Tube Linkable - Tube 4"}},{"n":363,"name":"Linear Flex","fam":"L1NS|025A","mount":"Wall Surface","aim":"Fixed","ip":"IP65","dim":"https://drive.google.com/file/d/1r6YE2VvtI1xAT3unIE-PiA37hjjyZJ-m/view?usp=sharing","type":"Finished | Local Purchase","adp":"5mm Strip Insert Channel · TwinFlexTM C-MaskTM · Working Temp. -40~55°C / -40~131°F · Max. Mounting Temp.  85°C / 185°F"},{"n":364,"name":"Linear Flex","fam":"L1NS|025B","mount":"Wall Surface","aim":"Fixed","ip":"IP65","type":"Finished | Local Purchase","adp":"8mm Strip Insert Channel · TwinFlexTM C-MaskTM · Working Temp. -40~55°C / -40~131°F · Max. Mounting Temp.  85°C / 185°F","sup":{"L.003.DEL":"GSR-24V-NEON-1212-FB-IP65"}},{"n":373,"name":"Linear Flex","fam":"L1NS|025N","mount":"Wall Surface","aim":"Fixed"},{"n":401,"b":"Glare Free","name":"Trick Light [Application Specific]","fam":"A1WS|067","mount":"Wall Surface","aim":"Fixed","ip":"IP65","heat":"7.4 W","ri":"Inbuilt","type":"Finished | Local Purchase","adp":"DC24/AC120-240V"},{"n":405,"b":"Glare Free","c":"India","name":"Magnetic Track [19mm]","fam":"L.CR.S1","mount":"Ceiling Recessed","aim":"Fixed","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-MGTR-1M","L.002.DL":"L.003.BOM","I.013.CN":"R20E"}},{"n":406,"name":"Corner Module","mount":"Ceiling Track","aim":"Fixed","type":"Finished | Local Purchase"},{"n":408,"name":"Suspended Drum","mount":"Ceiling Hanging","ip":"IP20","dim":"DIA1200","type":"Finished | Local Purchase"},{"n":409,"b":"Glare Free","c":"India","name":"Floor Highlighter · [Application Specific]","beam":"25°","mount":"Ceiling Recessed","aim":"Fixed","dim":"Ø35","heat":"3W","type":"Finished | Local Purchase","sup":{"L.011.BOM":"EN-CB08-3"}},{"n":410,"name":"220V Track","mount":"Ceiling Surface","type":"Finished | Local Purchase"},{"n":411,"name":"Staircase Rail Light","ip":"IP65","type":"Finished | Local Purchase"},{"n":412,"name":"Hanging Catenary","mount":"Ceiling Hanging","aim":"Fixed","ip":"IP65","type":"Finished | Local Purchase"},{"n":413,"name":"Hanging Catenary","beam":"Diffused","mount":"Ceiling Hanging","aim":"Fixed","ip":"IP65","type":"Finished | Local Purchase"},{"n":414,"name":"Hanging Catenary","mount":"Ceiling Hanging","aim":"Fixed","ip":"IP65","type":"Finished | Local Purchase"},{"n":415,"name":"Flood","mount":"Wall Surface","aim":"Adjustable","ip":"IP65","heat":"100W","type":"Finished | Local Purchase","adp":"RGB"},{"n":416,"name":"Flood","beam":"60","mount":"Wall Surface","aim":"Adjustable","ip":"IP65","heat":"600W","type":"Finished | Local Purchase","adp":"5000K"},{"n":417,"name":"Hanging Catenary","mount":"Ceiling Hanging","aim":"Fixed","type":"Finished | Local Purchase"},{"n":418,"name":"Step Light","mount":"Wall Recessed","aim":"Fixed","type":"Finished | Local Purchase"},{"n":419,"name":"Trick Light [Application Specific]","mount":"Wall Surface","aim":"Fixed","type":"Finished | Local Purchase","adp":"AC120-240V"},{"n":420,"c":"India","name":"Step Light","fam":"3000k","ip":"IP65","heat":"3W"},{"n":421,"c":"India","name":"EN-OD32-3B","ip":"IP66","dim":"109 x 50 × 74","heat":"3W"},{"n":422,"c":"India","name":"Step Light"}];
/* Supplier aliases (column headings in the housing sheet). A housing row lists that supplier's own product code under its alias. */
const SUPPLIERS=["L.011.BOM","L.002.DL","I.013.CN","I.014.CN","I.015.CN","L.018.DEL","L.019.AMD","L.003.DEL","I.020.CN","L.010.DEL"];
const LEDS=[{"n":1,"name":"5mm 120D.3000K.90CRI.5W","kind":"Flexible","w":"5W","volt":"24V","cct":"30E","make":"Litex"},{"n":2,"name":"5mm 120D.4000K.90CRI.5W","kind":"Flexible","w":"5W","volt":"24V","cct":"40E","make":"Litex"},{"n":3,"name":"5mm 120D.3000K.90CRI.10W","kind":"Flexible","w":"10W","volt":"24V","cct":"30E","make":"Bridgelux USA"},{"n":4,"name":"8mm 60D.3000K.90CRI.5W","kind":"Flexible","w":"5W","volt":"24V","cct":"30E","make":"Bridgelux USA /LEDVANCE"},{"n":5,"name":"8mm 120D.3000K.90CRI.5W","kind":"Flexible","w":"5W","volt":"24V","cct":"30E","make":"Bridgelux USA"},{"n":6,"name":"8mm 120D.3000K.90CRI.10W","kind":"Flexible","w":"10W","volt":"24V","cct":"30E","make":"Bridgelux USA"},{"n":7,"name":"8mm 120D.3000K.90CRI.10W","kind":"Flexible","w":"10W","volt":"24V","cct":"30E","make":"Ledvance"},{"n":8,"name":"8mm 120D.4000K.90CRI.10W","kind":"Flexible","w":"10W","volt":"24V","cct":"40E","make":"Ledvance"},{"n":9,"name":"8mm 180D.3000K.90CRI.15W","kind":"Flexible","w":"15W","volt":"24V","cct":"30E","make":"Bridgelux USA"},{"n":10,"name":"8mm 180D.3000K.90CRI.20W","kind":"Flexible","w":"20W","volt":"24V","cct":"30E","make":"Retina"},{"n":11,"name":"8mm 180D.3000K.90CRI.15W","kind":"Flexible","w":"15W","volt":"24V","cct":"30E","make":"Ledvance"},{"n":12,"name":"8mm 192D.30-60.90CRI.20W","kind":"Flexible","w":"20W","volt":"24V","cct":"30E · 60E","make":"Litex"},{"n":13,"name":"8mm 192D.30-60.90CRI.30W","kind":"Flexible","w":"30W","volt":"24V","cct":"30E · 60E","make":"Bridgelux USA"},{"n":14,"name":"10mm 120D.3000K.90CRI.10W","kind":"Rigid FR","w":"10W","volt":"24V","cct":"30E","make":"Bridgelux USA"},{"n":15,"name":"5mm 120D.4000K.90CRI.10W","w":"10W","volt":"24V","cct":"40E","make":"Litex"},{"n":16,"name":"10mm 120D.3000K.90CRI.12W","kind":"Rigid FR","w":"12W","volt":"24V","cct":"30E","make":"Bridgelux USA"},{"n":17,"name":"10mm 120D.3000K.90CRI.15W","kind":"Rigid FR","w":"15W","volt":"24V","cct":"30E","make":"Bridgelux USA"},{"n":18,"name":"12mm 180D.3000K.90CRI.20W","kind":"Rigid FR","w":"20W","volt":"24V","cct":"30E","make":"Bridgelux USA"},{"n":19,"name":"12mm 180D.3000K.90CRI.20W","kind":"Rigid FR","w":"25W","volt":"24V","cct":"30E","make":"Bridgelux USA"},{"n":20,"name":"12mm 192D.Tuneable.90CRI.20W","kind":"Rigid FR","w":"20W","volt":"24V","cct":"30E · 60E","make":"Bridgelux USA"},{"n":21,"name":"12mm 192D.Tuneable.90CRI.30W","kind":"Rigid FR","w":"30W","volt":"24V","cct":"30E · 60E","make":"Bridgelux USA"},{"n":22,"name":"8mm 240D.3000K.90CRI.10W","volt":"24V","cct":"30E","make":"Litex"},{"n":23,"name":"8mm 240D.3000K.90CRI.20W","volt":"12V","cct":"30E","make":"GSR"},{"n":25,"name":"LM-SV 500 24W 24/827","w":"5W","volt":"24V","cct":"27E","make":"Ledvance"},{"n":26,"name":"LM-SV 1200 60W 24/827","w":"12W","volt":"24V","cct":"27E","make":"Ledvance"},{"n":27,"name":"LM-SV 1500 75W 24/827","w":"15W","volt":"24V","cct":"27E","make":"Ledvance"},{"n":28,"name":"LM-SV 2400 100W 24/827","w":"20W","volt":"24V","cct":"27E","make":"Ledvance"},{"n":29,"name":"LM-SV 500 24W 24/830","w":"5W","volt":"24V","cct":"3000K","make":"Ledvance"},{"n":30,"name":"LM-SV 1200 60W 24/830","w":"12W","volt":"24V","cct":"3000K","make":"Ledvance"},{"n":31,"name":"LM-SV 1500 75W 24/830","w":"15W","volt":"24V","cct":"3000K","make":"Ledvance"},{"n":32,"name":"LM-SV 2400 100W 24/830","w":"20W","volt":"24V","cct":"3000K","make":"Ledvance"},{"n":33,"name":"LM-SV 500 24W 24/840","w":"5W","volt":"24V","cct":"4000K","make":"Ledvance"},{"n":34,"name":"LM-SV 1200 60W 24/840","w":"12W","volt":"24V","cct":"4000K","make":"Ledvance"},{"n":35,"name":"LM-SV 1500 75W 24/840","w":"15W","volt":"24V","cct":"4000K","make":"Ledvance"},{"n":36,"name":"LM-SV 2400 100W 24/840","w":"20W","volt":"24V","cct":"4000K","make":"Ledvance"},{"n":37,"name":"LM-SV 500 25W 24V 830 P","w":"5W","volt":"24V","cct":"3000K","make":"Ledvance"},{"n":38,"name":"LM-SV 1200-830 60W 24V P","w":"12W","volt":"24V","cct":"3000K","make":"Ledvance"},{"n":39,"name":"LM-SV 1800-830 90W 24V P","w":"15W","volt":"24V","cct":"3000K","make":"Ledvance"},{"n":40,"name":"LM-SV 2200-830 90W 24V P","w":"20W","volt":"24V","cct":"3000K","make":"Ledvance"},{"n":41,"name":"LM-SV 500 24W 24/865","w":"5W","volt":"24V","cct":"6500K"},{"n":42,"name":"LM-SV 1200 60W 24/865","w":"12W","volt":"24V","cct":"6500K","make":"Ledvance"},{"n":43,"name":"LM-SV 1500 75W 24/865","w":"15W","volt":"24V","cct":"6500K","make":"Ledvance"},{"n":44,"name":"LM-SV 2400 100W 24/865","w":"20W","volt":"24V","cct":"6500K","make":"Ledvance"},{"n":45,"name":"LM-SV-2400-830","w":"100W","volt":"24V","cct":"3000K","make":"Ledvance"},{"n":46,"name":"LM-SV-24v","w":"100W","volt":"24V","cct":"3000K","make":"Ledvance"},{"n":47,"name":"5mm 120D.4000K.90CRI.10W","kind":"Flexible","w":"10W","volt":"12V","cct":"40E","make":"Ledvance"},{"n":48,"name":"8mm 240D.4000K.90CRI.10W","volt":"12V","cct":"40E","make":"Litex"},{"n":49,"name":"8mm 60D.4000K.90CRI.5W","kind":"Flexible","w":"5W","volt":"24V","cct":"40E","make":"Bridgelux USA /LEDVANCE"},{"n":50,"name":"5mm 60D.3000K.90CRI.5W","kind":"Flexible","w":"5W","volt":"24V","cct":"30E","make":"Bridgelux USA /LEDVANCE"},{"n":51,"name":"8mm 60D.3000K.90CRI.5W","kind":"Flexible","w":"5W","volt":"12V","cct":"30E","make":"Bridgelux USA /LEDVANCE"}];
const DRIVERS=[{"n":1,"code":"APV-8-12","mode":"CV","volt":"12V","load":"8W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":2,"code":"APV-12-12","mode":"CV","volt":"12V","load":"12W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":3,"code":"APV-16-12","mode":"CV","volt":"12V","load":"16W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":4,"code":"APV-25-12","mode":"CV","volt":"12V","load":"25W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":5,"code":"APV-35-12","mode":"CV","volt":"12V","load":"35W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":6,"code":"LRS-35-12","mode":"CV","volt":"12V","load":"35W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":7,"code":"LRS-50-12","mode":"CV","volt":"12V","load":"50W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":8,"code":"LRS-75-12","mode":"CV","volt":"12V","load":"75W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":9,"code":"LRS-100-12","mode":"CV","volt":"12V","load":"100W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":10,"code":"LRS-150-12","mode":"CV","volt":"12V","load":"150W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":11,"code":"LRS-200-12","mode":"CV","volt":"12V","load":"200W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":12,"code":"LRS-350-12","mode":"CV","volt":"12V","load":"350W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":13,"code":"APV-8-24","mode":"CV","volt":"24V","load":"8W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":14,"code":"APV-12-24","mode":"CV","volt":"24V","load":"12W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":15,"code":"APV-16-24","mode":"CV","volt":"24V","load":"16W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":16,"code":"APV-25-24","mode":"CV","volt":"24V","load":"25W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":17,"code":"APV-35-24","mode":"CV","volt":"24V","load":"35W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":18,"code":"LRS-35-24","mode":"CV","volt":"24V","load":"35W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":19,"code":"LRS-50-24","mode":"CV","volt":"24V","load":"50W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":20,"code":"LRS-75-24","mode":"CV","volt":"24V","load":"75W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":21,"code":"LRS-100-24","mode":"CV","volt":"24V","load":"100W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":22,"code":"LRS-150-24","mode":"CV","volt":"24V","load":"150W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":23,"code":"LRS-200-24","mode":"CV","volt":"24V","load":"200W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":24,"code":"LRS-350-24","mode":"CV","volt":"24V","load":"350W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":25,"code":"LPH-18-12","mode":"CV","volt":"12V","load":"18W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":26,"code":"LPV-35-12","mode":"CV","volt":"12V","load":"35W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":27,"code":"LPV-60-12","mode":"CV","volt":"12V","load":"60W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":28,"code":"LPV-100-12","mode":"CV","volt":"12V","load":"100W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":29,"code":"LPH-18-24","mode":"CV","volt":"24V","load":"18W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":30,"code":"LPV-35-24","mode":"CV","volt":"24V","load":"35W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":31,"code":"LPV-60-24","mode":"CV","volt":"24V","load":"60W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":32,"code":"LPV-100-24","mode":"CV","volt":"24V","load":"100W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":33,"code":"SLD-50-12","mode":"CV","volt":"12V","load":"50W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":34,"code":"SLD-80-12","mode":"CV","volt":"12V","load":"80W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":35,"code":"SLD-50-24","mode":"CV","volt":"24V","load":"18W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":36,"code":"SLD-80-24","mode":"CV","volt":"24V","load":"35W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":37,"code":"XLG-75I-12A","mode":"CV","volt":"12V","load":"75W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":38,"code":"XLG-100I-12A","mode":"CV","volt":"12V","load":"100W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":39,"code":"XLG-150I-L-AB","mode":"CV","volt":"12V","load":"150W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":40,"code":"XLG-200I-12A","mode":"CV","volt":"12V","load":"200W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":41,"code":"ELG-300-12","mode":"CV","volt":"12V","load":"300W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":42,"code":"XLG-75I-24A","mode":"CV","volt":"24V","load":"75W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":43,"code":"XLG-100I-24A","mode":"CV","volt":"24V","load":"100W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":44,"code":"XLG-150I-24A","mode":"CV","volt":"24V","load":"150W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":45,"code":"XLG-200I-24A","mode":"CV","volt":"24V","load":"200W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":46,"code":"ELG-240-24","mode":"CV","volt":"24V","load":"240W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":47,"code":"ELG-300-24","mode":"CV","volt":"24V","load":"300W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":48,"code":"IDLV-25-12","mode":"CV","volt":"12V","load":"25W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":49,"code":"IDLV-45-12","mode":"CV","volt":"12V","load":"45W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":50,"code":"IDLV-65-12","mode":"CV","volt":"12V","load":"65W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":51,"code":"IDLV-25-24","mode":"CV","volt":"24V","load":"25W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":52,"code":"IDLV-45-24","mode":"CV","volt":"24V","load":"45W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":53,"code":"IDLV-65-24","mode":"CV","volt":"24V","load":"65W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":54,"code":"PW M-40-12","mode":"CV","volt":"12V","load":"40W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":55,"code":"PW M-60-12","mode":"CV","volt":"12V","load":"60W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":56,"code":"PW M-90-12","mode":"CV","volt":"12V","load":"90W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":57,"code":"PW M-120-12","mode":"CV","volt":"12V","load":"120W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":58,"code":"PW M-40-24","mode":"CV","volt":"24V","load":"40W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":59,"code":"PW M-60-24","mode":"CV","volt":"24V","load":"60W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":60,"code":"PW M-90-24","mode":"CV","volt":"24V","load":"90W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":61,"code":"PW M-120-24","mode":"CV","volt":"24V","load":"120W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":62,"code":"ELG-75-12B","mode":"CV","volt":"12V","load":"75W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":63,"code":"ELG-150-12B","mode":"CV","volt":"12V","load":"150W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":64,"code":"ELG-200-12B","mode":"CV","volt":"12V","load":"200W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":65,"code":"ELG-75-24B","mode":"CV","volt":"24V","load":"75W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":66,"code":"ELG-100-24B","mode":"CV","volt":"24V","load":"100W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":67,"code":"ELG-150-24B","mode":"CV","volt":"24V","load":"150W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":68,"code":"ELG-200-24B","mode":"CV","volt":"24V","load":"200W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":69,"code":"ELG-240-24B","mode":"CV","volt":"24V","load":"240W","typo":"0-10V","ip":"IP20","make":"Meanwell"},{"n":70,"code":"ELG-75-12DA","mode":"CV","volt":"12V","load":"75W","typo":"DALI","ip":"IP20","make":"Meanwell"},{"n":71,"code":"ELG-150-12DA","mode":"CV","volt":"12V","load":"150W","typo":"DALI","ip":"IP20","make":"Meanwell"},{"n":72,"code":"ELG-200-12DA","mode":"CV","volt":"12V","load":"200W","typo":"DALI","ip":"IP20","make":"Meanwell"},{"n":73,"code":"ELG-75-24DA","mode":"CV","volt":"24V","load":"75W","typo":"DALI","ip":"IP20","make":"Meanwell"},{"n":74,"code":"ELG-150-24DA","mode":"CV","volt":"24V","load":"150W","typo":"DALI","ip":"IP20","make":"Meanwell"},{"n":75,"code":"ELG-240-24DA","mode":"CV","volt":"24V","load":"240W","typo":"DALI","ip":"IP20","make":"Meanwell"},{"n":76,"code":"75W-24V","mode":"CV","volt":"24V","load":"75W","typo":"Dimmable | TRIAC","ip":"IP20","make":"Allooking"},{"n":77,"code":"75W-24V","mode":"CV","volt":"24V","load":"75W","typo":"Dimmable | 0-10V","ip":"IP20","make":"Allooking"},{"n":78,"code":"100W-24V","mode":"CV","volt":"24V","load":"100W","typo":"Dimmable | TRIAC","ip":"IP20","make":"Allooking"},{"n":79,"code":"100W-24V","mode":"CV","volt":"24V","load":"100W","typo":"Dimmable | 0-10V","ip":"IP20","make":"Allooking"},{"n":80,"code":"150W-24V","mode":"CV","volt":"24V","load":"150W","typo":"Dimmable | TRIAC","ip":"IP20","make":"Allooking"},{"n":81,"code":"150W-24V","mode":"CV","volt":"24V","load":"150W","typo":"Dimmable | 0-10V","ip":"IP20","make":"Allooking"},{"n":82,"code":"200W-24V","mode":"CV","volt":"24V","load":"200W","typo":"Dimmable | TRIAC","ip":"IP20","make":"Allooking"},{"n":83,"code":"200W-24V","mode":"CV","volt":"24V","load":"200W","typo":"Dimmable | 0-10V","ip":"IP20","make":"Allooking"},{"n":84,"code":"75W-12V","mode":"CV","volt":"12V","load":"75W","typo":"Dimmable | TRIAC","ip":"IP20","make":"Allooking"},{"n":85,"code":"150W-12V","mode":"CV","volt":"12V","load":"150W","typo":"Dimmable | TRIAC","ip":"IP20","make":"Allooking"},{"n":86,"code":"200W-12V","mode":"CV","volt":"12V","load":"200W","typo":"Dimmable | TRIAC","ip":"IP20","make":"Allooking"},{"n":87,"code":"LT-60W-24V","mode":"CV","volt":"24V LED Driver","typo":"Dimmable | DALI","ip":"IP20","make":"Huron"},{"n":88,"code":"LT-100W-24V","mode":"CV","volt":"24V LED Driver","typo":"Dimmable | DALI","ip":"IP20","make":"Huron"},{"n":89,"code":"LT-150W-24V","mode":"CV","volt":"24V LED Driver","typo":"Dimmable | DALI","ip":"IP20","make":"Huron"},{"n":90,"code":"LT-200W-24V","mode":"CV","volt":"24V LED Driver","typo":"Dimmable | DALI","ip":"IP20","make":"Huron"},{"n":91,"code":"OT 60/220-240/24 DIM P 20X1","mode":"CV","volt":"24V","load":"60W","typo":"0-10V","ip":"IP67","make":"OSRAM"},{"n":92,"code":"OT 100/220-240/24 DIM P 10X1","mode":"CV","volt":"24V","load":"100W","typo":"0-10V","ip":"IP67","make":"OSRAM"},{"n":93,"code":"OT 130/220-240/24 DIM P 10X1","mode":"CV","volt":"24V","load":"130W","typo":"0-10V","ip":"IP67","make":"OSRAM"},{"n":94,"code":"OT 250/220-240/24 DIM P 10X1","mode":"CV","volt":"24V","load":"250W","typo":"0-10V","ip":"IP67","make":"OSRAM"},{"n":95,"code":"OTi DALI 50/220-240/24 1-4 CHDIM","mode":"CV","volt":"24V","load":"50W","typo":"DALI","ip":"IP20","make":"OSRAM"},{"n":96,"code":"OTI DALI 80/220-240/24 1-4 CH","mode":"CV","volt":"24V","load":"80W","typo":"DALI","ip":"IP20","make":"OSRAM"},{"n":97,"code":"OTI DALI 50/220-240/24 TW","mode":"CV","volt":"24V","load":"50W","typo":"DALI","ip":"IP20","make":"OSRAM"},{"n":98,"code":"OTI DALI 80/220-240/24 TW","mode":"CV","volt":"24V","load":"80W","typo":"DALI","ip":"IP20","make":"OSRAM"},{"n":99,"code":"OTI DALI 160/220-240/24 TW UNV1","mode":"CV","volt":"24V","load":"160W","typo":"DALI","ip":"IP20","make":"OSRAM"},{"n":100,"code":"OTI DALI 160/220-240/24 1-2 CH UNV1OSRAM","mode":"CV","volt":"24V","load":"160W","typo":"DALI","ip":"IP20","make":"OSRAM"},{"n":102,"code":"YSD-30WHC-24","mode":"CV","volt":"24V","load":"30W","typo":"ON/OFF","ip":"IP20","make":"YSD"},{"n":103,"code":"YSD-60WHC-24","mode":"CV","volt":"24V","load":"60W","typo":"ON/OFF","ip":"IP20","make":"YSD"},{"n":104,"code":"YSD-100WHC-24","mode":"CV","volt":"24V","load":"100W","typo":"ON/OFF","ip":"IP20","make":"YSD"},{"n":105,"code":"YSD-150WHC-24","mode":"CV","volt":"24V","load":"150W","typo":"ON/OFF","ip":"IP20","make":"YSD"},{"n":106,"code":"YSD-200WHC-24","mode":"CV","volt":"24V","load":"200W","typo":"ON/OFF","ip":"IP20","make":"YSD"},{"n":107,"code":"YSD-100WUGF-24TL","mode":"CV","volt":"24V","load":"100W","typo":"Dimmable | TRIAC","ip":"IP20","make":"YSD"},{"n":108,"code":"YSD-150WUGF-24TL","mode":"CV","volt":"24V","load":"150W","typo":"Dimmable | TRIAC","ip":"IP20","make":"YSD"},{"n":109,"code":"LM-36-12-G1D2","mode":"CV","volt":"12V","cur":"Max. 3A","load":"36W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":110,"code":"LM-36-24-G1D2","mode":"CV","volt":"24V","cur":"Max. 1.5A","load":"36W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":111,"code":"LM-60-12-U1D2","mode":"CV","volt":"12V","cur":"Max. 5A","load":"60W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":112,"code":"LM-100-24-U1D2","mode":"CV","volt":"24V","cur":"Max. 2.5A","load":"100W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":113,"code":"LM-100-24-U2D2","mode":"CV","volt":"24V","cur":"Max. 2.5A","load":"100W","typo":"DALI-2 DT8","ip":"IP20","make":"LTECH"},{"n":114,"code":"LM-75-12-G1D2","mode":"CV","volt":"12V","cur":"Max. 6.25A","load":"75W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":115,"code":"LM-75-24-G1D2","mode":"CV","volt":"24V","cur":"Max. 3.125A","load":"75W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":116,"code":"LM-75-24-G2D2","mode":"CV","volt":"24V","cur":"Max. 3.125A","load":"75W","typo":"DALI-2 DT8","ip":"IP20","make":"LTECH"},{"n":117,"code":"LM-100-24-G1D2","mode":"CV","volt":"24V","cur":"Max. 4.17A","load":"100W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":118,"code":"LM-100-24-G2D2","mode":"CV","volt":"24V","cur":"Max. 4.17A","load":"100W","typo":"DALI-2 DT8","ip":"IP20","make":"LTECH"},{"n":119,"code":"LM-150-12-G1D2F","mode":"CV","volt":"12V","cur":"Max. 12.5A","load":"150W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":120,"code":"LM-150-24-G1D2","mode":"CV","volt":"24V","cur":"Max. 6.25A","load":"150W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":121,"code":"LM-150-12-G2D2","mode":"CV","volt":"12V","cur":"Max. 12.5A","load":"150W","typo":"DALI-2 DT8","ip":"IP20","make":"LTECH"},{"n":122,"code":"LM-150-24-G2D2","mode":"CV","volt":"24V","cur":"Max. 6.25A","load":"150W","typo":"DALI-2 DT8","ip":"IP20","make":"LTECH"},{"n":123,"code":"LM-150-24-G4k3","mode":"CV","volt":"24V","cur":"Max. 6.25A","load":"150W","typo":"DMX512/RDM DALI-2 DT6/DT8","ip":"IP20","make":"LTECH"},{"n":124,"code":"LM-240-24-G1D2","mode":"CV","volt":"24V","cur":"Max. 10A","load":"240W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":125,"code":"LM-240-24-G2D2","mode":"CV","volt":"24V","cur":"Max. 10A","load":"240W","typo":"DALI-2 DT6/DT8","ip":"IP20","make":"LTECH"},{"n":126,"code":"LM-36-12-G1T2","mode":"CV","volt":"12V","cur":"Max. 3A","load":"36","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":127,"code":"LM-36-24-G1T2","mode":"CV","volt":"24V","cur":"Max. 1.5A","load":"36","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":128,"code":"LM-75-12-G1T2","mode":"CV","volt":"12V","cur":"Max. 2.5A","load":"75","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":129,"code":"LM-75-24-G1T2","mode":"CV","volt":"24V","cur":"Max. 5A","load":"75","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":130,"code":"LM-75-12-G2T2","mode":"CV","volt":"12V","cur":"Max. 2.5A","load":"75","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":131,"code":"LM-75-24-G2T2","mode":"CV","volt":"24V","cur":"Max. 5A","load":"75","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":132,"code":"LM-150-12-G1T2","mode":"CV","volt":"12V","cur":"Max. 12.5A","load":"150","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":133,"code":"LM-150-24-G1T2","mode":"CV","volt":"24V","cur":"Max. 6.25A","load":"150","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":134,"code":"LM-36-12-L1T2","mode":"CV","volt":"12V","cur":"Max. 3A","load":"36W","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":135,"code":"LM-36-24-L1T2","mode":"CV","volt":"24V","cur":"Max. 1.5A","load":"36W","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":136,"code":"LM-36-12-L2T2","mode":"CV","volt":"12V","cur":"Max. 3A","load":"36W","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":137,"code":"LM-36-24-L2T2","mode":"CV","volt":"24V","cur":"Max. 1.5A","load":"36W","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":138,"code":"LM-60-12-L1T2","mode":"CV","volt":"12V","cur":"Max. 5A","load":"60W","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":139,"code":"LM-60-24-L1T2","mode":"CV","volt":"24V","cur":"Max. 5A","load":"60W","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":140,"code":"LM-60-24-L2T2","mode":"CV","volt":"24V","cur":"Max. 5A","load":"60W","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":141,"code":"LM-60-12-U1D2","mode":"CV","volt":"24V","cur":"Max. 2.5A","load":"60W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":142,"code":"SVT-EXDR0812PF","mode":"CV","volt":"26V-40V","load":"8W-12W"},{"n":143,"code":"SVT-EXDR24V8A100W","mode":"CV","volt":"24V","load":"100W","typo":"ON/OFF","ip":"IP20","make":"XG Power"},{"n":144,"code":"SVT-EXDR12V5A200W","mode":"CV","volt":"12V","load":"200W","typo":"ON/OFF","ip":"IP20","make":"XG Power"},{"n":145,"code":"SVT-EXDR24V5A200W","mode":"CV","volt":"24V","load":"200W","typo":"ON/OFF","ip":"IP20","make":"XG Power"},{"n":146,"code":"PE-N20DCA42","typo":"Dali","ip":"IP20","make":"AIDimming"},{"n":147,"code":"XG-PM-1205-60W","mode":"CV","volt":"12V","load":"60W","typo":"ON/OFF","ip":"IP20","make":"XG Power"},{"n":148,"code":"LRS-100-48","mode":"CV","volt":"48V","typo":"ON/OFF","ip":"IP20","make":"Meanwell"},{"n":152,"code":"MKE STSLPILNCY 028 024 1000 01","mode":"CV","volt":"24V","load":"24W","typo":"ON/OFF","ip":"IP20","make":"LEDVANCE"},{"n":153,"code":"LF-GHD100D-24","mode":"CV","volt":"24V","load":"100W","typo":"DALI-2 DT6/DT8","ip":"IP20"},{"n":154,"code":"LF-GHD150D-24","mode":"CV","volt":"24V","load":"150W","typo":"DALI-2 DT6/DT8","ip":"IP20"},{"n":155,"code":"LF-GHD240D-24","mode":"CV","volt":"24V","load":"240W","typo":"DALI-2 DT6/DT8","ip":"IP20"},{"n":156,"code":"LF-ADD013-0400-42","mode":"CV","volt":"220-240V","load":"250-400W","typo":"DALI-2 DT6/DT8","ip":"IP20"},{"n":157,"code":"APV-8-24","mode":"CV","volt":"24V","load":"8W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":158,"code":"LRS-150-48","mode":"CV","volt":"48V","typo":"ON/OFF","ip":"IP20","make":"Meanwell"},{"n":159,"code":"OTI DALI 35/220-240/700 NFC TW L","mode":"CV","volt":"24V","load":"160W","typo":"DALI","ip":"IP20","make":"OSRAM"},{"n":160,"code":"SVT-EXDR24V5A120W","mode":"CV","volt":"24V","load":"120W","typo":"ON/OFF","ip":"IP20","make":"XG Power"},{"n":201,"code":"Code","volt":"Voltage","cur":"Current","load":"Load","typo":"Typology","ip":"IP","make":"Driver Make"},{"n":202,"code":"TGSC-IH18-70-B1-XXXX","mode":"CC","volt":"50-70V","cur":"150-300mA","load":"15-18W","typo":"Wireless [RF+BLE]","ip":"IP20","make":"TIGI Digital"},{"n":203,"code":"TGSC-IH24-85-B1-XXXX","mode":"CC","volt":"60-85V","cur":"150-300mA","load":"18-24W","typo":"Wireless [Zigbee]","ip":"IP20","make":"TIGI Digital"},{"n":204,"code":"TGSC-IH12-42-B1-XXXX","mode":"CC","volt":"30-42V","cur":"150-320mA","load":"9-12W","typo":"Wireless [RF]","ip":"IP20","make":"TIGI Digital"},{"n":205,"code":"TGSC-IH30-42-B1-XXXX","mode":"CC","volt":"30-42V","cur":"400-700mA","load":"18-24W","typo":"Wireless","ip":"IP20","make":"TIGI Digital"},{"n":206,"code":"TGSC-IH12-42-B1-XXXX [RF+S+BT]","mode":"CC","volt":"30-42V","cur":"150-320mA","load":"9-12W","typo":"Wireless [RF+BT]","ip":"IP20","make":"TIGI Digital"},{"n":207,"code":"TGMC-IH12-42-B1-XXXX","mode":"CC","volt":"30-42V","cur":"180-360mA","load":"5-15W","typo":"Wireless [RF+BT]","ip":"IP20","make":"TIGI Digital"},{"n":208,"code":"TGMC-IH30-42-B1-XXXX","mode":"CC","volt":"30-42V","cur":"400-700mA","load":"30-40W","typo":"Wireless","ip":"IP20","make":"TIGI Digital"},{"n":209,"code":"TGMC-IH40-42-B1-XXXX","mode":"CC","volt":"30-42V","cur":"700-950mA","load":"30-40W","typo":"Wireless","ip":"IP20","make":"TIGI Digital"},{"n":210,"code":"TGMC-IH40-42-B1-XXXX [RF+S+BT]","mode":"CC","volt":"30-42V","cur":"700-950mA","load":"30-40W","typo":"Wireless","ip":"IP20","make":"TIGI Digital"},{"n":211,"code":"TGMC-IH40-42-A1-XXXX","mode":"CC","volt":"30-42V","cur":"700-950mA","load":"30-40W","typo":"Wireless","ip":"IP20","make":"TIGI Digital"},{"n":212,"code":"TGCC-NL24-240-B1-10A","mode":"CC","volt":"12V/24V","cur":"10A","load":"120- 240W","typo":"Wireless","ip":"IP20","make":"TIGI Digital"},{"n":213,"code":"TGCC-NL24-240-B1-10A [RF+S+BT]","mode":"CC","volt":"12V/24V","cur":"10A","load":"120- 240W","typo":"Wireless [RF+BT]","ip":"IP20","make":"TIGI Digital"},{"n":214,"code":"TGCD-NH240-100-B1- 0500","mode":"CC","volt":"AC 220-240V","cur":"0.5A","load":"100W","typo":"Wireless","ip":"IP20","make":"TIGI Digital"},{"n":215,"code":"T5081R","mode":"CC","volt":"AC100-240V","cur":"150-350mA","load":"8-15W","typo":"Wireless [RF]"},{"n":216,"code":"T5081R","mode":"CC","volt":"AC100-240V","cur":"150-350mA","load":"8-15W","typo":"Wireless [RF + BT]"},{"n":217,"code":"T5245R","mode":"CC","volt":"AC100-240V","cur":"400-600mA","load":"12-24W","typo":"Wireless [RF]"},{"n":218,"code":"T5245R","mode":"CC","volt":"AC100-240V","cur":"400-600mA","load":"12-24W","typo":"Wireless [RF + BT]"},{"n":219,"code":"T5151R","mode":"CC","volt":"AC100-240V","cur":"150-300mA","load":"8-15W","typo":"Wireless [RF]"},{"n":220,"code":"T7121B","mode":"CC","volt":"AC100-240V","cur":"150-300mA","load":"8-15W","typo":"Wireless [RF + BT]"},{"n":221,"code":"T5201R","mode":"CC","volt":"AC100-240V","cur":"300-550mA","load":"15-24W","typo":"Wireless [RF]"},{"n":222,"code":"T5201R","mode":"CC","volt":"AC100-240V","cur":"300-550mA","load":"15-24W","typo":"Wireless [RF + BT]"},{"n":223,"code":"T5351R","mode":"CC","volt":"AC100-240V","cur":"350-650mA","load":"18-35W","typo":"Wireless [RF]"},{"n":224,"code":"T5351R","mode":"CC","volt":"AC100-240V","cur":"350-650mA","load":"18-35W","typo":"Wireless [RF + BT]"},{"n":225,"code":"T5352R","mode":"CC","volt":"AC100-240V","cur":"350-650mA","load":"18-35W","typo":"Wireless [RF]"},{"n":226,"code":"T5352R","mode":"CC","volt":"AC100-240V","cur":"350-650mA","load":"18-35W","typo":"Wireless [RF + BT]"},{"n":227,"code":"T5461R","mode":"CC","volt":"AC100-240V","cur":"550-1000mA","load":"23-46W","typo":"Wireless [RF]"},{"n":228,"code":"T5461R","mode":"CC","volt":"AC100-240V","cur":"550-1000mA","load":"23-46W","typo":"Wireless [RF + BT]"},{"n":229,"code":"T5601R","mode":"CC","volt":"AC220-240V","cur":"700-1200mA","load":"30-42V 45-60W","typo":"Wireless [RF]"},{"n":230,"code":"T5601R","mode":"CC","volt":"AC220-240V","cur":"700-1200mA","load":"30-42V 45-60W","typo":"Wireless [RF + BT]"},{"n":231,"code":"T5462R","mode":"CC","volt":"AC100-240V","cur":"550-1100A","load":"25-46W","typo":"Wireless [RF]"},{"n":232,"code":"T5462R","mode":"CC","volt":"AC100-240V","cur":"550-1100A","load":"25-46W","typo":"Wireless [RF + BT]"},{"n":233,"code":"T5072R","mode":"CC","volt":"AC100-240V","cur":"300mA","load":"7W","typo":"Wireless [RF]"},{"n":234,"code":"T5072R","mode":"CC","volt":"AC100-240V","cur":"300mA","load":"7W","typo":"Wireless [RF + BT]"},{"n":235,"code":"T5125R","mode":"CC","volt":"AC100-240V","cur":"300mA","load":"12W","typo":"Wireless [RF]"},{"n":236,"code":"T5125R","mode":"CC","volt":"AC100-240V","cur":"300mA","load":"12W","typo":"Wireless [RF + BT]"},{"n":237,"code":"T5246R","mode":"CC","volt":"AC100-240V","cur":"600mA","load":"24W","typo":"Wireless [RF]"},{"n":238,"code":"T5246R","mode":"CC","volt":"AC100-240V","cur":"600mA","load":"24W","typo":"Wireless [RF + BT]"},{"n":239,"code":"T5402R","mode":"CC","volt":"AC100-240V","cur":"600-1000mA","load":"25-40W","typo":"Wireless [RF]"},{"n":240,"code":"T5402R","mode":"CC","volt":"AC100-240V","cur":"600-1000mA","load":"25-40W","typo":"Wireless [RF + BT]"},{"n":241,"code":"T7461R","mode":"CC","volt":"AC100-240V","cur":"550-1100A","load":"25-46W","typo":"Wireless [RF]"},{"n":242,"code":"T7461R","mode":"CC","volt":"AC100-240V","cur":"550-1100A","load":"25-46W","typo":"Wireless [RF + BT]"},{"n":243,"code":"T71001R","mode":"CC","volt":"AC220-240V","cur":"1400-2000mA","load":"60-100W","typo":"Wireless [RF]"},{"n":244,"code":"T71001R","mode":"CC","volt":"AC220-240V","cur":"1400-2000mA","load":"60-100W","typo":"Wireless [RF + BT]"},{"n":245,"code":"T5071R","mode":"CC","volt":"AC100-240V","cur":"250mA","load":"6-9W","typo":"Wireless [RF]"},{"n":246,"code":"T5071R","mode":"CC","volt":"AC100-240V","cur":"250mA","load":"6-9W","typo":"Wireless [RF + BT]"},{"n":247,"code":"T6071R","mode":"CC","volt":"AC100-240V","cur":"250mA","load":"6-9W","typo":"Wireless [RF]"},{"n":248,"code":"T6071R","mode":"CC","volt":"AC100-240V","cur":"250mA","load":"6-9W","typo":"Wireless [RF + BT]"},{"n":249,"code":"T6072R","mode":"CC","volt":"AC100-240V","cur":"250mA","load":"6-9W","typo":"Wireless [RF]"},{"n":250,"code":"T6072R","mode":"CC","volt":"AC100-240V","cur":"250mA","load":"6-9W","typo":"Wireless [RF + BT]"},{"n":251,"code":"T6201R","mode":"CC","volt":"DC48V","cur":"150-350mA","load":"3-15W","typo":"Wireless [RF]"},{"n":252,"code":"T6201R","mode":"CC","volt":"DC48V","cur":"150-350mA","load":"3-15W","typo":"Wireless [RF + BT]"},{"n":253,"code":"T6202R","mode":"CC","volt":"DC48V","cur":"400-700mA","load":"3-25W","typo":"Wireless [RF]"},{"n":254,"code":"T6202R","mode":"CC","volt":"DC48V","cur":"400-700mA","load":"3-25W","typo":"Wireless [RF + BT]"},{"n":255,"code":"T9072R","mode":"CC","volt":"AC100-240V","cur":"250mA","load":"6-9W","typo":"Wireless [RF]"},{"n":256,"code":"T9072R","mode":"CC","volt":"AC100-240V","cur":"250mA","load":"6-9W","typo":"Wireless [RF + BT]"},{"n":257,"code":"T9071R","mode":"CC","volt":"AC100-240V","cur":"300mA","load":"7W","typo":"Wireless [RF]"},{"n":258,"code":"T9071R","mode":"CC","volt":"AC100-240V","cur":"300mA","load":"7W","typo":"Wireless [RF + BT]"},{"n":259,"code":"T9121R","mode":"CC","volt":"AC100-240V","cur":"300mA","load":"12W","typo":"Wireless [RF]"},{"n":260,"code":"T9121R","mode":"CC","volt":"AC100-240V","cur":"300mA","load":"12W","typo":"Wireless [RF + BT]"},{"n":261,"code":"T9241R","mode":"CC","volt":"AC100-240V","cur":"CW 600mA RGB 350mA","load":"24W","typo":"Wireless [RF]"},{"n":262,"code":"T9241R","mode":"CC","volt":"AC100-240V","cur":"CW 600mA RGB 350mA","load":"24W","typo":"Wireless [RF + BT]"},{"n":263,"code":"T9401R","mode":"CC","volt":"AC100-240V","cur":"CW 1000mA RGB 350mA","load":"25-40W.","typo":"Wireless [RF]"},{"n":264,"code":"T9401R","mode":"CC","volt":"AC100-240V","cur":"CW 1000mA RGB 350mA","load":"25-40W.","typo":"Wireless [RF + BT]"},{"n":265,"code":"T305R","mode":"CC","volt":"DC12V/24V","cur":"20A","load":"400W","typo":"Wireless [RF]"},{"n":266,"code":"T305R","mode":"CC","volt":"DC12V/24V","cur":"20A","load":"400W","typo":"Wireless [RF + BT]"},{"n":267,"code":"T302R","mode":"CC","volt":"DC12V/24V","cur":"10A","load":"200W","typo":"Wireless [RF]"},{"n":268,"code":"T302R","mode":"CC","volt":"DC12V/24V","cur":"10A","load":"200W","typo":"Wireless [RF + BT]"},{"n":269,"code":"T3100R","mode":"CC","volt":"AC100-240V","cur":"20A","load":"500W","typo":"Wireless [RF]"},{"n":270,"code":"T3100R","mode":"CC","volt":"AC100-240V","cur":"20A","load":"500W","typo":"Wireless [RF + BT]"},{"n":271,"code":"T5121R","mode":"CC","volt":"AC100-240V","cur":"180-360mA","load":"8-15W","typo":"Wireless [RF]"},{"n":272,"code":"T5121R","mode":"CC","volt":"AC100-240V","cur":"180-360mA","load":"8-15W","typo":"Wireless [RF + BT]"},{"n":273,"code":"T5123R","mode":"CC","volt":"AC100-240V","cur":"200-400mA","load":"5-10W","typo":"Wireless [RF]"},{"n":274,"code":"T5123R","mode":"CC","volt":"AC100-240V","cur":"200-400mA","load":"5-10W","typo":"Wireless [RF + BT]"},{"n":275,"code":"T5181R","mode":"CC","volt":"AC100-240V","cur":"150-300mA","load":"9-18W","typo":"Wireless [RF]"},{"n":276,"code":"T5181R","mode":"CC","volt":"AC100-240V","cur":"150-300mA","load":"9-18W","typo":"Wireless [RF + BT]"},{"n":277,"code":"T5182R","mode":"CC","volt":"AC100-240V","cur":"350-700mA","load":"9-18W","typo":"Wireless [RF]"},{"n":278,"code":"T5182R","mode":"CC","volt":"AC100-240V","cur":"350-700mA","load":"9-18W","typo":"Wireless [RF + BT]"},{"n":279,"code":"T5241R","mode":"CC","volt":"AC100-240V","cur":"300-600mA","load":"12-24W","typo":"Wireless [RF]"},{"n":280,"code":"T5241R","mode":"CC","volt":"AC100-240V","cur":"300-600mA","load":"12-24W","typo":"Wireless [RF + BT]"},{"n":281,"code":"T5243R","mode":"CC","volt":"AC100-240V","cur":"150-300mA","load":"12-24W","typo":"Wireless [RF]"},{"n":282,"code":"T5243R","mode":"CC","volt":"AC100-240V","cur":"150-300mA","load":"12-24W","typo":"Wireless [RF + BT]"},{"n":283,"code":"T5301R","mode":"CC","volt":"AC220-240V","cur":"350-700mA","load":"15-30W","typo":"Wireless [RF]"},{"n":284,"code":"T5301R","mode":"CC","volt":"AC220-240V","cur":"350-700mA","load":"15-30W","typo":"Wireless [RF + BT]"},{"n":285,"code":"LCM-25DA","load":"25W","typo":"DALI","make":"Meanwell"},{"n":286,"code":"LCM-40DA","load":"40W","typo":"DALI","make":"Meanwell"},{"n":287,"code":"LCM-60DA","load":"60W","typo":"DALI","make":"Meanwell"},{"n":288,"code":"PCD-16-350/700","cur":"350-700mA","load":"16W","typo":"Dimmable","make":"Meanwell"},{"n":289,"code":"PCD-25-350/700","mode":"CC","volt":"https://drive.google.com/file/d/1B4bvR9nq80kp2uGJPkfsC3Sxyq1wy8Gb/view?usp=sharing","cur":"350-700mA","load":"25W","typo":"Dimmable","make":"Meanwell"},{"n":290,"code":"APC-8-250/350/500/700","cur":"250-700mA","load":"8W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":291,"code":"APC-12-350/700","cur":"350-700mA","load":"12W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":292,"code":"APC-16-350/700","cur":"350-700mA","load":"16W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":293,"code":"APC-25-350/500/700","cur":"350-700mA","load":"25W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":294,"code":"APC-35-350/500/700/1050","cur":"350-1050mA","load":"35W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":295,"code":"LPHC-18-350/700","cur":"350-700mA","load":"18W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":296,"code":"LPC-35-700/1050/1400","cur":"700-1400mA","load":"35W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":297,"code":"LPC-60-1050/1400","cur":"1050-1400mA","load":"60W","typo":"ON/OFF","ip":"IP67","make":"Meanwell"},{"n":298,"code":"PLD-40-350/700/1400","cur":"350mA-1400mA","load":"40W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":299,"code":"PLD-60-700/1050/1400","cur":"700-1400mA","load":"60W","typo":"ON/OFF","ip":"IP42","make":"Meanwell"},{"n":300,"code":"LCM-25","load":"25W","typo":"Dimmable","make":"Meanwell"},{"n":301,"code":"LCM-40","load":"40W","typo":"Dimmable","make":"Meanwell"},{"n":302,"code":"SE-12-100-400-G1T","mode":"CC","volt":"9-42V","cur":"100-400mA","load":"0.9-12W","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":303,"code":"SE-20-300-650-G1T","mode":"CC","volt":"9-42V","cur":"300-650mA","load":"2.7-20W","typo":"Triac/ELV","ip":"IP20","make":"LTECH"},{"n":304,"code":"SE-12-100-400-W1DS","mode":"CC","volt":"10-42V","cur":"100-400mA","load":"1-12W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":305,"code":"SE-12-100-450-W2D","mode":"CC","volt":"9-42V","cur":"100-450mA","load":"0.9-12W","typo":"DALI-2 DT8","ip":"IP20","make":"LTECH"},{"n":306,"code":"SE-12-100-500-W1D NFC","mode":"CC","volt":"9-42V","cur":"100-500mA","load":"0.9-12W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":307,"code":"SE-20-100-700-W2D NFC","mode":"CC","volt":"9-42V","cur":"100-700mA","load":"0.9-20W","typo":"DALI-2 DT6/DT8","ip":"IP20","make":"LTECH"},{"n":308,"code":"SE-30-200-800-W2D NFC","mode":"CC","volt":"9-42V","cur":"200-800mA","load":"1.8-30W","typo":"DALI-2 DT6/DT8","ip":"IP20","make":"LTECH"},{"n":309,"code":"SE-12-100-450-W1D","mode":"CC","volt":"9-42V","cur":"200-800mA","load":"1.8-30W","typo":"DALI-2 DT6","ip":"IP20","make":"LTECH"},{"n":314,"code":"LC 20/100-1050/44 o4a NF SR EXC3","mode":"CC","volt":"7.5-30.2V","cur":"600mA","load":"18.1W  21.3W","typo":"Dimmable | DALI","ip":"IP20","make":"Tridonic"},{"n":319,"code":"LCA 60W 24V one4all SC PRE","mode":"CV","volt":"24V","cur":"2500mA","load":"60W","typo":"Dimmable | DALI","ip":"IP20","make":"Tridonic"},{"n":320,"code":"LCA 100W 24V one4all lp PRE","mode":"CV","volt":"24V","cur":"4167mA","load":"100W","typo":"Dimmable | DALI","ip":"IP20","make":"Tridonic"},{"n":321,"code":"LCA 150W 24V one4all SC PRE","mode":"CV","volt":"24V","cur":"6250mA","load":"150W","typo":"Dimmable | DALI","ip":"IP20","make":"Tridonic"},{"n":322,"code":"LD 10/220-240/700 CS IN","mode":"CC","volt":"8-15V","cur":"500mA-700mA","load":"8.25W-10.5W","typo":"ON/OFF","make":"OSRAM"},{"n":323,"code":"LD 15/220-240/350 CS IN","mode":"CC","volt":"200-350mA","load":"8-15W","typo":"ON/OFF","ip":"IP20","make":"OSRAM"},{"n":324,"code":"LD 12/220-240/250","typo":"TRIAC","ip":"IP20","make":"OSRAM"},{"n":325,"code":"OT8/180 PC (OSRAM)","mode":"CC","volt":"100-180mA","load":"4-7.2W","typo":"TRIAC","ip":"IP20","make":"OSRAM"},{"n":326,"code":"LD 15/220-240/700 CS IN","typo":"TRIAC","ip":"IP20","make":"OSRAM"},{"n":328,"code":"LF-GIR013YS0250H","mode":"CC","volt":"25-42V","cur":"250mA","load":"10.5W","typo":"ON/OFF","ip":"IP20","make":"Lifud"},{"n":329,"code":"HC0812A1","mode":"CC","volt":"27-40V"},{"n":330,"code":"10288698","mode":"CC","volt":"380VAC","load":"18-24W","make":"Bag"},{"n":331,"code":"10286670","load":"12W","make":"Bag"},{"n":332,"code":"10328066","make":"Bag"},{"n":333,"code":"10328067","make":"Bag"},{"n":334,"code":"10328069","make":"Bag"},{"n":335,"code":"C012C030V040FNP7AIC2","cur":"300MA","load":"15W","typo":"ON/OFF","ip":"IP20","make":"PHILIPS"},{"n":336,"code":"10328065","mode":"CC","volt":"9-42V","cur":"100-200mA","load":"12W","typo":"DALI-2 DT6","ip":"IP20","make":"BAG"},{"n":337,"code":"ALD18-40050BIS","mode":"CC","volt":"30-40V","cur":"500mA","load":"20W","typo":"Dimmable | TRIAC","ip":"IP20","make":"Allooking"},{"n":339,"code":"T32200B","volt":"100-240V","typo":"TIGIDIGITAL"},{"n":340,"code":"AL-72","volt":"30-44V"},{"n":341,"code":"KEDH009S0150NR12A7"},{"n":342,"code":"KEDH021S0500NR19A9"},{"n":343,"code":"KEDH009S0200NR12A7"},{"n":344,"code":"KEDH012S0250NR12A7"},{"n":345,"code":"DF08-12W"},{"n":346,"code":"C012C030V040FNM1B1"},{"n":347,"code":"T305B"},{"n":348,"code":"LF-GIR022YM0450H"},{"n":349,"code":"LS-8-120-S12 E"},{"n":350,"code":"LS-6-150-SI E"},{"n":351,"code":"LD 24/220-240/24 IN"},{"n":352,"code":"ALF12-40030TKBIS"},{"n":353,"code":"ALF30-40075TKBIS"},{"n":354,"code":"HC0103A1"},{"n":355,"code":"GB/T19001-2016/ISO9001"},{"n":356,"code":"GC6862-DALI"},{"n":357,"code":"OT FIT 18/220-240/450 cs pc (0)"},{"n":372,"code":"OTz 50/220-240/24","load":"50W","make":"Osram"},{"n":373,"code":"OTi DALI 35/220-240/700","make":"Osram"},{"n":398,"code":"NT-FO-240PB-482","mode":"CV","volt":"12VDC","cur":"16.6A","load":"200w","typo":"POWER","ip":"IP20"},{"n":402,"code":"Transformer [Below-1 KVA].100W","mode":"CV","volt":"Multitap","load":"100W","typo":"Transformer [Below-1 KVA]","ip":"IP20","make":"Energymax"},{"n":403,"code":"Transformer [Below-1 KVA].200W","mode":"CV","volt":"Multitap","load":"300W","typo":"Transformer [Below-1 KVA]","ip":"IP20","make":"Energymax"},{"n":404,"code":"TGSC-240-12/24-20","load":"240W","typo":"Dimmable","make":"TIGI"},{"n":405,"code":"T9071B","make":"TIGI"},{"n":406,"code":"T9151R","make":"TIGI"},{"n":407,"code":"OT/DALI 35/220-240/700 NFC TW L","mode":"CC","volt":"15-54V","cur":"200mA","load":"38W","typo":"DALI"},{"n":408,"code":"OT/DALI 80/220-240/24 4CH DT6/DT8","mode":"CV","volt":"24.2V","cur":"390mA","load":"80W","typo":"DALI"},{"n":409,"code":"X150C070V210FNI1B0","make":"Philips"},{"n":410,"code":"10328075","volt":"240V","make":"Dali"},{"n":411,"code":"T7091B","mode":"CV","volt":"12V","make":"TIGI"},{"n":413,"code":"XN-H6015MT-1-0.35A","mode":"CC","volt":"100-240V","cur":"350mA","load":"upto 15W","typo":"MATTER"},{"n":414,"code":"ZM-H6046MT-2-0.7A","mode":"CC","volt":"100-240V","cur":"700mA","load":"upto 30W","typo":"MATTER"},{"n":415,"code":"ZM-H6046MT-2-1.0A","mode":"CC","volt":"100-240V","cur":"1000mA","load":"upto 40W","typo":"MATTER"},{"n":417,"code":"T7241B","mode":"CC","volt":"AC220-240V","cur":"300-600mA","load":"12-24W","typo":"Wireless [RF + BT]"},{"n":418,"code":"T6091B"},{"n":419,"code":"T7091B"}];
/* Variant options per housing: beam angle, mounting trim, reflector colour, body colour, mount */
const VARIANT_OPTIONS={"21":[["15","24","36"],[],[],[],[]],"66":[["24","15","36"],["Trim | White","Trim | Non Standardised colour","Trimless"],["Gun Metal","Chrome","Black chome[On-demand]","Matt Black[On-demand]","Champange gold[On-demand]"],[],[]],"1":[["15","24","36"],["Trim | White","Trim-less","Trim | Non Standardised colour"],["Gun Metal","Chrome"],[],[]],"2":[["24"],[],["Black","White","Champagne Gold","Chrome","Gun Metal","Rose Gold"],["White","Black"],[]],"3":[["12"],["Trim | White","Trim | Non Standardised colour"],["Chrome"],[],[]],"4":[["15","24","36"],[],["Gun Metal","White","Gold"],[],[]],"5":[["15","24","36"],[],["Gun Metal","White","Gold"],[],[]],"6":[["45"],["Trim | White"],["White","Chrome"],[],[]],"7":[["24"],["Trim | White","Trim | Non Standardised colour","Trim-less"],["Gun Metal","Matt Black [On-demand]"],[],[]],"8":[["24"],["Trim | White","Trim | Non Standardised colour","Trim-less"],["Gun Metal","Matt Black [On-demand]"],[],[]],"9":[["24"],["Trim | White","Trim | Non Standardised colour","Trim-less"],["Gun Metal","Matt Black [On-demand]"],[],[]],"10":[[],["Trim | White","Trim | Non Standardised colour","Trim-less"],["Chrome","Gun Metal","White","Black"],[],[]],"11":[["15","24","36"],[],["Black","White","Champagne Gold","Chrome","Gun Metal","Rose Gold"],["White","Black"],[]],"12":[["15","24","36"],[],["Black","White","Champagne Gold","Chrome","Gun Metal","Rose Gold"],["White","Black"],[]],"14":[["15","24","36"],["Trim | White","Trim | Non Standardised colour","Trim-less"],["Gun-Metal"],[],[]],"51":[["12-45"],["Trim","Trim-less"],[],["Black","White","Non-Standardised Colour"],[]],"110":[["8","15","24","36"],[],[],["Grey"],[]],"116":[["24"],[],[],["Grey"],["Stake Mounted","Wall Mounted"]],"64":[["15-60"],[],[],["Grey"],["Ceiling Surface","Ceiling Track","Ceiling Recessed"]]};

const CONFIG = {
  COMPANY: "Retina Lighting",
  APP_NAME: "Retina Inventory",
};

const OUT_TYPES = ["For Sale", "Production", "Sample", "Internal Use", "Damaged / Scrap"];
const IN_TYPES = [
  "Finished Purchase | Import",
  "Finished Purchase | Local",
  "SKD/CKD Purchase | Import",
  "SKD/CKD Purchase | Local",
  "In-house",
];

/* The housing / LED / driver compatibility rule goes here once you define it.
   Return { ok: false, note: "why" } to warn or block a combination. */
const checkCompat = (/* h, l, d */) => ({ ok: true, note: "" });

/* ---------- product code helpers ---------- */
const buildCode = ({ h = 0, v = "", l = 0, d = 0 }) => `D${h || 0}${h ? v : ""}.${l || 0}.${d || 0}`;

function parseCode(raw) {
  const s = String(raw || "").trim();
  let m = s.match(/^D(\d+)([a-z]*)\.(\d+)\.(\d+)$/);
  if (m) return { h: +m[1], v: m[2], l: +m[3], d: +m[4] };
  m = s.match(/^D\.(\d+)\.(\d+)(?:\.(\d+))?$/); // old sale-log style
  if (m) return { h: +m[1], v: "", l: +m[2], d: m[3] ? +m[3] : 0 };
  return null;
}
const normCode = (raw) => {
  const p = parseCode(raw);
  return p ? buildCode(p) : String(raw || "").trim();
};

/* variant letters: a…z, aa, ab … */
const letters = (i) => {
  let n = i + 1, s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(97 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};
const SUFFIX = ["", "", " reflector", " body", ""];
const optLabel = (k, x) => (k === 0 && /^\d+(-\d+)?$/.test(x) ? `${x}°` : `${x}${SUFFIX[k]}`);

/* Housing-specific variant fields. Empty fields are NOT included in a housing's SKU.
   PDF sequence convention skips f-m (a,b,c,d,e,n,o,...).
   Housing-specific order matches the supplied variant sheet where verified. */
const FIELD_KEYS = ["beam", "trim", "reflector", "body", "mount"];
const FIELD_NAMES = ["Beam angle", "Mounting trim", "Reflector colour", "Body colour", "Mount"];
const sequenceAt = (i) => i < 5 ? "abcde"[i] : letters(i + 8);
function makeCombos(opts, housing) {
  if (!opts) return [];
  const active = opts.map((values, k) => ({ k, values })).filter(x => x.values.length);
  if (!active.length) return [];
  // Source sheet sequences vary by housing; they are not alphabetical permutations.
  const orderByHousing = {
    "1": [0, 1, 2], "2": [3, 2, 0], "3": [1, 2, 0],
    "4": [0, 2], "5": [0, 2], "6": [0, 1, 2],
    "7": [1, 2, 0], "8": [1, 2, 0], "9": [1, 2, 0],
    "10": [1, 2], "11": [0, 2, 3], "66": [0, 1, 2],
    "21": [0],
  };
  const order = orderByHousing[String(housing)] || active.map(x => x.k);
  const lists = order.filter(k => opts[k]?.length).map(k => opts[k].map(x => ({ k, x, label: optLabel(k, x) })));
  let combinations = [[]];
  lists.forEach(list => { combinations = combinations.flatMap(parts => list.map(item => [...parts, item])); });
  return combinations.map((parts, i) => {
    const fields = {};
    parts.forEach(({k,x}) => { fields[FIELD_KEYS[k]] = x; });
    return { letter: sequenceAt(i), label: parts.map(x => x.label).join(" · "), fields };
  });
}

/* ---------- misc helpers ---------- */
const round = (n) => Math.round(n * 1000) / 1000;
const fmtQty = (n) => (Number.isInteger(n) ? String(n) : String(round(n)));
const todayStr = () => new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
const fmtDateTime = (iso) => {
  try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};

const seedMovements = () => {
  const t = new Date().toISOString();
  const open = { "D1.0.0": 40, "D1a.0.0": 12, "D1b.0.0": 3, "D5.0.0": 20, "D0.1.0": 150, "D0.2.0": 12, "D0.0.1": 100, "D0.0.12": 6, "D1a.1.1": 5, "D0.0.106": 8 };
  return Object.entries(open).map(([sku, qty], i) => ({ id: `seed-${i}`, ts: t, kind: "IN", ref: "OPENING", sku, type: "In-house", qty, by: "Demo" }));
};


/* ---------- icons ---------- */
const CatIcon = ({ cat, size = 56 }) => {
  const s = { width: size, height: size };
  const c = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (cat === "LED")
    return (<svg viewBox="0 0 64 64" style={s} {...c}><rect x="12" y="12" width="40" height="40" rx="6" /><circle cx="32" cy="32" r="11" /><circle cx="32" cy="32" r="4" fill="currentColor" /><path d="M6 22h6M6 42h6M52 22h6M52 42h6" /></svg>);
  if (cat === "Driver")
    return (<svg viewBox="0 0 64 64" style={s} {...c}><rect x="8" y="18" width="48" height="28" rx="5" /><path d="M16 26h10M16 32h16M16 38h8" /><path d="M42 26l-4 6h6l-4 6" /><path d="M4 28h4M4 36h4M56 28h4M56 36h4" /></svg>);
  if (cat === "In stock")
    return (<svg viewBox="0 0 64 64" style={s} {...c}><path d="M8 22l24-12 24 12v22L32 56 8 44z" /><path d="M8 22l24 12 24-12M32 34v22" /></svg>);
  if (cat === "All")
    return (<svg viewBox="0 0 64 64" style={s} {...c}><rect x="10" y="10" width="18" height="18" rx="4" /><rect x="36" y="10" width="18" height="18" rx="4" /><rect x="10" y="36" width="18" height="18" rx="4" /><rect x="36" y="36" width="18" height="18" rx="4" /></svg>);
  return (<svg viewBox="0 0 64 64" style={s} {...c}><path d="M10 14h44" /><path d="M16 14l4 12h24l4-12" /><ellipse cx="32" cy="38" rx="14" ry="5" /><path d="M18 38v6c0 3 6 6 14 6s14-3 14-6v-6" /></svg>);
};
const Brand = () => (
  <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
    <circle cx="20" cy="20" r="19" fill="#F6A800" /><circle cx="20" cy="20" r="12" fill="none" stroke="#122033" strokeWidth="2.4" /><circle cx="20" cy="20" r="5" fill="#122033" />
  </svg>
);

/* ---------- qty stepper (supports decimals) ---------- */
function Stepper({ value, onChange, max }) {
  const [text, setText] = useState(fmtQty(value));
  useEffect(() => { if (parseFloat(text) !== value) setText(fmtQty(value)); }, [value]); // eslint-disable-line
  const clamp = (v) => (max != null ? Math.min(max, v) : v);
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(Math.max(0, round(value - 1)))}>−</button>
      <input
        inputMode="decimal" aria-label="Quantity" value={text}
        onChange={(e) => { const raw = e.target.value.replace(/[^0-9.]/g, ""); setText(raw); const v = parseFloat(raw); onChange(isNaN(v) ? 0 : clamp(round(v))); }}
        onBlur={() => setText(fmtQty(value))}
      />
      <button type="button" aria-label="Increase quantity" disabled={max != null && value >= max} onClick={() => onChange(clamp(round(value + 1)))}>+</button>
    </div>
  );
}

/* ---------- product card ---------- */
function ProductCard({ item, stockOf, mode, cart, onSet, comboMap, imageFor, onDetails }) {
  const [failedImageUrl, setFailedImageUrl] = useState("");
  const [v, setV] = useState("");
  const out = mode === "OUT";
  const code = item.kind === "housing" ? buildCode({ h: item.n, v }) : item.code;
  const stock = stockOf(code);
  const qty = cart[code] || 0;
  const empty = out && stock <= 0;
  const combos = item.kind === "housing" ? comboMap[item.n] : null;
  const imageUrl = imageFor(code, item);
  return (
    <article className={`card ${empty ? "is-empty" : ""}`}>
      <div className="thumb" role="button" tabIndex={0} aria-label={`View details for ${item.title}`} onClick={() => onDetails(item, v)} onKeyDown={(e) => { if(e.key === "Enter" || e.key === " "){e.preventDefault();onDetails(item,v)} }}>
        {imageUrl && failedImageUrl !== imageUrl ? <img key={imageUrl} src={imageUrl} alt={item.title} loading="lazy" onError={() => setFailedImageUrl(imageUrl)} style={{width:"100%",height:"100%",objectFit:"contain",padding:8,boxSizing:"border-box"}} /> : <CatIcon cat={item.cat} />}
        <span className={`stock ${stock <= 0 ? "zero" : stock <= 5 ? "low" : ""}`}>{stock <= 0 ? "Out of stock" : `${fmtQty(stock)} in stock`}</span>
      </div>
      <div className="meta">
        <h3>{item.title}</h3>
        <p className="sku">{item.kind === "code" ? code : `No. ${item.n}${v ? ` · variant ${v}` : ""}`}</p>
        <p className="grp">{item.sub}</p>
      </div>
      {combos && combos.length > 0 && (
        <select className="vsel" aria-label="Variant" value={v} onChange={(e) => setV(e.target.value)}>
          <option value="">No variant</option>
          {combos.map((c) => <option key={c.letter} value={c.letter}>{c.letter} — {c.label}</option>)}
        </select>
      )}
      <button type="button" className="detail-link" onClick={() => onDetails(item,v)}>View technical details →</button>
      <div className="act">
        {qty > 0 ? (
          <Stepper value={qty} max={out ? stock : undefined} onChange={(q) => onSet(code, q)} />
        ) : (
          <button className="add" disabled={empty} onClick={() => onSet(code, 1)}>{empty ? "Unavailable" : out ? "Check out" : "Check in"}</button>
        )}
      </div>
    </article>
  );
}

/* ---------- technical product detail / ERCO-inspired system overview ---------- */
function ProductDetail({ item, initialVariant, onClose, data, comboMap, imageFor, stockOf, mode, cart, onSet, onOpenCart }) {
  const [variant, setVariant] = useState(initialVariant || "");
  const [led, setLed] = useState(0);
  const [driver, setDriver] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setVariant(initialVariant || ""); setLed(0); setDriver(0); setFailed(false); }, [item, initialVariant]);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!item) return null;
  const housing = item.kind === "housing";
  const code = housing ? buildCode({h:item.n,v:variant,l:led,d:driver}) : item.code;
  const imageUrl = imageFor(code,item) || imageFor(housing ? buildCode({h:item.n}) : item.code,item);
  const stock = stockOf(code);
  const qty = cart[code] || 0;
  const blocked = mode === "OUT" && stock <= 0;
  const combos = housing ? (comboMap[item.n] || []) : [];
  const chosen = combos.find(c => c.letter === variant);
  const spec = housing ? data.H.find(h => h.n === item.n) || {} : (item.kind === "led" ? data.L.find(l=>l.n===item.n)||{} : data.D.find(d=>d.n===item.n)||{});
  const compat = housing ? checkCompat(item.n,led,driver) : {ok:true};
  const facts = housing ? [
    ["Housing number",item.n],["Mounting",spec.mount],["Adjustment",spec.aim],["IP protection",spec.ip],
    ["Power / heat",spec.heat],["Beam angle",chosen?.fields?.beam ? `${chosen.fields.beam}°` : spec.beam],
    ["Dimensions",spec.dim],["Shape",spec.shape],["Family",spec.fam],["Type",spec.type],
    ["Driver location",spec.ri],["Country",spec.c]
  ] : [["Number",item.n],["Type",spec.kind||spec.mode],["Power",spec.w||spec.load],["Voltage",spec.volt],["CCT",spec.cct],["Manufacturer",spec.make],["Code",spec.code]];
  return <div className="pd-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section className="pd-panel" role="dialog" aria-modal="true" aria-label={`${item.title} technical details`}>
      <div className="pd-top"><div><span className="pd-eyebrow">RETINA LIGHTING · TECHNICAL CATALOGUE</span><h2>{item.title}</h2><p>System overview · {housing ? `Housing ${item.n}` : item.cat || item.kind}</p></div><button className="pd-close" onClick={onClose} aria-label="Close product details">✕</button></div>
      <div className="pd-hero"><div className="pd-photo">{imageUrl && !failed ? <img src={imageUrl} alt={item.title} onError={()=>setFailed(true)} /> : <CatIcon cat={item.cat || "Housing"} size={74}/>}</div>
        <div className="pd-hero-copy"><div className="pd-label">Product identification</div><div className="pd-code">{code}</div><p>{item.sub || "Configure and review this product before adding it to inventory."}</p><div className="pd-stock">{stock > 0 ? `${fmtQty(stock)} in stock` : "Out of stock"}</div><p className="pd-note">Stock shown for the exact selected SKU.</p></div></div>
      <h3 className="pd-heading">Technical specifications</h3><div className="pd-facts">{facts.filter(([k,v])=>v!==undefined && v!==null && v!=="").map(([k,v])=><div className="pd-fact" key={k}><span>{k}</span><strong>{String(v)}</strong></div>)}</div>
      <h3 className="pd-heading">Construction & optical system</h3><div className="pd-schematics">
        <div className="pd-schematic"><strong>Construction / dimensions</strong><svg viewBox="0 0 280 125" role="img" aria-label="Conceptual recessed luminaire construction diagram; not to scale"><path d="M18 39 H262" stroke="#777" strokeWidth="3"/><path d="M91 39 L104 59 L176 59 L189 39" fill="none" stroke="#334155" strokeWidth="3"/><path d="M106 59 L118 100 L162 100 L174 59" fill="none" stroke="#334155" strokeWidth="3"/><path d="M118 100 H162" stroke="#334155" strokeWidth="3"/><path d="M95 17 H185 M95 12 V22 M185 12 V22" stroke="#94a3b8" strokeWidth="2"/><text x="140" y="12" textAnchor="middle" fontSize="10" fill="#64748b">width / diameter</text><path d="M204 40 V101 M199 40 H209 M199 101 H209" stroke="#94a3b8" strokeWidth="2"/><text x="213" y="75" fontSize="10" fill="#64748b">height</text></svg><small>Illustrative diagram only — not a dimensioned engineering drawing.</small><p>{spec.dim || "Dimension drawing not yet uploaded."}</p></div>
        <div className="pd-schematic"><strong>Light distribution</strong><svg viewBox="0 0 280 125" role="img" aria-label="Conceptual beam spread diagram; not photometric data"><rect x="124" y="10" width="32" height="16" rx="4" fill="#64748b"/><path d="M124 26 L45 112 H235 L156 26 Z" fill="#fde68a" fillOpacity=".55" stroke="#d4a017" strokeWidth="1.5"/><path d="M25 112 H255" stroke="#64748b" strokeWidth="2" strokeDasharray="5 4"/></svg><small>Conceptual beam illustration — not a measured photometric diagram.</small><p>Beam: {chosen?.fields?.beam ? `${chosen.fields.beam}°` : spec.beam || "Photometric data not available"}</p></div>
      </div>
      {housing && <><h3 className="pd-heading">Configure product</h3><div className="pd-config"><label>Housing variant<select value={variant} onChange={e=>setVariant(e.target.value)}><option value="">No variant</option>{combos.map(c=><option key={c.letter} value={c.letter}>{c.letter} — {c.label}</option>)}</select></label><label>LED<select value={led} onChange={e=>setLed(Number(e.target.value))}><option value={0}>No LED (housing only)</option>{data.L.map(l=><option key={l.n} value={l.n}>LED {l.n} — {l.name}</option>)}</select></label><label>Driver<select value={driver} onChange={e=>setDriver(Number(e.target.value))}><option value={0}>No driver</option>{data.D.map(d=><option key={d.n} value={d.n}>Driver {d.n} — {d.code || d.name || "Driver"}</option>)}</select></label></div>{!compat.ok && <p className="pd-warning">{compat.note}</p>}</>}
      <h3 className="pd-heading">Performance & documentation</h3><div className="pd-docs"><div><strong>Light colour / CCT</strong><p>{led ? (data.L.find(l=>l.n===led)?.cct || "Not specified") : "Select an LED to see available data"}</p></div><div><strong>Driver / control</strong><p>{driver ? (data.D.find(d=>d.n===driver)?.mode || "Selected driver") : (spec.ri || "Select a driver")}</p></div><div><strong>Photometric data</strong><p>Lux tables, IES/LDT and measured distribution not yet provided.</p></div></div>
      <div className="pd-footer"><div><small>Selected SKU</small><strong>{code}</strong><span>{stock > 0 ? `${fmtQty(stock)} available` : "No stock available"}</span></div><div className="pd-actions">{qty > 0 ? <Stepper value={qty} max={mode==="OUT" ? stock : undefined} onChange={q=>onSet(code,q)}/> : <button className="pd-add" disabled={blocked || !compat.ok} onClick={()=>onSet(code,1)}>{blocked ? "Unavailable" : mode === "OUT" ? "Add to check-out" : "Add to check-in"}</button>}<button className="pd-cart" onClick={onOpenCart}>View cart</button></div></div>
    </section>
  </div>;
}

/* ---------- table row (products) ---------- */
function ItemRow({ item, stockOf, mode, cart, onSet, comboMap, imageFor }) {
  const [v, setV] = useState("");
  const out = mode === "OUT";
  const code = item.kind === "housing" ? buildCode({ h: item.n, v }) : item.code;
  const stock = stockOf(code);
  const qty = cart[code] || 0;
  const empty = out && stock <= 0;
  const combos = item.kind === "housing" ? comboMap[item.n] : null;
  return (
    <tr className={empty ? "is-empty" : ""}>
      {item.cells.map((c, i) => (
        <React.Fragment key={i}>
          <td className={i === 0 ? "num" : ""}>{c}</td>
          {i === 0 && item.kind === "housing" && (
            <td className="photo">{imageFor(code, item) ? <img src={imageFor(code, item)} alt={item.title} loading="lazy" onError={e=>{e.currentTarget.style.display="none"}} /> : item.img ? <img src={item.img} alt="" loading="lazy" /> : <CatIcon cat="Housing" size={28} />}</td>
          )}
        </React.Fragment>
      ))}
      {item.kind === "housing" && (
        <td>
          {combos && combos.length > 0 ? (
            <select className="vsel" aria-label={`Variant for housing ${item.n}`} value={v} onChange={(e) => setV(e.target.value)}>
              <option value="">No variant</option>
              {combos.map((c) => <option key={c.letter} value={c.letter}>{c.letter} — {c.label}</option>)}
            </select>
          ) : <span className="dim">—</span>}
        </td>
      )}
      <td className={`r stk ${stock <= 0 ? "zero" : stock <= 5 ? "low" : ""}`}>{fmtQty(stock)}</td>
      <td className="actcell">
        {qty > 0 ? <Stepper value={qty} max={out ? stock : undefined} onChange={(q) => onSet(code, q)} />
          : <button className="add" disabled={empty} onClick={() => onSet(code, 1)}>{empty ? "Unavailable" : out ? "Check out" : "Check in"}</button>}
      </td>
    </tr>
  );
}

/* ---------- variants tab ---------- */
function VariantRow({ row, stockOf, mode, cart, onSet }) {
  const out = mode === "OUT";
  const code = buildCode({ h: row.h, v: row.c.letter });
  const stock = stockOf(code);
  const qty = cart[code] || 0;
  const empty = out && stock <= 0;
  const f = row.c.fields;
  return (
    <tr className={empty ? "is-empty" : ""}>
      <td className="num">{row.h}</td>
      <td>{row.name}</td>
      <td><span className="vletter">{row.c.letter}</span></td>
      <td>{f.beam ? optLabel(0, f.beam) : "—"}</td>
      <td>{f.trim || "—"}</td>
      <td>{f.reflector || "—"}</td>
      <td>{f.body || "—"}</td>
      <td>{f.mount || "—"}</td>
      <td className={`r stk ${stock <= 0 ? "zero" : stock <= 5 ? "low" : ""}`}>{fmtQty(stock)}</td>
      <td className="actcell">
        {qty > 0 ? <Stepper value={qty} max={out ? stock : undefined} onChange={(q) => onSet(code, q)} />
          : <button className="add" disabled={empty} onClick={() => onSet(code, 1)}>{empty ? "Unavailable" : out ? "Check out" : "Check in"}</button>}
      </td>
    </tr>
  );
}

function VariantsView({ data, comboMap, query, stockOf, mode, cart, onSet }) {
  const [hf, setHf] = useState("1");
  const hBy = useMemo(() => Object.fromEntries(data.H.map(x => [x.n, x])), [data.H]);
  const housings = useMemo(() => Object.keys(comboMap).map(Number).filter(n => hBy[n] && comboMap[n].length).sort((a,b) => a-b), [comboMap, hBy]);
  const selected = housings.includes(Number(hf)) ? Number(hf) : housings[0];
  const opts = data.V?.[selected] || [[],[],[],[],[]];
  const active = FIELD_KEYS.map((key,i) => ({key, label:FIELD_NAMES[i], values:opts[i] || []})).filter(x => x.values.length);
  const rows = (comboMap[selected] || []).filter(c => !query.trim() || `${selected} ${hBy[selected]?.name} ${c.letter} ${c.label}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="variant-workspace">
    <div className="ledger-bar"><h2 className="gh first">Variants database</h2>
      <select className="vfilter" value={selected || ""} onChange={e => setHf(e.target.value)} aria-label="Choose housing">
        {housings.map(h => <option key={h} value={h}>Housing #{h} — {hBy[h]?.name}</option>)}
      </select><span className="count">{rows.length} combinations</span>
    </div>
    <p className="hint">Each housing has its own variant fields. Only applicable specifications are shown. Sequence codes are kept separate from LED and driver SKUs.</p>
    <div className="variant-summary">
      <strong>Housing #{selected}</strong><span>{hBy[selected]?.name}</span>
      <span className="variant-tags">{active.map(a => <span key={a.key} className="variant-tag">{a.label}: {a.values.length} options</span>)}</span>
    </div>
    <div className="tablewrap"><table className="dtable"><thead><tr>
      <th>Housing #</th><th>Sequence</th>{active.map(a => <th key={a.key}>{a.label}</th>)}<th>Variant SKU</th><th className="r">Stock</th><th>Action</th>
    </tr></thead><tbody>{rows.map(c => {
      const code = buildCode({h:selected,v:c.letter});
      const stock = stockOf(code); const qty = cart[code] || 0; const unavailable = mode === "OUT" && stock <= 0;
      return <tr key={`${selected}-${c.letter}`}><td className="num">{selected}</td><td><span className="vletter">{c.letter}</span></td>
        {active.map(a => <td key={a.key}>{a.key === "beam" && c.fields[a.key] ? `${c.fields[a.key]}°` : c.fields[a.key] || "—"}</td>)}
        <td><code>{code}</code></td><td className="r">{fmtQty(stock)}</td>
        <td className="actcell">{qty > 0 ? <Stepper value={qty} max={mode === "OUT" ? stock : undefined} onChange={q => onSet(code,q)}/> : <button className="add" disabled={unavailable} onClick={() => onSet(code,1)}>{unavailable ? "Unavailable" : mode === "OUT" ? "Check out" : "Check in"}</button>}</td>
      </tr>;
    })}</tbody></table></div>
    <p className="hint">Note: Housing configurations beyond those shown in the supplied PDF use the options embedded in your existing frontend and should be verified against the full source sheet before operational use.</p>
  </section>;
}

/* ---------- searchable picker for the builder ---------- */
function Picker({ label, items, value, onChange, optional }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const sel = items.find((i) => i.n === value);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => !s || i.hay.includes(s)).slice(0, 8);
  }, [items, q]);
  return (
    <div className="fld picker">
      <span>{label}{optional ? " (optional)" : ""}</span>
      {sel ? (
        <div className="picked">
          <div><b>{sel.n}</b> {sel.label}<small>{sel.sub}</small></div>
          <button type="button" onClick={() => { onChange(0); setQ(""); }}>Change</button>
        </div>
      ) : (
        <div className="pwrap">
          <input value={q} placeholder={optional ? "None — search to add one" : "Search by number or name"} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} />
          {open && (
            <ul>
              {matches.length === 0 && <li className="none">No match</li>}
              {matches.map((m) => (
                <li key={m.n}><button type="button" onClick={() => { onChange(m.n); setOpen(false); setQ(""); }}><b>{m.n}</b> {m.label}<small>{m.sub}</small></button></li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- builder: compose a product code ---------- */
function Builder({ mode, data, comboMap, stockOf, cart, onSet, titleOf }) {
  const [h, setH] = useState(0);
  const [v, setV] = useState("");
  const [l, setL] = useState(0);
  const [d, setD] = useState(0);
  const out = mode === "OUT";
  const hItems = useMemo(() => data.H.map((x) => ({ n: x.n, label: x.name, sub: [x.beam, x.mount, x.ip].filter(Boolean).join(" · "), hay: `${x.n} ${x.name} ${x.fam}`.toLowerCase() })), [data]);
  const lItems = useMemo(() => data.L.map((x) => ({ n: x.n, label: x.name, sub: [x.kind, x.w, x.make].filter(Boolean).join(" · "), hay: `${x.n} ${x.name} ${x.make}`.toLowerCase() })), [data]);
  const dItems = useMemo(() => data.D.map((x) => ({ n: x.n, label: x.code, sub: [x.mode, x.volt, x.load, x.make].filter(Boolean).join(" · "), hay: `${x.n} ${x.code} ${x.make}`.toLowerCase() })), [data]);
  const combos = h ? comboMap[h] || [] : [];
  useEffect(() => { setV(""); }, [h]);

  const ready = h || l || d;
  const code = buildCode({ h, v, l, d });
  const stock = stockOf(code);
  const qty = cart[code] || 0;
  const compat = checkCompat(h, l, d);
  const blocked = out && stock <= 0;

  return (
    <div className="build">
      <div className="bcol">
        <h2 className="gh first">Compose a product</h2>
        <p className="hint">Pick a housing, LED and driver. Leave any out to check in or out a single part.</p>
        <Picker label="Housing" items={hItems} value={h} onChange={setH} optional />
        {combos.length > 0 && (
          <div className="fld">
            <span>Variant for housing {h}</span>
            <div className="vgrid">
              <button type="button" className={`vopt ${v === "" ? "on" : ""}`} onClick={() => setV("")}><b>–</b> No variant</button>
              {combos.map((c) => (
                <button type="button" key={c.letter} className={`vopt ${v === c.letter ? "on" : ""}`} onClick={() => setV(c.letter)}><b>{c.letter}</b> {c.label}</button>
              ))}
            </div>
          </div>
        )}
        <Picker label="LED" items={lItems} value={l} onChange={setL} optional />
        <Picker label="Driver" items={dItems} value={d} onChange={setD} optional />
      </div>
      <aside className="bsum">
        <small>Product code</small>
        <div className="codebox">{ready ? code : "D0.0.0"}</div>
        {ready ? <p className="bt">{titleOf(code)}</p> : <p className="hint">Choose at least one part.</p>}
        {ready > 0 && (
          <>
            <p className={`bs ${stock <= 0 ? "zero" : ""}`}>{stock <= 0 ? "None in stock" : `${fmtQty(stock)} in stock`}</p>
            {!compat.ok && <p className="warn">{compat.note}</p>}
            {qty > 0 ? (
              <Stepper value={qty} max={out ? stock : undefined} onChange={(q) => onSet(code, q)} />
            ) : (
              <button className="primary wide" disabled={blocked || !compat.ok} onClick={() => onSet(code, 1)}>{blocked ? "Not in stock" : out ? "Add to check-out" : "Add to check-in"}</button>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

/* ---------- cart drawer ---------- */
function CartDrawer({ open, onClose, mode, lines, stockOf, onSet, onClear, onSubmit, busy, purchases, selectedPurchase, onSelectPurchase, remainingFor }) {
  const out = mode === "OUT";
  const [ref, setRef] = useState("");
  const [type, setType] = useState(out ? OUT_TYPES[0] : IN_TYPES[0]);
  const [by, setBy] = useState(() => safeLS.get("retina_name") || "");
  useEffect(() => { setType(out ? OUT_TYPES[0] : IN_TYPES[0]); setRef(""); }, [out]);
  const over = out ? lines.filter((l) => l.qty > stockOf(l.sku)) : [];
  const activeRef = out ? ref.trim() : selectedPurchase;
  const overPurchase = !out && lines.some(l => l.qty > remainingFor(selectedPurchase, l.sku));
  const canSubmit = lines.length > 0 && activeRef && by.trim() && over.length === 0 && !overPurchase && !busy;
  const total = lines.reduce((s, l) => s + l.qty, 0);
  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <header><h2>{out ? "Check-out" : "Check-in"} cart</h2><button className="icon" onClick={onClose} aria-label="Close cart">✕</button></header>
        {lines.length === 0 ? (
          <div className="empty"><CatIcon cat="All" size={48} /><p>Nothing here yet. Add products to {out ? "check them out" : "check them in"}.</p></div>
        ) : (
          <ul className="lines">
            {lines.map((l) => (
              <li key={l.sku}>
                <div><b>{l.title}</b><small>{l.sku}{out && l.qty > stockOf(l.sku) ? " · exceeds stock" : ""}</small></div>
                <Stepper value={l.qty} max={out ? stockOf(l.sku) : undefined} onChange={(q) => onSet(l.sku, q)} />
              </li>
            ))}
          </ul>
        )}
        <div className="form">
          {out ? <label className="fld"><span>Sale invoice / issue reference</span><input value={ref} onChange={e=>setRef(e.target.value)} placeholder="OUT-2026-001" /></label>
            : <label className="fld"><span>Uploaded purchase / PO</span><select value={selectedPurchase} onChange={e=>onSelectPurchase(e.target.value)}><option value="">Select uploaded purchase</option>{purchases.map(p=><option key={p.ref} value={p.ref}>{p.ref}</option>)}</select></label>}
          {overPurchase && <p style={{color:"#b91c1c"}}>Cart contains an SKU not on this purchase or quantity exceeds remaining purchased stock.</p>}
          <label className="fld"><span>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>{(out ? OUT_TYPES : IN_TYPES).map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="fld"><span>Your name</span>
            <input value={by} onChange={(e) => { setBy(e.target.value); safeLS.set("retina_name", e.target.value); }} placeholder="Who is doing this entry?" /></label>
        </div>
        <footer>
          <div className="sum"><span>{lines.length} items</span><b>{fmtQty(round(total))} units</b></div>
          <button className="primary wide" disabled={!canSubmit} onClick={() => onSubmit({ ref: activeRef, type, by: by.trim() })}>{busy ? "Saving…" : out ? "Confirm check-out" : "Confirm check-in"}</button>
          {lines.length > 0 && <button className="linkbtn" onClick={onClear}>Clear cart</button>}
        </footer>
      </aside>
    </>
  );
}

/* ---------- history ---------- */
function Ledger({ movements, titleOf }) {
  const [f, setF] = useState("ALL");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...movements]
      .filter((m) => f === "ALL" || m.kind === f)
      .filter((m) => !s || `${m.sku} ${titleOf(m.sku)} ${m.ref} ${m.by || ""}`.toLowerCase().includes(s))
      .sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 300);
  }, [movements, f, q, titleOf]);
  return (
    <section>
      <div className="ledger-bar">
        <div className="seg small">
          {[["ALL", "All"], ["IN", "Check-ins"], ["OUT", "Check-outs"]].map(([k, t]) => <button key={k} className={f === k ? "on" : ""} onClick={() => setF(k)}>{t}</button>)}
        </div>
        <input className="search plain" placeholder="Search code, invoice or name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {rows.length === 0 ? <div className="empty"><p>No entries match.</p></div> : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>When</th><th>Movement</th><th>Code</th><th>Item</th><th>Invoice / PO</th><th>Type</th><th className="r">Qty</th><th>By</th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>{fmtDateTime(m.ts)}</td>
                  <td><span className={`pill ${m.kind === "IN" ? "in" : "out"}`}>{m.kind === "IN" ? "Check-in" : "Check-out"}</span></td>
                  <td className="mono">{m.sku}</td><td>{titleOf(m.sku)}</td><td>{m.ref}</td><td>{m.type}</td>
                  <td className="r">{m.kind === "IN" ? "+" : "−"}{fmtQty(m.qty)}</td><td>{m.by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ============================== APP ============================== */
const CATS = ["In stock", "Housing", "LED", "Driver"];
const PAGE = 100;
/* Housing table columns, in the same order as the housing sheet. Columns with no data are hidden automatically. */
const HCOLS = [
  { k: "b", label: "Brand" }, { k: "c", label: "Country" }, { k: "name", label: "Name" }, { k: "fam", label: "Code" },
  { k: "beam", label: "Beam spread" }, { k: "ugr", label: "UGR" }, { k: "mount", label: "Mounting" }, { k: "aim", label: "Aiming" },
  { k: "ip", label: "IP" }, { k: "ik", label: "IK" }, { k: "dim", label: "Dimension" }, { k: "shape", label: "Shape" },
  { k: "heat", label: "Heat sink" }, { k: "ri", label: "Remote / Inbuilt" }, { k: "type", label: "Type" }, { k: "b2", label: "Brand" },
  { k: "adp", label: "Adapter bracket" }, { k: "x", label: "X" }, { k: "pcb", label: "PCB width" }, { k: "maxl", label: "Max L" },
];
const TABLE_HEAD = {
  "In stock": ["Code", "Item"],
  Housing: ["No.", "Name", "Beam", "Mounting", "IP", "Heat sink", "Dimension", "Variant"],
  LED: ["No.", "Name", "Type", "Power", "Voltage", "CCT", "Make"],
  Driver: ["No.", "Code", "Mode", "Voltage", "Load", "Typology", "IP", "Make"],
};


const BOM_MASTER = [{"housing":"1","serial":"","category":"Base components","description":"Round Trim","sku":"SELECT VARIANT","unit":"","page":1},{"housing":"1","serial":"4","category":"Base components","description":"PC Ring","sku":"D.1/2","unit":"Pc.","page":1},{"housing":"1","serial":"5","category":"Base components","description":"Lens","sku":"SELECT VARIANT","unit":"Pc.","page":1},{"housing":"1","serial":"","category":"Base components","description":"Lens Holder","sku":"D.1/3","unit":"","page":1},{"housing":"1","serial":"10","category":"Base components","description":"Aluminium Heatsink","sku":"D.1/6","unit":"Pc.","page":1},{"housing":"1","serial":"","category":"Base components","description":"M4 Kiwi Screws","sku":"D.1/7","unit":"","page":1},{"housing":"1","serial":"5","category":"Beam angle","description":"24","sku":"D.1/V1.2","unit":"","page":1},{"housing":"1","serial":"","category":"Beam angle","description":"36","sku":"D.1/V1.3","unit":"","page":1},{"housing":"1","serial":"2","category":"Reflector","description":"Chrome Reflector","sku":"D.1/V2.2","unit":"","page":1},{"housing":"1","serial":"","category":"Reflector","description":"white Reflector","sku":"D.1/V2.3","unit":"","page":1},{"housing":"1","serial":"","category":"Reflector","description":"Gold Reflector","sku":"D.1/V2.4","unit":"","page":1},{"housing":"1","serial":"","category":"Accessories","description":"Trimless Ring","sku":"D.1/ACC.1","unit":"","page":2},{"housing":"51","serial":"3","category":"Base components","description":"Ball Front","sku":"D.51/2","unit":"Pc.","page":2},{"housing":"51","serial":"4","category":"Base components","description":"Ball Back","sku":"D.51/3","unit":"Pc.","page":2},{"housing":"51","serial":"","category":"Base components","description":"Lens Holder","sku":"D.51/4","unit":"Pc.","page":2},{"housing":"51","serial":"","category":"Base components","description":"Lens","sku":"D.51/5","unit":"Pc.","page":2},{"housing":"51","serial":"11","category":"Base components","description":"Silicon dot","sku":"D.51/10","unit":"Pc.","page":2},{"housing":"51","serial":"","category":"Base components","description":"LED","sku":"D.51/11","unit":"Pc.","page":2},{"housing":"51","serial":"13","category":"Base components","description":"1LED/3LED Screw, #4-40 x ⅜\" (Qty Req: 2)","sku":"D.51/12","unit":"Pc.","page":3},{"housing":"51","serial":"","category":"Base components","description":"Cable clamp","sku":"D.51/13","unit":"Pc.","page":3},{"housing":"51","serial":"","category":"Base components","description":"Unspecified component","sku":"D.51/17","unit":"","page":3},{"housing":"51","serial":"","category":"Body colour","description":"Black","sku":"D.51/V1.1","unit":"","page":3},{"housing":"51","serial":"","category":"Body colour","description":"White","sku":"D.51/V1.2","unit":"","page":3},{"housing":"51","serial":"","category":"Body colour","description":"Non Standarised Colour","sku":"D.51/V1.3","unit":"","page":3},{"housing":"51","serial":"","category":"Accessories","description":"E10X60 Filter","sku":"D.51/ACC.2","unit":"","page":3},{"housing":"51","serial":"","category":"Accessories","description":"E10X40 Filter","sku":"D.51/ACC.3","unit":"","page":3},{"housing":"51","serial":"","category":"Accessories","description":"Trimless Ring","sku":"D.51/ACC.4","unit":"","page":3},{"housing":"53","serial":"","category":"Accessories","description":"Lence","sku":"D.53/ACC.1","unit":"","page":3},{"housing":"53","serial":"","category":"Accessories","description":"Lence Holder","sku":"D.53/ACC.2","unit":"","page":3},{"housing":"55","serial":"2","category":"Base components","description":"Polarized Optics","sku":"D.55/1","unit":"Pc.","page":3},{"housing":"55","serial":"3","category":"Base components","description":"Polarized Light LED Holder","sku":"D.55/2","unit":"Pc.","page":4},{"housing":"55","serial":"","category":"Base components","description":"LED","sku":"D.55/3","unit":"","page":4},{"housing":"55","serial":"8","category":"Base components","description":"Screw","sku":"D.55/7","unit":"Pc.","page":4},{"housing":"55","serial":"","category":"Base components","description":"Heat Sink","sku":"D.55/8","unit":"","page":4},{"housing":"55","serial":"","category":"Base components","description":"Trim","sku":"SELECT VARIANT","unit":"","page":4},{"housing":"55","serial":"","category":"Reflector","description":"Jet Black Reflector","sku":"D.55/V1.2","unit":"","page":4},{"housing":"55","serial":"","category":"Accessories","description":"Trimless Ring","sku":"D.55/ACC.1","unit":"","page":4},{"housing":"10","serial":"2","category":"Base components","description":"Reflector","sku":"SELECT VARIANT","unit":"Pc.","page":4},{"housing":"10","serial":"","category":"Base components","description":"Reflector Holder","sku":"D.10/1","unit":"","page":4},{"housing":"10","serial":"","category":"Base components","description":"Lens","sku":"SELECT VARIANT","unit":"","page":4},{"housing":"10","serial":"7","category":"Base components","description":"Led Screw","sku":"D.10/4","unit":"Pc.","page":4},{"housing":"10","serial":"","category":"Base components","description":"Led Holder","sku":"D.10/5","unit":"","page":4},{"housing":"10","serial":"","category":"Base components","description":"Led","sku":"SELECT VARIANT","unit":"","page":4},{"housing":"10","serial":"12","category":"Base components","description":"Connector","sku":"D.10/8","unit":"Pc.","page":4},{"housing":"10","serial":"","category":"Reflector","description":"Chrome (Shine silver)","sku":"D.10/V1.1","unit":"","page":5},{"housing":"10","serial":"","category":"Reflector","description":"2 Golden","sku":"D.10/V1.4","unit":"","page":5},{"housing":"10","serial":"","category":"Accessories","description":"Honeycomb","sku":"D.10/ACC.3","unit":"","page":5},{"housing":"10","serial":"","category":"Accessories","description":"E10X60 Filter","sku":"D.10/ACC.4","unit":"","page":5},{"housing":"10","serial":"","category":"Accessories","description":"E10X40 Filter","sku":"D.10/ACC.5","unit":"","page":5},{"housing":"61","serial":"1","category":"Base components","description":"Glass","sku":"D.61/1","unit":"","page":5},{"housing":"61","serial":"","category":"Base components","description":"Snoot","sku":"D.61/2","unit":"","page":5},{"housing":"61","serial":"6","category":"Base components","description":"Lens Holder","sku":"D.61/6","unit":"","page":5},{"housing":"61","serial":"7","category":"Base components","description":"Lens","sku":"D.61/7","unit":"","page":6},{"housing":"61","serial":"","category":"Base components","description":"LED Base","sku":"D.61/8","unit":"","page":6},{"housing":"61","serial":"12","category":"Base components","description":"Unspecified component","sku":"D.61/12","unit":"","page":6},{"housing":"61","serial":"","category":"Base components","description":"Unspecified component","sku":"D.61/13","unit":"","page":6},{"housing":"61","serial":"","category":"Base components","description":"Unspecified component","sku":"D.61/14","unit":"","page":6},{"housing":"61","serial":"17","category":"Base components","description":"Unspecified component","sku":"D.61/17","unit":"","page":6},{"housing":"61","serial":"","category":"Base components","description":"Unspecified component","sku":"D.61/18","unit":"","page":6},{"housing":"61","serial":"","category":"Base components","description":"Unspecified component","sku":"D.61/19","unit":"","page":6},{"housing":"70","serial":"","category":"Beam angle","description":"Unspecified component","sku":"D.70/V1.1","unit":"","page":6},{"housing":"116","serial":"","category":"Accessories","description":"Spike","sku":"D.116/ACC.1","unit":"","page":6},{"housing":"116","serial":"","category":"Accessories","description":"Snoot","sku":"D.116/ACC.4","unit":"","page":6},{"housing":"14","serial":"","category":"Base components","description":"Trim","sku":"SELECT VARIANT","unit":"","page":7},{"housing":"14","serial":"4","category":"Base components","description":"Lens","sku":"SELECT VARIANT","unit":"Pc.","page":7},{"housing":"14","serial":"5","category":"Base components","description":"Lens Holder","sku":"D.14/2","unit":"Pc.","page":7},{"housing":"14","serial":"","category":"Base components","description":"Lens Holder","sku":"D.14/3","unit":"","page":7},{"housing":"14","serial":"10","category":"Base components","description":"Led Base","sku":"D.14/6","unit":"Pc.","page":7},{"housing":"14","serial":"","category":"Base components","description":"Outer Ring","sku":"D.14/7","unit":"","page":7},{"housing":"14","serial":"","category":"Reflector","description":"Chrome (Shine silver)","sku":"D.14/V1.1","unit":"","page":7},{"housing":"14","serial":"","category":"Reflector","description":"Gun Metal (Black)","sku":"D.14/V1.2","unit":"","page":7},{"housing":"14","serial":"","category":"Reflector","description":"White","sku":"D.14/V1.3","unit":"","page":7},{"housing":"14","serial":"","category":"Lens","description":"15 Lens","sku":"D.14/V2.1","unit":"","page":7},{"housing":"14","serial":"","category":"Lens","description":"24 Lens","sku":"D.14/V2.2","unit":"","page":7},{"housing":"14","serial":"","category":"Accessories","description":"E10X60 Filter","sku":"D.14/ACC.4","unit":"","page":7},{"housing":"14","serial":"","category":"Accessories","description":"E10X40 Filter","sku":"D.14/ACC.5","unit":"","page":8},{"housing":"14","serial":"","category":"Accessories","description":"Cover Black","sku":"D.14/ACC.6","unit":"","page":8},{"housing":"14","serial":"","category":"Accessories","description":"09w chip holder White","sku":"D.14/ACC.10","unit":"","page":8},{"housing":"28","serial":"4","category":"Base components","description":"Lens","sku":"SELECT VARIANT","unit":"Pc.","page":8},{"housing":"28","serial":"","category":"Base components","description":"Lens Holder","sku":"D.28/2","unit":"","page":8},{"housing":"28","serial":"9","category":"Base components","description":"Led","sku":"SELECT VARIANT","unit":"Pc.","page":8},{"housing":"28","serial":"","category":"Base components","description":"Led Base","sku":"D.28/6","unit":"","page":8},{"housing":"28","serial":"","category":"Reflector","description":"Unspecified component","sku":"D.28/V1.1","unit":"","page":8},{"housing":"28","serial":"","category":"Trim","description":"Unspecified component","sku":"D.28/V3.1","unit":"","page":8},{"housing":"28","serial":"","category":"Accessories","description":"Trimless Ring","sku":"D.28/ACC.1","unit":"","page":9},{"housing":"28","serial":"","category":"Accessories","description":"Trimless Ring [Wood]","sku":"D.28/ACC.2","unit":"","page":9},{"housing":"110","serial":"","category":"Base components","description":"Light","sku":"D.110/1","unit":"","page":9},{"housing":"110","serial":"","category":"Beam angle","description":"8","sku":"D.110/V1.1","unit":"","page":9},{"housing":"110","serial":"","category":"Beam angle","description":"15","sku":"D.110/V1.2","unit":"","page":9},{"housing":"110","serial":"","category":"Accessories","description":"45 Snoot","sku":"D.110/ACC.1","unit":"","page":9},{"housing":"110","serial":"","category":"Accessories","description":"Spike","sku":"D.110/ACC.2","unit":"","page":9},{"housing":"BRASS","serial":"","category":"Accessories","description":"Brass Stake","sku":"BRASS/ACC.1","unit":"","page":9},{"housing":"BRASS","serial":"","category":"Accessories","description":"Stake Cover","sku":"BRASS/ACC.2","unit":"","page":9},{"housing":"BRASS","serial":"","category":"Accessories","description":"Brass Tree Mount","sku":"BRASS/ACC.3","unit":"","page":9},{"housing":"BRASS","serial":"","category":"Accessories","description":"Brass Locknut","sku":"BRASS/ACC.4","unit":"","page":9},{"housing":"BRASS","serial":"","category":"Accessories","description":"Brass Connector","sku":"BRASS/ACC.5","unit":"","page":9},{"housing":"BRASS","serial":"","category":"Accessories","description":"Gutter Mount","sku":"BRASS/ACC.6","unit":"","page":9},{"housing":"304","serial":"","category":"Base components","description":"Light JACCUZI UNDER WATER","sku":"D.304/Acc2","unit":"","page":10}];
function bomTag(r) {
 const d=(r.description||'').toLowerCase();
 if (/connector|conector|cord grip/.test(d)) return '#WireConnector';
 if (/\bled\b|chip|cob/.test(d)) return '#LED';
 if (/lens/.test(d)) return '#Lens';
 if (/screw|bolt/.test(d)) return '#Screw';
 if (/gasket|o-ring|silicon/.test(d)) return '#Gasket';
 if (/wire|cable/.test(d)) return '#Wire';
 if (r.category==='Accessories') return '#Accessory';
 return '#Part';
}
const BOM_GROUPS=['Base components','Beam angle','Reflector','Trim colour','Body colour','Lens','Trim','Variants','Accessories'];
function BomMasterView({query}) {
 const [housing,setHousing]=useState('All');
 const [localQuery,setLocalQuery]=useState('');
 const [edited,setEdited]=useState({});
 const [tags,setTags]=useState(()=>safeLS.get('retina_bom_tags_v2',{}));
 const housings=useMemo(()=>[...new Set(BOM_MASTER.map(x=>x.housing))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),[]);
 const keyOf=r=>[r.housing,r.category,r.sku,r.description].join('|');
 const tagOf=r=>tags[keyOf(r)]??bomTag(r);
 const filtered=useMemo(()=>BOM_MASTER.filter(r=>(housing==='All'||r.housing===housing)&&[r.housing,r.serial,r.category,r.description,r.sku,tags[keyOf(r)]??bomTag(r)].join(' ').toLowerCase().includes((localQuery||query).toLowerCase())),[housing,localQuery,query,tags]);
 const updateTag=(r,v)=>{const next={...tags,[keyOf(r)]:v.startsWith('#')?v:'#'+v};setTags(next);safeLS.set('retina_bom_tags_v2',next)};
 const exportCSV=()=>{
  const head=['Housing#','S#','Section','Description','SKU','Quantity','Unit','#Tag'];
  const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const csv=[head,...filtered.map(r=>[r.housing,r.serial,r.category,r.description,r.sku,edited[keyOf(r)]??'',r.unit,tagOf(r)])].map(r=>r.map(esc).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Retina_BOM_Master.csv';a.click();URL.revokeObjectURL(url);
 };
 const th={textAlign:'left',padding:'11px 12px',background:'#f1f5f9',borderBottom:'1px solid #cbd5e1',whiteSpace:'nowrap'};
 const td={padding:'9px 12px',borderBottom:'1px solid #e5e7eb',verticalAlign:'middle'};
 const groups=housing==='All'?housings:[housing];
 return <section style={{padding:22,maxWidth:1500,margin:'auto',color:'#111827'}}>
  <h2 style={{margin:'0 0 8px'}}>BOM Master</h2>
  <p style={{color:'#64748b'}}>Sheet-style hierarchy: basic base components first, followed by variable SKUs and accessories beneath each housing. Edit #Tags directly.</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap',margin:'18px 0'}}>
   <select value={housing} onChange={e=>setHousing(e.target.value)} style={{padding:10}}><option>All</option>{housings.map(h=><option key={h} value={h}>Housing {h}</option>)}</select>
   <input placeholder="Search SKU, component or #Tag" value={localQuery} onChange={e=>setLocalQuery(e.target.value)} style={{padding:10,minWidth:230,flex:1}} />
   <button onClick={exportCSV} style={{padding:'10px 16px',borderRadius:8,background:'#111827',color:'white',cursor:'pointer'}}>Export BOM CSV</button>
  </div>
  <p>{filtered.length} BOM lines · {groups.length} housing groups</p>
  {groups.map(h=>{const rows=filtered.filter(r=>r.housing===h);if(!rows.length)return null;return <div key={h} style={{margin:'22px 0 30px',background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
   <div style={{padding:'13px 16px',background:'#eaf0f9',fontWeight:800,fontSize:17}}>Housing #{h}</div>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:840}}><thead><tr>{['Housing#','S#','Dimension','Description / Variable SKU','SKU','Quantity','Unit','#Tag'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
    {BOM_GROUPS.map(group=>{const lines=rows.filter(r=>r.category===group);if(!lines.length)return null;return <React.Fragment key={group}>
     <tr><td colSpan={8} style={{padding:'10px 12px',background:group==='Base components'?'#e8f4ee':'#f3f5fa',fontWeight:800,color:'#334155'}}>{group==='Base components'?'BASIC / BASE COMPONENTS':group.toUpperCase()+' — VARIABLE SKU'}</td></tr>
     {lines.map((r,i)=><tr key={keyOf(r)+'-'+i}>{[r.housing,r.serial,'—',r.description,r.sku].map((v,j)=><td key={j} style={{...td,paddingLeft:j===3&&group!=='Base components'?28:12}}>{v}</td>)}<td style={td}><input type="number" min="0" step="any" value={edited[keyOf(r)]??''} onChange={e=>setEdited(t=>({...t,[keyOf(r)]:e.target.value}))} placeholder="—" style={{width:75,padding:6}} /></td><td style={td}>{r.unit}</td><td style={td}><input aria-label={'Tag for '+r.description} value={tagOf(r)} onChange={e=>updateTag(r,e.target.value)} style={{width:135,padding:6,border:'1px solid #cbd5e1',borderRadius:5,color:'#075985'}} /></td></tr>)}
    </React.Fragment>})}
   </tbody></table></div></div>})}
  <p style={{fontSize:12,color:'#64748b'}}>Suggested #Tags are inferred from descriptions and editable; verify against the source PDF. Tag changes are stored in this browser. Quantities are for export only. Dimension drawings are managed in the Dimensions tab.</p>
 </section>;
}
function DimensionsView() {
 const [items,setItems]=useState(()=>safeLS.get('retina_dimensions_v1',[]));
 const [housing,setHousing]=useState('');const [sku,setSku]=useState('');const [part,setPart]=useState('');const [dimension,setDimension]=useState('');const [image,setImage]=useState('');
 const [search,setSearch]=useState('');
 const add=()=>{if(!part.trim()&&!sku.trim())return;const next=[...items,{id:Date.now()+'-'+Math.random(),housing,sku,part,dimension,image}];setItems(next);safeLS.set('retina_dimensions_v1',next);setSku('');setPart('');setDimension('');setImage('');};
 const upload=e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){alert('Please select a JPG, PNG or WebP image');return;}const reader=new FileReader();reader.onload=()=>setImage(String(reader.result));reader.readAsDataURL(f);};
 const remove=id=>{const next=items.filter(x=>x.id!==id);setItems(next);safeLS.set('retina_dimensions_v1',next)};
 const field={padding:10,border:'1px solid #cbd5e1',borderRadius:8,minWidth:0};
 return <section style={{padding:22,maxWidth:1400,margin:'auto',color:'#111827'}}>
  <h2>Dimensions — Part Image Library</h2><p style={{color:'#64748b'}}>Add a separate image or drawing for each component, with its housing, SKU and measurements.</p>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,background:'#fff',border:'1px solid #e2e8f0',padding:16,borderRadius:12}}>
   <input style={field} placeholder="Housing #" value={housing} onChange={e=>setHousing(e.target.value)}/><input style={field} placeholder="Part SKU" value={sku} onChange={e=>setSku(e.target.value)}/><input style={field} placeholder="Part name" value={part} onChange={e=>setPart(e.target.value)}/><input style={field} placeholder="Dimensions (e.g. 50 × 30 mm)" value={dimension} onChange={e=>setDimension(e.target.value)}/>
   <label style={{...field,background:'#f8fafc',cursor:'pointer'}}>Choose part image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} style={{display:'block',maxWidth:'100%',marginTop:6}} /></label>
   <button onClick={add} style={{background:'#111827',color:'white',borderRadius:8,padding:12,cursor:'pointer'}}>+ Add Dimension</button>
  </div>
  <input placeholder="Search housing, part, SKU or dimension" value={search} onChange={e=>setSearch(e.target.value)} style={{...field,width:'100%',margin:'18px 0'}} />
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(235px,1fr))',gap:16}}>{items.filter(x=>[x.housing,x.sku,x.part,x.dimension].join(' ').toLowerCase().includes(search.toLowerCase())).map(x=><article key={x.id} style={{border:'1px solid #e2e8f0',background:'white',borderRadius:12,overflow:'hidden'}}>
   <div style={{height:180,background:'#f1f5f9',display:'grid',placeItems:'center'}}>{x.image?<img src={x.image} alt={x.part||x.sku} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>:<span style={{color:'#94a3b8'}}>No image added</span>}</div>
   <div style={{padding:14}}><strong>{x.part||'Unnamed part'}</strong><p style={{margin:'7px 0'}}>Housing {x.housing||'—'} · {x.sku||'No SKU'}</p><p style={{margin:'7px 0',color:'#64748b'}}>{x.dimension||'Dimensions not entered'}</p><button onClick={()=>remove(x.id)} style={{padding:'6px 10px',cursor:'pointer'}}>Remove</button></div>
  </article>)}</div>
  <p style={{fontSize:12,color:'#64748b',marginTop:18}}>Frontend-only storage: images are saved in this browser and may exceed its storage limit. For a production application, store files in a backend or project assets folder.</p>
 </section>;
}


function DataImportView({ onPurchaseImport }) {
 const [target,setTarget]=useState('Purchases');
 const [source,setSource]=useState('file');
 const [url,setUrl]=useState('');
 const [rows,setRows]=useState([]);
 const [headers,setHeaders]=useState([]);
 const [note,setNote]=useState('');
 const [fileName,setFileName]=useState('');
 const [ref,setRef]=useState('');
 const [pdfText,setPdfText]=useState('');
 const parseCsv=(text)=>{const out=[];let row=[],cell='',quote=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(c===','&&!quote){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>String(x).trim()))out.push(row);row=[];cell='';}else cell+=c;}row.push(cell);if(row.some(x=>String(x).trim()))out.push(row);return out;};
 const setMatrix=(matrix,name)=>{if(!matrix.length)throw Error('No rows found');const clean=matrix.map(r=>r.map(v=>String(v??'').trim()));setHeaders(clean[0]);setRows(clean.slice(1).filter(r=>r.some(Boolean)));setFileName(name);setPdfText('');setNote(`Preview loaded: ${Math.max(0,clean.length-1)} rows. Check the columns before importing.`);};
 const readFile=async(file)=>{if(!file)return;setNote('Reading file…');setRows([]);setPdfText('');try{const ext=file.name.split('.').pop().toLowerCase();if(['csv','txt'].includes(ext)){setMatrix(parseCsv(await file.text()),file.name);}else if(['xlsx','xls'].includes(ext)){const XLSX=await import('xlsx');const bytes=await file.arrayBuffer();const book=XLSX.read(bytes,{type:'array'});const sheet=book.Sheets[book.SheetNames[0]];setMatrix(XLSX.utils.sheet_to_json(sheet,{header:1,defval:''}),file.name);}else if(ext==='pdf'){const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs',import.meta.url).toString();const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let text='';for(let n=1;n<=pdf.numPages;n++){const pg=await pdf.getPage(n);const content=await pg.getTextContent();text+=`\n--- Page ${n} ---\n`+content.items.map(x=>x.str).join(' ');}setPdfText(text);setFileName(file.name);setNote('PDF text extracted for review only. PDF rows are NOT automatically imported because the columns may be misread. Convert the verified table to Excel/CSV first.');}else throw Error('Choose CSV, XLSX, XLS or PDF.');}catch(e){setNote('Import error: '+e.message);}};
 const loadSheet=async()=>{setNote('Loading Google Sheet…');try{const match=url.match(/\/spreadsheets\/d\/([^/]+)/);if(!match)throw Error('Paste a valid Google Sheets link');const gid=(url.match(/[?&#]gid=(\d+)/)||[])[1]||'0';const csv=`https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;const response=await fetch(csv);if(!response.ok)throw Error('Could not read sheet. Use a sheet published/shared for CSV access, or download it as XLSX and upload it here.');setMatrix(parseCsv(await response.text()),'Google Sheet');}catch(e){setNote(e.message+' Browser access to private sheets is not supported by this importer.');}};
 const commit=()=>{try{if(!rows.length)throw Error('No tabular rows loaded.');const map=Object.fromEntries(headers.map((h,i)=>[h.toLowerCase().replace(/[^a-z0-9]/g,''),i]));const pick=(row,keys)=>{for(const k of keys){const idx=map[k];if(idx!==undefined)return row[idx]||'';}return '';};if(target==='Purchases'){if(!ref.trim())throw Error('Enter a purchase reference first');const lines=rows.map(r=>({sku:pick(r,['sku','productcode','code']),qty:Number(pick(r,['quantity','qty','quantityordered']))}));if(lines.some(l=>!l.sku||!Number.isFinite(l.qty)||l.qty<=0))throw Error('For Purchases, columns must include SKU and Quantity (positive numbers).');onPurchaseImport(ref.trim(),lines);setNote(`Purchase ${ref} saved. Open Purchases to receive its stock.`);}else{const key='retina_import_'+target;const previous=safeLS.get(key,[]);safeLS.set(key,[...previous,...rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||'']))) ]);setNote(`${rows.length} rows saved to local import staging for ${target}. These are NOT yet merged into the live ${target} screen or Google Sheets. Export/backup your browser data before clearing storage.`);}}catch(e){setNote('Import error: '+e.message);}};
 return <section style={{maxWidth:980,margin:'24px auto',padding:24,background:'white',borderRadius:16}}>
 <h2>Import / Update Old Data</h2><p>Preview old records from Excel, CSV, PDF or a Google Sheet. Purchase rows can be loaded into the existing check-in workflow. Other categories are staged locally for review; they do not overwrite master records.</p>
 <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}><label>Destination <select value={target} onChange={e=>setTarget(e.target.value)}>{['Purchases','Products','BOM_Master','Dimensions','Variants','Stock'].map(t=><option key={t}>{t}</option>)}</select></label><label>Source <select value={source} onChange={e=>setSource(e.target.value)}><option value="file">Excel / CSV / PDF upload</option><option value="google">Google Sheet link</option></select></label></div>
 {source==='file'?<input type="file" accept=".csv,.txt,.xlsx,.xls,.pdf" onChange={e=>readFile(e.target.files?.[0])}/>:<div style={{display:'flex',gap:8}}><input style={{flex:1}} placeholder="Google Sheets URL" value={url} onChange={e=>setUrl(e.target.value)}/><button className="add" onClick={loadSheet}>Preview Sheet</button></div>}
 {target==='Purchases'&&<label className="fld"><span>Purchase / invoice reference</span><input value={ref} onChange={e=>setRef(e.target.value)} placeholder="PO-2026-001"/></label>}
 <p style={{padding:10,background:'#f1f5f9',borderRadius:8}}>{note||'Choose a source to preview your old data.'}</p>
 {pdfText&&<><h3>PDF extracted text — review only</h3><textarea readOnly rows={12} style={{width:'100%'}} value={pdfText}/></>}
 {rows.length>0&&<><h3>Preview: {fileName} ({rows.length} rows)</h3><div style={{overflowX:'auto',maxHeight:340}}><table style={{borderCollapse:'collapse',width:'100%'}}><thead><tr>{headers.map((h,i)=><th key={i} style={{padding:8,border:'1px solid #ddd',textAlign:'left'}}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,30).map((r,i)=><tr key={i}>{headers.map((_,j)=><td key={j} style={{padding:8,border:'1px solid #ddd'}}>{r[j]}</td>)}</tr>)}</tbody></table></div><button className="primary" style={{marginTop:16}} onClick={commit}>{target==='Purchases'?'Import purchase for check-in':'Save to local import staging'}</button></>}
 <p style={{fontSize:12,color:'#64748b',marginTop:20}}>Google Sheet URLs work only when CSV access is allowed; do not publish confidential inventory. PDF extraction is preview-only. This frontend importer does not synchronize with a Google Sheets database.</p>
 </section>;
}

export default function RetinaInventory({cloud}) {
  const live = true;
  const [data, setData] = useState({ H: HOUSINGS, S: SUPPLIERS, L: LEDS, D: DRIVERS, V: VARIANT_OPTIONS });
  const [movements, setMovements] = useState([]);
  const [loading] = useState(false);
  const [error,setError] = useState("");
  const [view, setView] = useState("shop");
  const [mode, setMode] = useState("OUT");
  const [cat, setCat] = useState("Housing");
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState("cards");
  const [limit, setLimit] = useState(PAGE);
  const [carts, setCarts] = useState({ OUT: {}, IN: {} });
  const [cartOpen, setCartOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [purchaseRef, setPurchaseRef] = useState("");
  const [purchaseText, setPurchaseText] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState("");
  const [toast, setToast] = useState(null);

  
  
  const parsePurchase = (text) => {
    const rows = text.replace(/\r/g, "").split("\n").map(x => x.trim()).filter(Boolean);
    const parsed = [];
    for (const row of rows) {
      const cells = row.split(/[,\t]/).map(x => x.trim().replace(/^"|"$/g, ""));
      if (/^(sku|product code|code)$/i.test(cells[0])) continue;
      const qty = Number(cells[1]);
      if (!cells[0] || !Number.isFinite(qty) || qty <= 0) throw new Error(`Invalid SKU or quantity: ${row}`);
      parsed.push({ sku: cells[0], qty });
    }
    if (!parsed.length) throw new Error("Enter at least one SKU and quantity.");
    return parsed;
  };
  const addPurchase = () => {
    try {
      if (!purchaseRef.trim()) throw new Error("Enter a purchase invoice or PO number.");
      if (purchases.some(p => p.ref.toLowerCase() === purchaseRef.trim().toLowerCase())) throw new Error("This purchase reference already exists.");
      const lines = parsePurchase(purchaseText);
      const totals = {};
      lines.forEach(l => { totals[l.sku] = (totals[l.sku] || 0) + l.qty; });
      const record = { ref: purchaseRef.trim(), lines: Object.entries(totals).map(([sku, qty]) => ({ sku, qty })), ts: new Date().toISOString() };
      setPurchases(p => [...p, record]); setSelectedPurchase(record.ref); setPurchaseRef(""); setPurchaseText(""); setPurchaseError("");
      setMode("IN"); setToast({ ok: true, msg: `Purchase ${record.ref} uploaded. Add its products to the check-in cart.` });
    } catch(e) { setPurchaseError(e.message); }
  };
  const [cloudStock,setCloudStock] = useState({});
  const [cloudSkus,setCloudSkus] = useState(new Set());
  const [productImages,setProductImages] = useState({});
  // Google Drive /file/d/ID/view links are HTML pages, not image files.
  // Convert them to image-serving thumbnail endpoints before using <img>.
  const displayImageUrl = (raw) => {
    const url = String(raw || '').trim();
    if (!/^https?:\/\//i.test(url)) return '';
    const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
      || url.match(/drive\.google\.com\/(?:thumbnail|uc)\?[^#]*[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800` : url;
  };
  const load = async () => {
    try {
      const d=await cloud.api('catalog');
      setCloudSkus(new Set(d.products.map(p=>String(p.SKU||'').trim())));
      setProductImages(Object.fromEntries(d.products.map(p => [String(p.SKU||'').trim().toUpperCase(), displayImageUrl(p['Image URL'])]).filter(([sku,url]) => sku && /^https?:\/\//i.test(url))));
      setCloudStock(Object.fromEntries(d.stock.map(x=>[String(x.SKU||'').trim(),Number(x.Quantity||0)])));
      setError('');
    }catch(e){setError(e.message)}
  };
  useEffect(()=>{load()},[]);
  // Housing cards are numbered 1, 2, 3 in the original UI, while the
  // Products sheet uses D.1, D.2, D.3. Match directly by housing number.
  // Do not modify the transaction SKU used by Check-In/Check-Out.
  const imageFor = (code, item) => {
    const sku = String(code || '').trim().toUpperCase();
    if (productImages[sku]) return productImages[sku];
    if (item?.kind === 'housing' && Number.isFinite(Number(item.n))) {
      return productImages[`D.${Number(item.n)}`] || '';
    }
    const parsed = parseCode(code);
    if (parsed?.h && !parsed.v && !parsed.l && !parsed.d) {
      return productImages[`D.${parsed.h}`] || '';
    }
    return '';
  };
  const sheetSku = (code) => {
    if(cloudSkus.has(code))return code;
    const p=parseCode(code);
    if(p?.h && !p.v && !p.l && !p.d && cloudSkus.has(`D.${p.h}`))return `D.${p.h}`;
    return null;
  };
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3800); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => { setLimit(PAGE); }, [cat, query, mode]);

  const comboMap = useMemo(() => {
    const m = {};
    Object.keys(data.V || {}).forEach((h) => { m[h] = makeCombos(data.V[h], h); });
    return m;
  }, [data.V]);
  const hcols = useMemo(() => HCOLS.filter((c) => data.H.some((x) => x[c.k])), [data.H]);
  const sups = useMemo(() => (data.S || []).filter((a) => data.H.some((x) => x.sup && x.sup[a])), [data.H, data.S]);
  const hBy = useMemo(() => Object.fromEntries(data.H.map((x) => [x.n, x])), [data.H]);
  const lBy = useMemo(() => Object.fromEntries(data.L.map((x) => [x.n, x])), [data.L]);
  const dBy = useMemo(() => Object.fromEntries(data.D.map((x) => [x.n, x])), [data.D]);

  const titleOf = useCallback((code) => {
    const p = parseCode(code);
    if (!p) return "Unlisted code";
    const parts = [];
    if (p.h) {
      const hh = hBy[p.h];
      const vv = p.v ? (comboMap[p.h] || []).find((c) => c.letter === p.v) : null;
      parts.push(`${hh ? hh.name : `Housing ${p.h}`} #${p.h}${p.v ? ` · ${vv ? vv.label : `variant ${p.v}`}` : ""}`);
    }
    if (p.l) parts.push(`LED ${lBy[p.l] ? lBy[p.l].name : p.l}`);
    if (p.d) parts.push(`Driver ${dBy[p.d] ? dBy[p.d].code : p.d}`);
    return parts.join(" + ") || "Unlisted code";
  }, [hBy, lBy, dBy, comboMap]);

  const stock=useMemo(()=>{
    const result={};
    for(const [sku,qty] of Object.entries(cloudStock)){
      result[sku]=qty;
      const m=sku.match(/^D\.(\d+)$/);
      if(m)result[`D${m[1]}.0.0`]=qty;
    }
    return result;
  },[cloudStock]);
  const stockOf=useCallback(sku=>stock[sku]||0,[stock]);

  const cart = carts[mode];
  const setQty = (sku, qty) =>
    setCarts((c) => { const next = { ...c[mode] }; if (qty <= 0) delete next[sku]; else next[sku] = qty; return { ...c, [mode]: next }; });
  const lines = Object.entries(cart).map(([sku, qty]) => ({ sku, qty, title: titleOf(sku) }));
  const count = lines.length;

  /* items for the grid */
  const items = useMemo(() => {
    if (cat === "In stock") {
      return Object.entries(stock).filter(([, q]) => q > 0).map(([code]) => {
        const p = parseCode(code);
        const c = !p ? "Housing" : p.h ? "Housing" : p.l ? "LED" : "Driver";
        return { kind: "code", code, cat: c, title: titleOf(code), sub: "", group: "Ready to check out", cells: [code, titleOf(code)], hay: `${code} ${titleOf(code)}`.toLowerCase() };
      });
    }
    if (cat === "Housing")
      return data.H.map((x) => ({
        kind: "housing", n: x.n, cat: "Housing", title: x.name, group: x.name,
        cells: [x.n, ...hcols.map((c) => (c.k === "dim" && x.dim ? x.dim.replace(/ · /g, "\n") : x[c.k] || "")), ...sups.map((a) => (x.sup && x.sup[a]) || "")],
        img: x.img,
        sub: [x.beam, x.mount, x.ip, x.heat, x.dim].filter(Boolean).join(" · "),
        hay: `${x.n} ${x.name} ${x.fam || ""} ${x.mount || ""} ${x.ip || ""} ${x.beam || ""} ${Object.values(x.sup || {}).join(" ")}`.toLowerCase(),
      }));
    if (cat === "LED")
      return data.L.map((x) => ({
        kind: "led", n: x.n, code: buildCode({ l: x.n }), cat: "LED", title: x.name, group: x.kind || "LED",
        cells: [x.n, x.name, x.kind || "—", x.w || "—", x.volt || "—", x.cct || "—", x.make || "—"],
        sub: [x.w, x.volt, x.cct, x.make].filter(Boolean).join(" · "),
        hay: `${x.n} ${x.name} ${x.make} ${x.kind}`.toLowerCase(),
      }));
    return data.D.map((x) => ({
      kind: "driver", n: x.n, code: buildCode({ d: x.n }), cat: "Driver", title: x.code,
      cells: [x.n, x.code, x.mode || "—", x.volt || x.cur || "—", x.load || "—", x.typo || "—", x.ip || "—", x.make || "—"], group: `${x.ip || "Driver"} · ${x.mode || ""}`.trim(),
      sub: [x.volt || x.cur, x.load, x.typo, x.make].filter(Boolean).join(" · "),
      hay: `${x.n} ${x.code} ${x.make} ${x.volt} ${x.load}`.toLowerCase(),
    }));
  }, [cat, data, stock, titleOf, hcols, sups]);

  const visible = useMemo(() => {
    const s = query.trim().toLowerCase();
    return items.filter((i) => !s || i.hay.includes(s));
  }, [items, query]);
  const shown = visible.slice(0, limit);
  const grouped = useMemo(() => {
    const g = new Map();
    shown.forEach((i) => { if (!g.has(i.group)) g.set(i.group, []); g.get(i.group).push(i); });
    return [...g.entries()];
  }, [shown]);

  const catCount = (c) => (c === "In stock" ? Object.values(stock).filter((q) => q > 0).length : c === "Housing" ? data.H.length : c === "LED" ? data.L.length : data.D.length);

  const receivedFor = (ref, sku) => movements.filter(m => m.kind === "IN" && m.ref === ref && m.sku === sku).reduce((n, m) => n + m.qty, 0);
  const remainingFor = (ref, sku) => {
    const purchase = purchases.find(p => p.ref === ref);
    return Math.max(0, (purchase?.lines.find(l => l.sku === sku)?.qty || 0) - receivedFor(ref, sku));
  };
  const submit = async ({ ref, type, by }) => {
    if (busy) return;
    if (!lines.length) { setToast({ ok: false, msg: "Cart is empty." }); return; }
    if (mode === "IN") {
      const purchase = purchases.find(p => p.ref === ref);
      if (!purchase) { setToast({ ok: false, msg: "Upload and select a purchase before check-in." }); return; }
      const invalid = lines.find(l => l.qty > remainingFor(ref, l.sku));
      if (invalid) { setToast({ ok: false, msg: `${invalid.sku}: exceeds unreceived quantity on ${ref}.` }); return; }
    } else {
      const invalid = lines.find(l => l.qty > stockOf(l.sku));
      if (invalid) { setToast({ ok: false, msg: `${invalid.sku}: insufficient stock.` }); return; }
    }
    setBusy(true);
    const ts = new Date().toISOString();
    const rows = lines.map((l, i) => ({ id: `${ts}-${i}`, ts, date: todayStr(), kind: mode, ref, sku: l.sku, type, qty: l.qty, by }));
    try {
      const items=lines.map(l=>({sku:sheetSku(l.sku),name:l.title,quantity:l.qty}));
      if(items.some(x=>!x.sku))throw new Error('SKU not found in permanent Products sheet. Only registered SKUs can be checked in/out.');
      await cloud.api('move',{type:mode,reference:ref,id:crypto.randomUUID(),items});
      await load();
      setMovements(m=>[...m,...rows]);
      setCarts((c) => ({ ...c, [mode]: {} }));
      setCartOpen(false);
      setToast({ ok: true, msg: `${mode === "OUT" ? "Checked out" : "Checked in"} ${rows.length} item${rows.length > 1 ? "s" : ""} · ${ref}` });
    } catch (e) { setToast({ ok: false, msg: e.message || "Could not save. Your cart is still here." }); }
    setBusy(false);
  };

  return (
    <div className={`app mode-${mode.toLowerCase()}`}>
      <style>{CSS}</style>
      <header className="top">
        <div className="brand"><Brand /><div><b>{CONFIG.APP_NAME}</b><small>{CONFIG.COMPANY}</small></div></div>
        <div className="seg" role="tablist" aria-label="Movement type">
          <button role="tab" aria-selected={mode === "OUT"} className={mode === "OUT" ? "on out" : ""} onClick={() => setMode("OUT")}>Check-out</button>
          <button role="tab" aria-selected={mode === "IN"} className={mode === "IN" ? "on in" : ""} onClick={() => setMode("IN")}>Check-in</button>
        </div>
        <input className="search" placeholder="Search by name, number, code or make" value={query} onChange={(e) => { setQuery(e.target.value); setView((v) => (v === "ledger" || v === "build" ? "shop" : v)); }} aria-label="Search products" />
        <nav className="nav">
          <button className={view === "shop" ? "on" : ""} onClick={() => setView("shop")}>Products</button>
          <button className={view === "purchases" ? "on" : ""} onClick={() => { setView("purchases"); setMode("IN"); }}>Purchases</button>
          <button className={view === "import" ? "on" : ""} onClick={() => setView("import")}>Data Import (preview)</button>
          <button className={view === "bom" ? "on" : ""} onClick={() => setView("bom")}>BOM Master</button>
          <button className={view === "dimensions" ? "on" : ""} onClick={() => setView("dimensions")}>Dimensions</button>
          <button className={view === "variants" ? "on" : ""} onClick={() => setView("variants")}>Variants</button>
          <button className={view === "build" ? "on" : ""} onClick={() => setView("build")}>Compose</button>
          <button className={view === "ledger" ? "on" : ""} onClick={() => setView("ledger")}>History (session)</button>
        </nav>
        <button className="cartbtn" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${count} items`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></svg>
          <span>{count > 0 ? `${count} item${count > 1 ? "s" : ""}` : "Cart"}</span>
        </button>
      </header>

      {!live && <div className="banner">Local inventory mode · Check-in/out and purchases saved in this browser only. Export/back up data before clearing browser storage.</div>}
      {error && <div className="banner bad">{error} <button className="linkbtn" onClick={load}>Try again</button></div>}

      <main className="main">
        {view === "purchases" && <section style={{maxWidth:850,margin:"24px auto",padding:24,background:"white",borderRadius:16}}>
          <h2>Draft purchase / receive stock</h2>
          <p>Upload a CSV with columns <b>SKU,Quantity</b>, or paste rows below. Stock increases only when you confirm check-in.</p>
          <label className="fld"><span>Purchase invoice / PO number</span><input value={purchaseRef} onChange={e=>setPurchaseRef(e.target.value)} placeholder="PO-2026-001" /></label>
          <label className="fld"><span>Upload CSV purchase</span><input type="file" accept=".csv,.txt,text/csv" onChange={async e=>{const f=e.target.files?.[0]; if(f) setPurchaseText(await f.text());}} /></label>
          <label className="fld"><span>SKU,Quantity (one per line)</span><textarea rows={7} style={{width:"100%",padding:12,borderRadius:8}} value={purchaseText} onChange={e=>setPurchaseText(e.target.value)} placeholder={"D1.0.0,10\nD0.1.0,20"}/></label>
          {purchaseError && <p style={{color:"#b91c1c"}}>{purchaseError}</p>}
          <button className="primary" onClick={addPurchase}>Save draft purchase (browser only)</button>
          <h3 style={{marginTop:24}}>Draft purchases (browser only)</h3>
          {purchases.length===0 && <p>No purchases uploaded yet.</p>}
          {purchases.map(p=><div key={p.ref} style={{padding:12,borderBottom:"1px solid #ddd"}}><b>{p.ref}</b> · {p.lines.length} products
            <button className="add" style={{marginLeft:12}} onClick={()=>{setSelectedPurchase(p.ref);setMode("IN");setView("shop");setCat("Housing");}}>Receive items</button>
            <div>{p.lines.map(l=><div key={l.sku} style={{display:"flex",justifyContent:"space-between",gap:10,padding:5}}><span>{l.sku} · {titleOf(l.sku)}</span><span>Remaining: {remainingFor(p.ref,l.sku)} / {l.qty} <button className="add" disabled={remainingFor(p.ref,l.sku)<=0} onClick={()=>{setMode("IN");setCarts(c=>({...c,IN:{...c.IN,[l.sku]:remainingFor(p.ref,l.sku)}}));setSelectedPurchase(p.ref);setCartOpen(true);}}>+ Receive</button></span></div>)}</div>
          </div>)}
        </section>}
        {view === "import" && <DataImportView onPurchaseImport={(reference,lines)=>{if(purchases.some(p=>p.ref.toLowerCase()===reference.toLowerCase()))throw Error('Purchase reference already exists');const totals={};lines.forEach(l=>totals[l.sku]=(totals[l.sku]||0)+l.qty);setPurchases(p=>[...p,{ref:reference,lines:Object.entries(totals).map(([sku,qty])=>({sku,qty})),ts:new Date().toISOString()}]);setSelectedPurchase(reference);}} />}
        {view === "ledger" && <Ledger movements={movements} titleOf={titleOf} />}
        {view === "bom" && <BomMasterView query={query} />}
        {view === "dimensions" && <DimensionsView />}
        {view === "variants" && <VariantsView data={data} comboMap={comboMap} query={query} stockOf={stockOf} mode={mode} cart={cart} onSet={setQty} />}
        {view === "build" && <Builder mode={mode} data={data} comboMap={comboMap} stockOf={stockOf} cart={cart} onSet={setQty} titleOf={titleOf} />}
        {view === "shop" && (
          <div className="shop">
            <nav className="rail" aria-label="Categories">
              {CATS.map((c) => (
                <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>
                  <CatIcon cat={c} size={30} /><span>{c}</span><em>{catCount(c)}</em>
                </button>
              ))}
            </nav>
            <div className="content">
              <div className="viewbar">
                <div className="seg small" role="group" aria-label="Layout">
                  <button className={layout === "cards" ? "on" : ""} onClick={() => setLayout("cards")}>Cards</button>
                  <button className={layout === "table" ? "on" : ""} onClick={() => setLayout("table")}>Table</button>
                </div>
                <span className="count">{visible.length} {cat === "In stock" ? "in stock" : cat === "Housing" ? "housings" : cat === "LED" ? "LEDs" : "drivers"}</span>
              </div>
              {loading ? <div className="empty"><p>Loading from the sheet…</p></div>
                : grouped.length === 0 ? (
                  <div className="empty"><CatIcon cat="All" size={48} />
                    <p>{cat === "In stock" && !query ? "Nothing is in stock yet. Switch to Check-in to add stock." : `No products match “${query}”.`}</p></div>
                ) : (
                  <>
                    {layout === "table" ? (
                      <div className="tablewrap">
                        <table className="dtable">
                          <thead><tr>{(cat === "Housing" ? ["No.", "Photo", ...hcols.map((c) => c.label), ...sups, "Variant"] : TABLE_HEAD[cat]).map((h, i) => <th key={`${h}${i}`} className={cat === "Housing" && sups.includes(h) ? "sup" : ""}>{h}</th>)}<th className="r">Stock</th><th /></tr></thead>
                          <tbody>{shown.map((i) => <ItemRow key={`${i.kind}-${i.n || i.code}`} item={i} stockOf={stockOf} mode={mode} cart={cart} onSet={setQty} comboMap={comboMap} imageFor={imageFor} onDetails={(item,variant)=>setDetail({item,variant})} />)}</tbody>
                        </table>
                      </div>
                    ) : grouped.map(([g, list]) => (
                      <section key={g}>
                        <h2 className="gh">{g}</h2>
                        <div className="grid">
                          {list.map((i) => <ProductCard key={`${i.kind}-${i.n || i.code}`} item={i} stockOf={stockOf} mode={mode} cart={cart} onSet={setQty} comboMap={comboMap} imageFor={imageFor} onDetails={(item,variant)=>setDetail({item,variant})} />)}
                        </div>
                      </section>
                    ))}
                    {visible.length > shown.length && (
                      <button className="more" onClick={() => setLimit((n) => n + PAGE)}>Show more ({visible.length - shown.length} left)</button>
                    )}
                  </>
                )}
            </div>
          </div>
        )}
      </main>

      {count > 0 && !cartOpen && view !== "ledger" && (
        <button className="float" onClick={() => setCartOpen(true)}>
          <span>{count} item{count > 1 ? "s" : ""} ready to {mode === "OUT" ? "check out" : "check in"}</span><b>View cart</b>
        </button>
      )}
      {detail && <ProductDetail item={detail.item} initialVariant={detail.variant} onClose={()=>setDetail(null)} data={data} comboMap={comboMap} imageFor={imageFor} stockOf={stockOf} mode={mode} cart={cart} onSet={setQty} onOpenCart={()=>{setDetail(null);setCartOpen(true)}} />}
      <CartDrawer purchases={purchases} selectedPurchase={selectedPurchase} onSelectPurchase={setSelectedPurchase} remainingFor={remainingFor} open={cartOpen} onClose={() => setCartOpen(false)} mode={mode} lines={lines} stockOf={stockOf} onSet={setQty}
        onClear={() => setCarts((c) => ({ ...c, [mode]: {} }))} onSubmit={submit} busy={busy} />
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`} role="status">{toast.msg}</div>}
    </div>
  );
}

/* ============================== STYLES ============================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
.app{--bg:#F2F4F7;--card:#fff;--ink:#122033;--muted:#667489;--line:#E2E7EE;--amber:#F6A800;--in:#12805C;--out:#D6471F;
  --mode:var(--out);--mode-soft:#FCEAE4;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;font-size:15px}
.app.mode-in{--mode:var(--in);--mode-soft:#E1F3EC}
.app *{box-sizing:border-box}
.app button{font:inherit;cursor:pointer;border:0;background:none;color:inherit}
.app button:focus-visible,.app input:focus-visible,.app select:focus-visible{outline:3px solid #2B6BFF55;outline-offset:2px}
.app input,.app select{font:inherit;color:inherit}
.top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:14px;padding:10px 20px;background:#fff;border-bottom:1px solid var(--line);flex-wrap:wrap}
.brand{display:flex;gap:10px;align-items:center;min-width:170px}
.brand b{display:block;font-weight:800;letter-spacing:-.01em}
.brand small{color:var(--muted);font-size:12px}
.seg{display:flex;background:#EDF0F4;border-radius:12px;padding:4px}
.seg button{padding:8px 16px;border-radius:9px;font-weight:700;color:var(--muted)}
.seg button.on{background:#fff;box-shadow:0 1px 3px #12203322}
.seg button.on.out{color:var(--out)}.seg button.on.in{color:var(--in)}
.seg.small button{padding:6px 12px;font-size:13px}.seg.small button.on{color:var(--ink)}
.search{flex:1;min-width:200px;height:44px;border-radius:12px;border:1px solid var(--line);background:#F7F9FB;padding:0 14px}
.search.plain{background:#fff;flex:0 1 320px;height:38px}
.nav{display:flex;gap:2px}
.nav button{padding:8px 12px;border-radius:9px;font-weight:600;color:var(--muted)}
.nav button.on{color:var(--ink);background:#EDF0F4}
.cartbtn{display:flex;align-items:center;gap:8px;background:var(--mode);color:#fff!important;padding:0 16px;height:44px;border-radius:12px;font-weight:700}
.banner{padding:9px 20px;background:#FFF4D6;color:#6B4B00;font-size:13px}
.banner.bad{background:#FDE5DF;color:#8A2A10}
.linkbtn{text-decoration:underline;color:var(--muted);font-size:13px;padding:6px}
.main{max-width:1320px;margin:0 auto;padding:18px 20px 110px}
.shop{display:grid;grid-template-columns:104px 1fr;gap:20px}
.rail{position:sticky;top:78px;align-self:start;display:flex;flex-direction:column;gap:6px}
.rail button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;border-radius:14px;color:var(--muted);font-size:12.5px;font-weight:600}
.rail button.on{background:#fff;color:var(--ink);box-shadow:inset 3px 0 0 var(--amber),0 1px 3px #12203318}
.rail em{font-style:normal;font-size:11px;color:var(--muted)}
.gh{font-size:17px;font-weight:800;margin:22px 0 10px;letter-spacing:-.01em}
.gh.first{margin-top:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(188px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:10px;display:flex;flex-direction:column;gap:8px}
.card.is-empty{opacity:.75}
.thumb{position:relative;aspect-ratio:1/0.7;border-radius:11px;background:#F4EFE2;display:grid;place-items:center;color:#9A7A1E}
.stock{position:absolute;left:6px;bottom:6px;background:#fff;border-radius:7px;padding:3px 7px;font-size:11px;font-weight:700;color:var(--in)}
.stock.low{color:#B26A00}.stock.zero{color:var(--out)}
.meta h3{font-size:14px;line-height:1.25;margin:0;font-weight:700}
.sku{margin:3px 0 0;font:500 12px 'JetBrains Mono',monospace;color:var(--muted)}
.grp{margin:2px 0 0;font-size:11.5px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.vsel{height:36px;border-radius:9px;border:1px solid var(--line);padding:0 8px;font-size:12.5px;background:#fff;width:100%}
.act{margin-top:auto}
.add{width:100%;height:38px;border-radius:10px;border:1.5px solid var(--mode)!important;color:var(--mode);font-weight:800}
.add:hover:not(:disabled){background:var(--mode-soft)}
.add:disabled{border-color:var(--line)!important;color:var(--muted);cursor:not-allowed}
.stepper{display:flex;align-items:center;height:38px;border-radius:10px;background:var(--mode);color:#fff}
.stepper button{width:38px;height:100%;font-size:20px;font-weight:700;color:#fff}
.stepper button:disabled{opacity:.4;cursor:not-allowed}
.stepper input{flex:1;min-width:0;width:100%;text-align:center;background:transparent;border:0;color:#fff;font-weight:800}
.more{display:block;margin:22px auto 0;padding:11px 20px;border-radius:12px;background:#fff;border:1px solid var(--line)!important;font-weight:700}
.float{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:15;display:flex;gap:18px;align-items:center;background:var(--mode);color:#fff!important;border-radius:14px;padding:13px 20px;box-shadow:0 8px 24px #12203344;font-weight:600}
.float b{background:#ffffff2e;padding:5px 10px;border-radius:8px}
.scrim{position:fixed;inset:0;background:#12203366;z-index:40;opacity:0;pointer-events:none;transition:opacity .2s}
.scrim.show{opacity:1;pointer-events:auto}
.drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,100vw);background:#fff;z-index:50;display:flex;flex-direction:column;transform:translateX(105%);transition:transform .22s ease}
.drawer.open{transform:none}
.drawer header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid var(--line)}
.drawer h2{margin:0;font-size:18px}
.icon{width:36px;height:36px;border-radius:10px;background:#EDF0F4}
.lines{list-style:none;margin:0;padding:6px 18px;overflow:auto;flex:1}
.lines li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}
.lines b{display:block;font-size:13.5px;line-height:1.3}
.lines small{color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:11.5px}
.lines .stepper{width:116px;flex:none}
.empty{display:grid;justify-items:center;gap:6px;padding:46px 20px;color:var(--muted);text-align:center;flex:1}
.form{padding:12px 18px;display:grid;gap:10px;border-top:1px solid var(--line)}
.fld{display:grid;gap:5px;font-size:12.5px;font-weight:700;color:var(--muted)}
.fld input,.fld select{height:42px;border-radius:10px;border:1px solid var(--line);padding:0 12px;background:#fff;font-weight:500;color:var(--ink)}
.drawer footer{padding:14px 18px 18px;border-top:1px solid var(--line);display:grid;gap:8px;text-align:center}
.sum{display:flex;justify-content:space-between;font-size:14px}
.primary{background:var(--mode);color:#fff!important;font-weight:800;height:46px;padding:0 20px;border-radius:12px}
.primary:disabled{background:#CBD3DE;cursor:not-allowed}
.primary.wide{width:100%}
.hint{margin:0 0 6px;color:var(--muted);font-size:13px}

.build{display:grid;grid-template-columns:1fr 340px;gap:22px;align-items:start}
.bcol{display:grid;gap:16px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px}
.pwrap{position:relative}
.pwrap ul{position:absolute;z-index:10;left:0;right:0;top:46px;margin:0;padding:4px;list-style:none;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 10px 28px #12203325;max-height:320px;overflow:auto}
.pwrap li button{width:100%;text-align:left;padding:9px 10px;border-radius:8px;font-weight:600;color:var(--ink);font-size:13.5px}
.pwrap li button:hover{background:#F2F4F7}
.pwrap li.none{padding:10px;color:var(--muted);font-weight:500}
.pwrap small,.picked small{display:block;font-weight:500;color:var(--muted);font-size:12px}
.picked{display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid var(--line);background:#F7F9FB;border-radius:10px;padding:9px 12px;color:var(--ink);font-weight:600;font-size:13.5px}
.picked button{font-weight:700;color:var(--mode);font-size:13px}
.vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px;max-height:280px;overflow:auto}
.vopt{display:flex;gap:8px;align-items:center;text-align:left;padding:8px 10px;border-radius:10px;border:1px solid var(--line)!important;background:#fff;font-size:12.5px;font-weight:500;color:var(--ink)}
.vopt b{min-width:26px;height:26px;display:grid;place-items:center;border-radius:7px;background:#EDF0F4;font-family:'JetBrains Mono',monospace}
.vopt.on{border-color:var(--mode)!important;background:var(--mode-soft)}
.bsum{position:sticky;top:90px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;display:grid;gap:12px}
.bsum small{color:var(--muted);font-weight:700}
.codebox{font:500 28px 'JetBrains Mono',monospace;background:#F4EFE2;border-radius:12px;padding:16px;text-align:center;word-break:break-all}
.bt{margin:0;font-weight:600;line-height:1.4}
.bs{margin:0;font-weight:700;color:var(--in)}.bs.zero{color:var(--out)}
.warn{margin:0;color:#8A2A10;background:#FDE5DF;border-radius:10px;padding:10px;font-size:13px}

.viewbar{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.count{color:var(--muted);font-size:13px;font-weight:600}
.vfilter{height:38px;border-radius:10px;border:1px solid var(--line);padding:0 10px;background:#fff;max-width:300px}
.dtable{min-width:760px}
.dtable th{position:sticky;top:0;background:#fff;z-index:1}
.dtable td{white-space:pre-line;max-width:none;vertical-align:middle;background:#fff}
.dtable td.photo{width:52px;padding:6px 8px;color:#9A7A1E}.dtable td.photo img{width:40px;height:40px;object-fit:cover;border-radius:6px}
.dtable th.sup{background:#FFF4D6}
.dtable td.num,.dtable th:first-child{position:sticky;left:0;z-index:2;background:#fff}
.dtable td.actcell,.dtable th:last-child{position:sticky;right:0;z-index:2;background:#fff;box-shadow:-8px 0 8px -8px #12203333}
.dtable tr.is-empty td{opacity:.7}
.dtable td.num{font:600 13px 'JetBrains Mono',monospace;width:64px}
.dtable .stk{font-weight:800;color:var(--in)}.dtable .stk.low{color:#B26A00}.dtable .stk.zero{color:var(--out)}
.dtable .actcell{width:150px;min-width:130px}
.dtable .vsel{min-width:150px}
.dtable .add{height:34px;padding:0 10px}.dtable .stepper{height:34px}
.dim{color:var(--muted)}
.vletter{display:inline-grid;place-items:center;min-width:28px;height:26px;padding:0 6px;border-radius:7px;background:#122033;color:#fff;font:600 13px 'JetBrains Mono',monospace}
.ledger-bar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.tablewrap{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:14px}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{text-align:left;padding:11px 12px;color:var(--muted);font-weight:700;border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:10px 12px;border-bottom:1px solid #EEF1F5;white-space:nowrap;max-width:360px;overflow:hidden;text-overflow:ellipsis}
.r{text-align:right}.mono{font-family:'JetBrains Mono',monospace;font-size:12.5px}
.pill{padding:3px 9px;border-radius:999px;font-size:12px;font-weight:700}
.pill.in{background:#E1F3EC;color:var(--in)}.pill.out{background:#FCEAE4;color:var(--out)}
.toast{position:fixed;top:78px;left:50%;transform:translateX(-50%);z-index:60;padding:12px 18px;border-radius:12px;color:#fff;font-weight:700;box-shadow:0 8px 24px #12203344}
.toast.ok{background:var(--in)}.toast.bad{background:var(--out)}
@media (max-width:860px){.build{grid-template-columns:1fr}.bsum{position:static}}
@media (max-width:760px){
  .top{padding:10px 12px;gap:10px}
  .brand small{display:none}.brand{min-width:0}
  .search{order:5;flex-basis:100%}.nav{order:4}
  .shop{grid-template-columns:1fr;gap:6px}
  .rail{position:static;flex-direction:row;overflow-x:auto;gap:6px}
  .rail button{flex:none;flex-direction:row;gap:6px;padding:8px 12px;background:#fff;border-radius:999px}
  .rail button svg{width:20px;height:20px}.rail em{display:none}
  .grid{grid-template-columns:repeat(2,1fr)}
  .main{padding:12px 12px 110px}
}
@media (prefers-reduced-motion:reduce){.drawer,.scrim{transition:none}}
`;

/* Per-housing variant sheet layout */
const __retinaVariantStyles = typeof document !== "undefined" ? (() => {
  if (document.getElementById("retina-variant-styles")) return;
  const style = document.createElement("style"); style.id="retina-variant-styles";
  style.textContent = `.variant-summary{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:16px 18px;margin:12px 0 18px;background:#f7f9fc;border:1px solid #e2e8f0;border-radius:12px}.variant-tags{display:flex;gap:7px;flex-wrap:wrap}.variant-tag{background:#e8efff;color:#264a91;padding:5px 9px;border-radius:20px;font-size:12px}.variant-workspace .tablewrap{overflow-x:auto}.variant-workspace .dtable{min-width:780px}.variant-workspace .dtable td{vertical-align:middle}`;
  document.head.appendChild(style);
})() : undefined;
/* Product detail overlay styles */
const __retinaDetailStyles = typeof document !== "undefined" ? (() => {
  if(document.getElementById("retina-detail-styles"))return;
  const el=document.createElement("style");el.id="retina-detail-styles";
  el.textContent=`
.detail-link{border:0;background:none;color:#3159a4;font-size:12px;font-weight:700;text-align:left;padding:7px 0;cursor:pointer}.thumb[role=button]{cursor:pointer}.thumb img{display:block;max-width:88%!important;max-height:88%!important;width:88%!important;height:88%!important;object-fit:contain!important;object-position:center!important;margin:auto!important;padding:0!important}
.pd-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.6);display:flex;justify-content:center;align-items:flex-start;padding:24px;overflow-y:auto}.pd-panel{width:min(1040px,100%);background:#fff;border-radius:18px;box-shadow:0 30px 90px #0004;padding:28px;color:#17243a}.pd-top{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #e2e8f0;padding-bottom:17px}.pd-top h2{font-size:27px;margin:5px 0}.pd-top p{margin:0;color:#64748b}.pd-eyebrow,.pd-label{font-size:11px;letter-spacing:1.5px;font-weight:800;color:#aa7410}.pd-close{border:1px solid #e2e8f0;background:#fff;border-radius:50%;width:38px;height:38px;cursor:pointer}.pd-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,1fr);gap:24px;margin:22px 0}.pd-photo{height:300px;border-radius:14px;background:#f7f3ea;display:flex;align-items:center;justify-content:center;overflow:hidden}.pd-photo img{width:88%;height:88%;object-fit:contain;object-position:center}.pd-hero-copy{padding:16px 0}.pd-code{font-size:24px;font-weight:800;margin:10px 0;overflow-wrap:anywhere}.pd-hero-copy p{color:#64748b;line-height:1.5}.pd-stock{display:inline-block;background:#e9f8ed;color:#176b3c;padding:8px 12px;border-radius:20px;font-weight:800}.pd-note{font-size:12px}.pd-heading{font-size:17px;margin:26px 0 12px;padding-bottom:9px;border-bottom:1px solid #e2e8f0}.pd-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#e2e8f0;border:1px solid #e2e8f0}.pd-fact{background:#fff;padding:12px 14px;display:flex;flex-direction:column;gap:4px;min-width:0}.pd-fact span{color:#64748b;font-size:12px}.pd-fact strong{font-size:14px;overflow-wrap:anywhere}.pd-schematics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.pd-schematic{border:1px solid #e2e8f0;border-radius:12px;padding:15px;display:flex;flex-direction:column;gap:8px}.pd-schematic svg{width:100%;height:140px}.pd-schematic small{color:#64748b;font-size:11px}.pd-schematic p{margin:0;font-size:13px}.pd-config{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.pd-config label{font-size:12px;font-weight:700;display:flex;flex-direction:column;gap:8px}.pd-config select{width:100%;min-width:0;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff}.pd-warning{color:#b45309}.pd-docs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.pd-docs>div{border:1px solid #e2e8f0;border-radius:10px;padding:14px}.pd-docs p{color:#64748b;font-size:12px;line-height:1.5}.pd-footer{position:sticky;bottom:-28px;background:#fff;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:17px 0 8px;margin-top:24px}.pd-footer>div:first-child{display:flex;flex-direction:column;gap:3px;min-width:0}.pd-footer strong{overflow-wrap:anywhere}.pd-footer small,.pd-footer span{color:#64748b}.pd-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.pd-add,.pd-cart{padding:12px 17px;border-radius:9px;border:0;font-weight:800;cursor:pointer}.pd-add{background:#d97706;color:#fff}.pd-add:disabled{opacity:.5;cursor:not-allowed}.pd-cart{background:#e2e8f0;color:#17243a}
@media(max-width:650px){.pd-backdrop{padding:8px}.pd-panel{padding:16px}.pd-hero,.pd-schematics{grid-template-columns:1fr}.pd-photo{height:220px}.pd-facts,.pd-config,.pd-docs{grid-template-columns:1fr}.pd-footer{bottom:-16px;align-items:stretch;flex-direction:column}.pd-top h2{font-size:22px}}
`;
  document.head.appendChild(el);
})() : undefined;
