export interface ParetoDefectItem {
  errorCode: string;
  station: string;
  testItem: string;
  count: number;
  percentOfFails: number;
  cumulativePercent: number;
}

export interface CpkMetricItem {
  testItem: string;
  station: string;
  unit: string;
  sampleCount: number;
  lsl: number;
  usl: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  cp: number;
  cpk: number;
  status: "good" | "warning" | "danger";
}

export interface LogAnalysisResult {
  fileName: string;
  analyzedAt: string;
  totalRecords: number;
  uniqueUnits: number;
  passCount: number;
  failCount: number;
  retestOkCount: number;
  yieldRate: number; // %
  fpyRate: number; // First Pass Yield %
  falseCallRate: number; // %
  stations: string[];
  pareto: ParetoDefectItem[];
  cpkItems: CpkMetricItem[];
  aiSummaryPrompt: string;
}

export const SAMPLE_FACTORY_CSV_LOG = `SN,Station,Result,ErrorCode,TestItem,Value,LSL,USL,Unit,Timestamp
SN20261022001,FCT-02,PASS,NONE,VDD_3V3,3.31,3.15,3.45,V,2026-10-22 08:01:10
SN20261022002,FCT-02,PASS,NONE,VDD_3V3,3.29,3.15,3.45,V,2026-10-22 08:02:15
SN20261022003,FCT-02,FAIL,ERR-FCT-104,VDD_3V3,0.42,3.15,3.45,V,2026-10-22 08:03:20
SN20261022003,FCT-02,PASS,NONE,VDD_3V3,3.30,3.15,3.45,V,2026-10-22 08:04:05
SN20261022004,FCT-02,PASS,NONE,VDD_3V3,3.32,3.15,3.45,V,2026-10-22 08:05:12
SN20261022005,FCT-02,FAIL,ERR-FCT-104,VDD_3V3,0.18,3.15,3.45,V,2026-10-22 08:06:00
SN20261022006,FCT-02,FAIL,ERR-FCT-104,VDD_3V3,0.25,3.15,3.45,V,2026-10-22 08:07:11
SN20261022007,FCT-02,PASS,NONE,VDD_3V3,3.28,3.15,3.45,V,2026-10-22 08:08:30
SN20261022008,FCT-02,FAIL,ERR-FCT-104,VDD_3V3,0.12,3.15,3.45,V,2026-10-22 08:09:40
SN20261022009,FCT-02,PASS,NONE,VDD_3V3,3.31,3.15,3.45,V,2026-10-22 08:10:22
SN20261022010,FCT-02,FAIL,ERR-FCT-104,VDD_3V3,0.31,3.15,3.45,V,2026-10-22 08:11:18
SN20261022011,FCT-02,PASS,NONE,VDD_3V3,3.30,3.15,3.45,V,2026-10-22 08:12:05
SN20261022012,FCT-02,PASS,NONE,VDD_3V3,3.29,3.15,3.45,V,2026-10-22 08:13:00
SN20261022013,FCT-02,FAIL,ERR-FCT-104,VDD_3V3,0.20,3.15,3.45,V,2026-10-22 08:14:10
SN20261022013,FCT-02,PASS,NONE,VDD_3V3,3.31,3.15,3.45,V,2026-10-22 08:15:00
SN20261022014,RF-WIFI-BT-01,PASS,NONE,TX_POWER_5G,15.8,14.0,18.0,dBm,2026-10-22 08:16:12
SN20261022015,RF-WIFI-BT-01,PASS,NONE,TX_POWER_5G,15.5,14.0,18.0,dBm,2026-10-22 08:17:20
SN20261022016,RF-WIFI-BT-01,FAIL,SOP-RF-CAL-01,TX_POWER_5G,13.4,14.0,18.0,dBm,2026-10-22 08:18:05
SN20261022016,RF-WIFI-BT-01,PASS,NONE,TX_POWER_5G,15.6,14.0,18.0,dBm,2026-10-22 08:19:00
SN20261022017,RF-WIFI-BT-01,FAIL,SOP-RF-CAL-01,TX_POWER_5G,13.6,14.0,18.0,dBm,2026-10-22 08:20:11
SN20261022018,RF-WIFI-BT-01,PASS,NONE,TX_POWER_5G,15.4,14.0,18.0,dBm,2026-10-22 08:21:30
SN20261022019,RF-WIFI-BT-01,FAIL,SOP-RF-CAL-01,TX_POWER_5G,13.5,14.0,18.0,dBm,2026-10-22 08:22:15
SN20261022020,RF-WIFI-BT-01,PASS,NONE,TX_POWER_5G,15.7,14.0,18.0,dBm,2026-10-22 08:23:05
SN20261022021,RF-WIFI-BT-01,PASS,NONE,TX_POWER_5G,15.3,14.0,18.0,dBm,2026-10-22 08:24:10
SN20261022022,FCT-02,FAIL,SFC-ERR-504,MES_UPLOAD,0,1,1,Flag,2026-10-22 08:25:00
SN20261022023,FCT-02,FAIL,SFC-ERR-504,MES_UPLOAD,0,1,1,Flag,2026-10-22 08:26:12
SN20261022024,FCT-02,PASS,NONE,AUDIO_SNR,72.4,60.0,85.0,dB,2026-10-22 08:27:00
SN20261022025,FCT-02,PASS,NONE,AUDIO_SNR,73.1,60.0,85.0,dB,2026-10-22 08:28:15
SN20261022026,FCT-02,PASS,NONE,AUDIO_SNR,71.8,60.0,85.0,dB,2026-10-22 08:29:20
SN20261022027,FCT-02,PASS,NONE,AUDIO_SNR,72.9,60.0,85.0,dB,2026-10-22 08:30:10
SN20261022028,FCT-02,PASS,NONE,AUDIO_SNR,72.2,60.0,85.0,dB,2026-10-22 08:31:05
SN20261022029,FCT-02,FAIL,ERR-AUDIO-201,AUDIO_SNR,54.5,60.0,85.0,dB,2026-10-22 08:32:00
SN20261022030,FCT-02,PASS,NONE,AUDIO_SNR,73.0,60.0,85.0,dB,2026-10-22 08:33:12`;

export function parseAndAnalyzeTestLog(
  rawText: string,
  fileName = "Station_Test_Log.csv"
): LogAnalysisResult {
  const lines = rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("File log trống hoặc không đủ dữ liệu để phân tích.");
  }

  // Detect delimiter (comma, tab, semicolon, or pipe)
  const headerLine = lines[0];
  let delimiter = ",";
  if (headerLine.includes("\t")) delimiter = "\t";
  else if (headerLine.includes(";")) delimiter = ";";
  else if (headerLine.includes("|")) delimiter = "|";

  const headers = headerLine
    .split(delimiter)
    .map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

  const findColIdx = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const snIdx = findColIdx(["sn", "serial", "barcode", "mac", "id", "uid"]);
  const stationIdx = findColIdx(["station", "machine", "line", "tester", "tram"]);
  const resultIdx = findColIdx(["result", "status", "pass", "judge", "ketqua"]);
  const errorIdx = findColIdx(["error", "failcode", "defect", "err", "code", "maloi"]);
  const itemIdx = findColIdx(["testitem", "item", "step", "parameter", "name"]);
  const valIdx = findColIdx(["value", "measured", "val", "reading", "giatri"]);
  const lslIdx = findColIdx(["lsl", "min", "lowlimit", "lower"]);
  const uslIdx = findColIdx(["usl", "max", "highlimit", "upper"]);
  const unitIdx = findColIdx(["unit", "donvi"]);

  let totalRecords = 0;
  let passCount = 0;
  let failCount = 0;

  const snHistory = new Map<string, string[]>();
  const stationSet = new Set<string>();
  const defectMap = new Map<
    string,
    { errorCode: string; station: string; testItem: string; count: number }
  >();
  const cpkGroups = new Map<
    string,
    {
      testItem: string;
      station: string;
      unit: string;
      lsl: number;
      usl: number;
      values: number[];
    }
  >();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]
      .split(delimiter)
      .map((c) => c.trim().replace(/^["']|["']$/g, ""));
    if (cols.length < 2) continue;

    totalRecords++;

    const sn = snIdx >= 0 && cols[snIdx] ? cols[snIdx] : `UNIT_${i}`;
    const station =
      stationIdx >= 0 && cols[stationIdx] ? cols[stationIdx] : "FCT-01";
    stationSet.add(station);

    // Determine PASS/FAIL
    let rawResult =
      resultIdx >= 0 && cols[resultIdx]
        ? cols[resultIdx].toUpperCase()
        : lines[i].toUpperCase().includes("FAIL") ||
          lines[i].toUpperCase().includes("NG")
        ? "FAIL"
        : "PASS";

    const isFail =
      rawResult.includes("FAIL") ||
      rawResult === "NG" ||
      rawResult === "0" ||
      rawResult === "FALSE";
    rawResult = isFail ? "FAIL" : "PASS";

    if (isFail) failCount++;
    else passCount++;

    // Track SN sequence for First Pass Yield & False Call (Retest OK)
    const prevResults = snHistory.get(sn) || [];
    prevResults.push(rawResult);
    snHistory.set(sn, prevResults);

    // Track Error Code for Pareto
    const testItem =
      itemIdx >= 0 && cols[itemIdx] ? cols[itemIdx] : "General_Test";
    if (isFail) {
      let errCode =
        errorIdx >= 0 && cols[errorIdx] ? cols[errorIdx] : testItem;
      if (!errCode || errCode.toUpperCase() === "NONE" || errCode === "-") {
        errCode = `FAIL_${testItem}`;
      }
      const existing = defectMap.get(errCode);
      if (existing) {
        existing.count++;
      } else {
        defectMap.set(errCode, {
          errorCode: errCode,
          station,
          testItem,
          count: 1,
        });
      }
    }

    // Track numeric measurements for CPK calculation
    if (valIdx >= 0 && lslIdx >= 0 && uslIdx >= 0) {
      const val = parseFloat(cols[valIdx]);
      const lsl = parseFloat(cols[lslIdx]);
      const usl = parseFloat(cols[uslIdx]);
      const unit = unitIdx >= 0 && cols[unitIdx] ? cols[unitIdx] : "";

      if (!isNaN(val) && !isNaN(lsl) && !isNaN(usl) && usl > lsl) {
        const key = `${station}::${testItem}`;
        const grp = cpkGroups.get(key) || {
          testItem,
          station,
          unit,
          lsl,
          usl,
          values: [],
        };
        grp.values.push(val);
        cpkGroups.set(key, grp);
      }
    }
  }

  // Compute Unique Units, First Pass Yield (FPY), and False Call (Retest OK)
  const uniqueUnits = snHistory.size || totalRecords;
  let firstPassOkUnits = 0;
  let retestOkCount = 0;

  for (const [, seq] of snHistory.entries()) {
    if (seq[0] === "PASS") {
      firstPassOkUnits++;
    } else if (seq[0] === "FAIL" && seq.includes("PASS")) {
      retestOkCount++;
    }
  }

  const yieldRate =
    totalRecords > 0 ? Number(((passCount / totalRecords) * 100).toFixed(2)) : 0;
  const fpyRate =
    uniqueUnits > 0
      ? Number(((firstPassOkUnits / uniqueUnits) * 100).toFixed(2))
      : yieldRate;
  const falseCallRate =
    uniqueUnits > 0
      ? Number(((retestOkCount / uniqueUnits) * 100).toFixed(2))
      : 0;

  // Build sorted Pareto list
  const sortedDefects = Array.from(defectMap.values()).sort(
    (a, b) => b.count - a.count
  );
  let cumulative = 0;
  const pareto: ParetoDefectItem[] = sortedDefects.slice(0, 6).map((d) => {
    const pct =
      failCount > 0 ? Number(((d.count / failCount) * 100).toFixed(1)) : 0;
    cumulative = Number(Math.min(100, cumulative + pct).toFixed(1));
    return {
      errorCode: d.errorCode,
      station: d.station,
      testItem: d.testItem,
      count: d.count,
      percentOfFails: pct,
      cumulativePercent: cumulative,
    };
  });

  // Compute CPK metrics for each test item
  const cpkItems: CpkMetricItem[] = [];
  for (const [, grp] of cpkGroups.entries()) {
    if (grp.values.length < 3) continue;
    const n = grp.values.length;
    const mean = grp.values.reduce((s, v) => s + v, 0) / n;
    const variance =
      grp.values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...grp.values);
    const max = Math.max(...grp.values);

    let cp = 9.99;
    let cpk = 9.99;
    if (stdDev > 1e-9) {
      cp = (grp.usl - grp.lsl) / (6 * stdDev);
      const cpu = (grp.usl - mean) / (3 * stdDev);
      const cpl = (mean - grp.lsl) / (3 * stdDev);
      cpk = Math.min(cpu, cpl);
    }

    const cleanCpk = Number(Math.max(0, cpk).toFixed(2));
    const cleanCp = Number(Math.max(0, cp).toFixed(2));
    const status: "good" | "warning" | "danger" =
      cleanCpk >= 1.33 ? "good" : cleanCpk >= 1.0 ? "warning" : "danger";

    cpkItems.push({
      testItem: grp.testItem,
      station: grp.station,
      unit: grp.unit,
      sampleCount: n,
      lsl: grp.lsl,
      usl: grp.usl,
      mean: Number(mean.toFixed(3)),
      stdDev: Number(stdDev.toFixed(4)),
      min: Number(min.toFixed(3)),
      max: Number(max.toFixed(3)),
      cp: cleanCp,
      cpk: cleanCpk,
      status,
    });
  }

  cpkItems.sort((a, b) => a.cpk - b.cpk);

  // Build concise summary prompt for Tier 2 AI RAG Analysis
  const topParetoText =
    pareto.length > 0
      ? pareto
          .map(
            (p, idx) =>
              `${idx + 1}. Mã lỗi [${p.errorCode}] tại trạm ${p.station} (${p.testItem}): ${p.count} mẫu lỗi (${p.percentOfFails}% tổng lỗi)`
          )
          .join("\n")
      : "Không có lỗi nào phát sinh.";

  const cpkSummaryText =
    cpkItems.length > 0
      ? cpkItems
          .map(
            (c) =>
              `- Bài đo ${c.testItem} (${c.station}): Mean=${c.mean}${c.unit} [LSL=${c.lsl}, USL=${c.usl}], StdDev=${c.stdDev}, Cpk=${c.cpk} (${
                c.status === "good"
                  ? "ĐẠT >=1.33"
                  : c.status === "warning"
                  ? "CẢNH BÁO 1.0-1.33"
                  : "NGUY HIỂM <1.0"
              })`
          )
          .join("\n")
      : "Chưa có dữ liệu giới hạn đo LSL/USL.";

  const aiSummaryPrompt = `Hãy phân tích báo cáo thống kê Log kiểm thử từ file "${fileName}" dưới đây và đối chiếu với Kho Tri Thức TE của tôi để đưa ra:
1. Đánh giá nhanh chất lượng ca sản xuất (FPY, Yield, False Call và bài đo có Cpk thấp).
2. Nguyên nhân gốc & Các bước xử lý ưu tiên cho Top mã lỗi Pareto đứng đầu.
3. Bản tóm tắt Báo cáo bàn giao ca (Shift Handover Report) ngắn gọn để gửi cho quản lý.

[DỮ LIỆU ĐO LƯỜNG TẦNG 1]:
- Tổng lượt test: ${totalRecords} (${uniqueUnits} sản phẩm riêng biệt)
- PASS: ${passCount} | FAIL: ${failCount}
- Tỷ lệ đạt tổng (Yield): ${yieldRate}% | Tỷ lệ đạt lần đầu (FPY): ${fpyRate}%
- Tỷ lệ báo lỗi ảo (Retest OK / False Call): ${falseCallRate}% (${retestOkCount} pcs)

[TOP LỖI PARETO]:
${topParetoText}

[CHỈ SỐ NĂNG LỰC QUÁ TRÌNH CPK]:
${cpkSummaryText}`;

  return {
    fileName,
    analyzedAt: new Date().toLocaleTimeString("vi-VN"),
    totalRecords,
    uniqueUnits,
    passCount,
    failCount,
    retestOkCount,
    yieldRate,
    fpyRate,
    falseCallRate,
    stations: Array.from(stationSet),
    pareto,
    cpkItems,
    aiSummaryPrompt,
  };
}
