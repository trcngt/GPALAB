// ==========================================
// GPALAB - TRỢ LÝ QUẢN LÝ & DỰ BÁO ĐIỂM SỐ
// ==========================================

// 1. CẤU HÌNH THANG ĐIỂM
const GRADE_SCALES = {
  standard: {
    "A": { g4: 4.0, g10: 9.0 },
    "B+": { g4: 3.5, g10: 8.2 },
    "B": { g4: 3.0, g10: 7.5 },
    "C+": { g4: 2.5, g10: 6.7 },
    "C": { g4: 2.0, g10: 6.0 },
    "D+": { g4: 1.5, g10: 5.2 },
    "D": { g4: 1.0, g10: 4.5 },
    "F": { g4: 0.0, g10: 0.0 }
  },
  detailed: {
    "A+": { g4: 4.0, g10: 9.5 },
    "A": { g4: 3.8, g10: 8.7 },
    "B+": { g4: 3.5, g10: 8.2 },
    "B": { g4: 3.0, g10: 7.5 },
    "C+": { g4: 2.5, g10: 6.7 },
    "C": { g4: 2.0, g10: 6.0 },
    "D+": { g4: 1.5, g10: 5.2 },
    "D": { g4: 1.0, g10: 4.5 },
    "F": { g4: 0.0, g10: 0.0 }
  }
};

let currentScaleKey = "standard";
let currentUser = null;
let trendChart = null;
let gradeDistChart = null;

// ==========================================
// 2. KHỞI TẠO BIỂU ĐỒ (CHART.JS)
// ==========================================
function initCharts() {
  const ctxTrend = document.getElementById("trendChart");
  if (ctxTrend) {
    trendChart = new Chart(ctxTrend, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: "GPA Học kỳ (Hệ 4)",
          data: [],
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#4338ca"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 4.0, ticks: { stepSize: 0.5 } }
        }
      }
    });
  }

  const ctxDist = document.getElementById("gradeDistChart");
  if (ctxDist) {
    gradeDistChart = new Chart(ctxDist, {
      type: "doughnut",
      data: {
        labels: ["A/A+", "B+", "B", "C+", "C", "D+/D", "F"],
        datasets: [{
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: [
            "#10b981", "#3b82f6", "#6366f1", "#f59e0b",
            "#ea580c", "#ef4444", "#64748b"
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right" }
        }
      }
    });
  }
}

// ==========================================
// 3. XÂY DỰNG GIAO DIỆN HỌC KỲ & MÔN HỌC
// ==========================================
function getGradeOptionsHtml(selectedGrade = "") {
  const currentScale = GRADE_SCALES[currentScaleKey];
  let html = `<option value="">-- Chọn điểm --</option>`;
  for (const grade in currentScale) {
    const isSelected = grade === selectedGrade ? "selected" : "";
    html += `<option value="${grade}" ${isSelected}>${grade}</option>`;
  }
  return html;
}

function addSubjectRow(container, data = null) {
  const row = document.createElement("div");
  row.className = "subject-row grid grid-cols-12 gap-2 items-center mb-2 text-xs";
  
  const subName = data ? data.name : "";
  const subCredits = data ? data.credits : 3;
  const grade1 = data ? data.grade1 : "";
  const grade2 = data ? data.grade2 : "";
  const isExcluded = data ? data.isExcluded : false;

  row.innerHTML = `
    <input type="text" placeholder="Tên môn học" value="${subName}" class="sub-name col-span-4 border dark:border-slate-700 dark:bg-slate-900 rounded p-1.5 focus:ring-1 focus:ring-indigo-500" oninput="calculateAll(); saveData();">
    <input type="number" min="0" max="30" value="${subCredits}" class="sub-credits col-span-2 border dark:border-slate-700 dark:bg-slate-900 rounded p-1.5 text-center font-semibold" oninput="calculateAll(); saveData();">
    <select class="sub-g1 col-span-2 border dark:border-slate-700 dark:bg-slate-900 rounded p-1.5 text-center font-medium" onchange="calculateAll(); saveData();">
      ${getGradeOptionsHtml(grade1)}
    </select>
    <select class="sub-g2 col-span-2 border dark:border-slate-700 dark:bg-slate-900 rounded p-1.5 text-center text-amber-600 font-medium" onchange="calculateAll(); saveData();">
      <option value="">-- Học lại --</option>
      ${getGradeOptionsHtml(grade2)}
    </select>
    <div class="col-span-1 text-center">
      <input type="checkbox" title="Bỏ tính vào GPA/CPA (Môn điều kiện)" class="sub-exclude rounded border-slate-300 text-indigo-600" ${isExcluded ? "checked" : ""} onchange="calculateAll(); saveData();">
    </div>
    <div class="col-span-1 text-center flex justify-center items-center gap-1">
      <span class="sub-g4 font-bold text-indigo-600 dark:text-indigo-400">-</span>
      <button onclick="this.closest('.subject-row').remove(); calculateAll(); saveData();" class="text-slate-400 hover:text-red-500 font-bold ml-1">✕</button>
    </div>
  `;

  container.appendChild(row);
}

function addSemesterBlock(data = null) {
  const container = document.getElementById("semesterContainer");
  if (!container) return;

  const semIndex = container.children.length + 1;
  const semBlock = document.createElement("div");
  semBlock.className = "semester-card bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-700 mb-4 transition-all";

  const defaultSemTitle = `Học kỳ ${semIndex}`;
  const semName = data ? data.name : defaultSemTitle;

  semBlock.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 border-b dark:border-slate-700 pb-3 mb-3">
      <div class="flex items-center gap-2">
        <input type="text" value="${semName}" class="sem-title font-bold text-sm sm:text-base bg-transparent border-b border-transparent focus:border-indigo-500 px-1 py-0.5 outline-none" oninput="saveData();">
      </div>
      <div class="flex items-center gap-3 text-xs">
        <span class="sem-summary text-slate-500 dark:text-slate-400 font-medium">Tín chỉ: <b class="sem-tc text-slate-800 dark:text-slate-200">0</b> | GPA Hệ 4: <b class="sem-gpa4 text-indigo-600 font-bold">0.00</b> | Xếp loại: <b class="sem-rank text-emerald-600 font-semibold">-</b></span>
        <button onclick="this.closest('.semester-card').remove(); calculateAll(); saveData();" class="text-xs text-red-500 hover:underline">Xóa kỳ</button>
      </div>
    </div>
    <div class="subject-header grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
      <div class="col-span-4">Tên môn học</div>
      <div class="col-span-2 text-center">Số TC</div>
      <div class="col-span-2 text-center">Điểm gốc</div>
      <div class="col-span-2 text-center">Cải thiện</div>
      <div class="col-span-1 text-center">Bỏ tính</div>
      <div class="col-span-1 text-center">Hệ 4</div>
    </div>
    <div class="subject-list"></div>
    <button onclick="addSubjectRow(this.previousElementSibling)" class="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1">
      + Thêm môn học
    </button>
  `;

  container.appendChild(semBlock);
  const subjectList = semBlock.querySelector(".subject-list");

  if (data && data.subjects && data.subjects.length > 0) {
    data.subjects.forEach(sub => addSubjectRow(subjectList, sub));
  } else {
    // Tạo sẵn 3 môn mặc định cho kỳ mới
    for (let i = 0; i < 3; i++) addSubjectRow(subjectList);
  }
}

// ==========================================
// 4. TÍNH TOÁN ĐIỂM SỐ & CHẨN ĐOÁN CẢI THIỆN
// ==========================================
function calculateRank(cpa) {
  if (cpa >= 3.6) return "Xuất sắc";
  if (cpa >= 3.2) return "Giỏi";
  if (cpa >= 2.5) return "Khá";
  if (cpa >= 2.0) return "Trung bình";
  if (cpa > 0) return "Yếu / Kém";
  return "Chưa xác định";
}

function calculateAll() {
  const currentScale = GRADE_SCALES[currentScaleKey];
  let totalAllCredits = 0;
  let totalAllPoints4 = 0;
  let totalAllPoints10 = 0;

  const semGPA4List = [];
  const semLabels = [];
  const gradeCount = { "A/A+": 0, "B+": 0, "B": 0, "C+": 0, "C": 0, "D+/D": 0, "F": 0 };
  const retakeCandidates = [];

  const semCards = document.querySelectorAll("#semesterContainer .semester-card");

  semCards.forEach((card, sIdx) => {
    const semTitle = card.querySelector(".sem-title").value || `Học kỳ ${sIdx + 1}`;
    let semCredits = 0;
    let semPoints4 = 0;
    let semPoints10 = 0;

    const rows = card.querySelectorAll(".subject-row");
    rows.forEach(row => {
      const name = row.querySelector(".sub-name").value.trim() || `Môn ${sIdx + 1}`;
      const credits = parseFloat(row.querySelector(".sub-credits").value) || 0;
      const g1 = row.querySelector(".sub-g1").value;
      const g2 = row.querySelector(".sub-g2").value;
      const isExcluded = row.querySelector(".sub-exclude").checked;
      const effectiveGrade = g2 || g1;

      if (effectiveGrade && currentScale[effectiveGrade]) {
        const g4 = currentScale[effectiveGrade].g4;
        const g10 = currentScale[effectiveGrade].g10;
        row.querySelector(".sub-g4").innerText = g4.toFixed(1);

        // Đếm phân bổ điểm chữ
        if (effectiveGrade === "A" || effectiveGrade === "A+") gradeCount["A/A+"]++;
        else if (effectiveGrade === "B+") gradeCount["B+"]++;
        else if (effectiveGrade === "B") gradeCount["B"]++;
        else if (effectiveGrade === "C+") gradeCount["C+"]++;
        else if (effectiveGrade === "C") gradeCount["C"]++;
        else if (effectiveGrade === "D+" || effectiveGrade === "D") gradeCount["D+/D"]++;
        else if (effectiveGrade === "F") gradeCount["F"]++;

        // Ghi nhận gợi ý học cải thiện (nếu điểm gốc <= 2.5 và chưa cải thiện lên cao)
        if (!isExcluded && credits > 0) {
          const originalG4 = currentScale[g1] ? currentScale[g1].g4 : g4;
          if (originalG4 < 3.0 && (!g2 || (currentScale[g2] && currentScale[g2].g4 <= originalG4))) {
            retakeCandidates.push({ name, credits, originalG4, originalGrade: g1 });
          }
        }

        if (!isExcluded) {
          semCredits += credits;
          semPoints4 += g4 * credits;
          semPoints10 += g10 * credits;
        }
      } else {
        row.querySelector(".sub-g4").innerText = "-";
      }
    });

    const semGPA4 = semCredits > 0 ? (semPoints4 / semCredits) : 0;
    const semRank = semCredits > 0 ? calculateRank(semGPA4) : "-";

    card.querySelector(".sem-tc").innerText = semCredits;
    card.querySelector(".sem-gpa4").innerText = semGPA4.toFixed(2);
    card.querySelector(".sem-rank").innerText = semRank;

    totalAllCredits += semCredits;
    totalAllPoints4 += semPoints4;
    totalAllPoints10 += semPoints10;

    semLabels.push(semTitle);
    semGPA4List.push(parseFloat(semGPA4.toFixed(2)));
  });

  const cpa4 = totalAllCredits > 0 ? (totalAllPoints4 / totalAllCredits) : 0;
  const cpa10 = totalAllCredits > 0 ? (totalAllPoints10 / totalAllCredits) : 0;

  // Cập nhật lên Dashboard tổng quan
  document.getElementById("totalCreditsAll").innerText = totalAllCredits;
  document.getElementById("totalSemestersCount").innerText = semCards.length;
  document.getElementById("totalCPA4").innerText = cpa4.toFixed(2);
  document.getElementById("totalCPA10").innerText = cpa10.toFixed(2);
  document.getElementById("cpaRank").innerText = calculateRank(cpa4);

  // Cập nhật biểu đồ
  if (trendChart) {
    trendChart.data.labels = semLabels;
    trendChart.data.datasets[0].data = semGPA4List;
    trendChart.update();
  }
  if (gradeDistChart) {
    gradeDistChart.data.datasets[0].data = Object.values(gradeCount);
    gradeDistChart.update();
  }

  // Chẩn đoán học cải thiện
  renderRetakeSuggestions(retakeCandidates, totalAllCredits, cpa4);

  // Tính toán kế hoạch mục tiêu
  calculateGoal();
}

function renderRetakeSuggestions(candidates, totalCredits, currentCPA) {
  const container = document.getElementById("retakeSuggestions");
  if (!container) return;

  if (candidates.length === 0 || totalCredits === 0) {
    container.innerHTML = `<li class="text-xs text-slate-500 italic">Bảng điểm rất tốt! Chưa phát hiện môn cần ưu tiên học cải thiện.</li>`;
    return;
  }

  // Sắp xếp môn có ROI tăng điểm CPA cao nhất lên đầu (Credits * deltaPoint)
  candidates.sort((a, b) => {
    const gainA = ((3.5 - a.originalG4) * a.credits) / totalCredits;
    const gainB = ((3.5 - b.originalG4) * b.credits) / totalCredits;
    return gainB - gainA;
  });

  let html = "";
  candidates.slice(0, 4).forEach(item => {
    const gain = (((3.5 - item.originalG4) * item.credits) / totalCredits).toFixed(2);
    html += `
      <li class="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1 mb-1.5">
        <span class="text-indigo-600 font-bold">📌 ${item.name}</span> (${item.credits} TC, điểm ${item.originalGrade}): Học lại lên <b>B+</b> &rarr; CPA tăng <b class="text-emerald-600">+${gain}</b> điểm.
      </li>
    `;
  });

  container.innerHTML = html;
}

// ==========================================
// 5. TÍNH MỤC TIÊU CPA (ĐÃ XỬ LÝ TRIỆT ĐỂ LỖI)
// ==========================================
function calculateGoal() {
  const targetCPAEl = document.getElementById("targetCPA");
  const totalProgramCreditsEl = document.getElementById("totalProgramCredits");
  const goalResult = document.getElementById("neededGPA");

  if (!targetCPAEl || !totalProgramCreditsEl || !goalResult) return;

  // Chuẩn hóa dấu phẩy thành dấu chấm
  const rawTargetCPA = targetCPAEl.value.toString().replace(',', '.').trim();
  const targetCPA = parseFloat(rawTargetCPA) || 3.2;

  const rawTotalCredits = totalProgramCreditsEl.value.toString().replace(',', '.').trim();
  const totalProgramCredits = parseFloat(rawTotalCredits) || 130;

  const currentCredits = parseFloat(document.getElementById("totalCreditsAll").innerText.replace(',', '.')) || 0;
  const currentCPA4 = parseFloat(document.getElementById("totalCPA4").innerText.replace(',', '.')) || 0;

  const remainingCredits = totalProgramCredits - currentCredits;

  // 1. Chưa có môn học nào
  if (currentCredits === 0) {
    goalResult.innerHTML = `Cần đạt trung bình: <strong>${targetCPA.toFixed(2)} GPA</strong> / kỳ (${totalProgramCredits} TC toàn khóa)`;
    goalResult.className = "text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300";
    return;
  }

  // 2. ĐÃ HỌC ĐỦ HOẶC VƯỢT TÍN CHỈ (remainingCredits <= 0)
  if (remainingCredits <= 0) {
    const roundedCurrentCPA = Math.round(currentCPA4 * 100) / 100;
    const roundedTargetCPA = Math.round(targetCPA * 100) / 100;

    if (roundedCurrentCPA >= roundedTargetCPA) {
      goalResult.innerHTML = `🎉 <strong>Chúc mừng!</strong> Bạn đã tích lũy đủ <strong>${currentCredits}/${totalProgramCredits} TC</strong> và <strong>ĐẠT MỤC TIÊU</strong> (CPA: <span class="text-emerald-600 font-bold">${currentCPA4.toFixed(2)}</span> / ${targetCPA.toFixed(2)}).`;
      goalResult.className = "text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 leading-relaxed";
    } else {
      const diff = (targetCPA - currentCPA4).toFixed(2);
      goalResult.innerHTML = `⚠️ <strong>CHƯA ĐẠT MỤC TIÊU:</strong> Đã hoàn thành <strong>${currentCredits}/${totalProgramCredits} TC</strong> nhưng CPA đạt <strong>${currentCPA4.toFixed(2)}</strong> / ${targetCPA.toFixed(2)} (còn thiếu <strong>${diff}</strong> điểm). Hãy chọn học cải thiện các môn điểm thấp để nâng CPA!`;
      goalResult.className = "text-xs text-amber-600 dark:text-amber-400 leading-relaxed";
    }
    return;
  }

  // 3. VẪN CÒN TÍN CHỈ CHƯA HỌC
  const currentPoints = currentCPA4 * currentCredits;
  const targetTotalPoints = targetCPA * totalProgramCredits;
  const neededPoints = targetTotalPoints - currentPoints;
  const neededGPA = neededPoints / remainingCredits;

  if (neededGPA > 4.0) {
    goalResult.innerHTML = `❌ Cần <strong>${neededGPA.toFixed(2)} GPA</strong> cho ${remainingCredits} TC còn lại.<br><span class="text-[11px] font-normal opacity-90">(Mục tiêu không khả thi nếu chỉ học môn mới. Hãy kết hợp học cải thiện các môn cũ).</span>`;
    goalResult.className = "text-xs font-semibold text-red-500 leading-relaxed";
  } else if (neededGPA <= 0) {
    goalResult.innerHTML = `🎉 CPA hiện tại (<strong>${currentCPA4.toFixed(2)}</strong>) đã chắc chắn vượt mục tiêu ${targetCPA.toFixed(2)}!`;
    goalResult.className = "text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 leading-relaxed";
  } else {
    goalResult.innerHTML = `Cần đạt trung bình: <strong class="text-indigo-600 dark:text-indigo-400 text-sm sm:text-base">${neededGPA.toFixed(2)} GPA</strong> / kỳ (${remainingCredits} TC còn lại)`;
    goalResult.className = "text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed";
  }
}

// ==========================================
// 6. XUẤT BẢNG ĐIỂM PDF SẮC NÉT (CHUẨN IN)
// ==========================================
function exportToPDF() {
  const currentCredits = document.getElementById("totalCreditsAll")?.innerText || "0";
  const cpa4 = document.getElementById("totalCPA4")?.innerText || "0.00";
  const cpa10 = document.getElementById("totalCPA10")?.innerText || "0.00";
  const cpaRank = document.getElementById("cpaRank")?.innerText || "Chưa xác định";
  
  const userNameEl = document.getElementById("userNameNav") || document.querySelector("header span");
  const userName = userNameEl ? userNameEl.innerText.replace("Đã đồng bộ Cloud", "").trim() : "Sinh viên GPALAB";

  const targetCPA = document.getElementById("targetCPA")?.value || "3.20";
  const goalText = document.getElementById("neededGPA")?.innerText || "";
  const suggestItems = Array.from(document.querySelectorAll("#retakeSuggestions li")).map(li => `<li>${li.innerText}</li>`).join("");

  let semestersSummaryHtml = "";
  const semBlocks = document.querySelectorAll("#semesterContainer .semester-card");

  semBlocks.forEach((sem, idx) => {
    const semName = sem.querySelector(".sem-title")?.value || `Học kỳ ${idx + 1}`;
    const tc = sem.querySelector(".sem-tc")?.innerText || "-";
    const gpa4 = sem.querySelector(".sem-gpa4")?.innerText || "-";
    const rank = sem.querySelector(".sem-rank")?.innerText || "-";

    semestersSummaryHtml += `
      <tr>
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 500;">${semName}</td>
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 600;">${tc}</td>
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #4338ca;">${gpa4}</td>
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center;">${rank}</td>
      </tr>
    `;
  });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Bang_Diem_GPALAB_${new Date().toISOString().slice(0, 10)}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 15mm; }
        *, *::before, *::after { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1e293b; margin: 0; padding: 0; font-size: 10pt; line-height: 1.4;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .header {
          background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%);
          color: #ffffff; padding: 16px 20px; border-radius: 8px; margin-bottom: 14px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .title { font-size: 15pt; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0; }
        .subtitle { font-size: 8.5pt; opacity: 0.9; margin: 0; }
        .user-info { text-align: right; font-size: 9pt; }
        
        .stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px;
        }
        .stat-card {
          background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; text-align: center;
        }
        .stat-label { font-size: 7.5pt; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
        .stat-val { font-size: 13pt; font-weight: 800; color: #1e1b4b; }
        
        .section-title {
          font-size: 10.5pt; font-weight: 700; color: #1e293b;
          border-left: 4px solid #4f46e5; padding-left: 8px; margin: 12px 0 8px 0; text-transform: uppercase;
        }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9pt; }
        th { background: #f1f5f9; color: #334155; padding: 7px 10px; border: 1px solid #cbd5e1; text-align: left; font-weight: 700; }
        
        .callout {
          background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b;
          border-radius: 6px; padding: 10px 14px; font-size: 9pt; color: #92400e;
        }
        .footer {
          margin-top: 15px; text-align: center; font-size: 8pt; color: #94a3b8;
          border-top: 1px solid #e2e8f0; padding-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">BẢNG TỔNG HỢP KẾT QUẢ HỌC TẬP</div>
          <div class="subtitle">Hệ thống tính toán & quản lý GPALAB</div>
        </div>
        <div class="user-info">
          <div>Sinh viên: <strong>${userName}</strong></div>
          <div style="margin-top: 3px; font-size: 8pt; opacity: 0.85;">Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Tổng Tín Chỉ</div><div class="stat-val">${currentCredits}</div></div>
        <div class="stat-card"><div class="stat-label">Số Học Kỳ</div><div class="stat-val">${semBlocks.length}</div></div>
        <div class="stat-card"><div class="stat-label">CPA Hệ 4</div><div class="stat-val" style="color: #4338ca;">${cpa4}</div></div>
        <div class="stat-card"><div class="stat-label">Xếp Loại</div><div class="stat-val" style="color: #059669;">${cpaRank.toUpperCase()}</div></div>
      </div>

      <div class="section-title">1. TỔNG QUAN KẾT QUẢ THEO TỪNG HỌC KỲ</div>
      <table>
        <thead>
          <tr>
            <th>Học kỳ</th>
            <th style="text-align: center; width: 20%;">Số tín chỉ</th>
            <th style="text-align: center; width: 25%;">GPA Kỳ (Hệ 4)</th>
            <th style="text-align: center; width: 25%;">Xếp loại</th>
          </tr>
        </thead>
        <tbody>
          ${semestersSummaryHtml}
          <tr style="background-color: #eef2ff; font-weight: bold;">
            <td style="padding: 7px 10px; border: 1px solid #cbd5e1;">TỔNG TOÀN KHÓA</td>
            <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center;">${currentCredits} TC</td>
            <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; color: #4338ca;">CPA ${cpa4}</td>
            <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669;">${cpaRank.toUpperCase()}</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">2. KẾ HOẠCH MỤC TIÊU & ĐỀ XUẤT CẢI THIỆN</div>
      <div class="callout">
        <div style="font-weight: bold; margin-bottom: 4px;">🎯 Mục tiêu CPA (${targetCPA} / 4.0):</div>
        <div>${goalText}</div>
        ${suggestItems ? `<div style="margin-top: 6px; font-weight: bold;">💡 Các môn nên học cải thiện để kéo CPA:</div><ul style="margin: 4px 0 0 18px; padding: 0;">${suggestItems}</ul>` : ''}
      </div>

      <div class="footer">
        GPALAB Academic Suite • Bản in trực tiếp từ trcngt.github.io/GPALAB
      </div>

      <script>
        window.onload = function() { window.print(); };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ==========================================
// 7. LƯU & TẢI DỮ LIỆU (LOCALSTORAGE + FIREBASE)
// ==========================================
function getAppState() {
  const semCards = document.querySelectorAll("#semesterContainer .semester-card");
  const semestersData = [];

  semCards.forEach(card => {
    const semName = card.querySelector(".sem-title").value;
    const subjects = [];
    const rows = card.querySelectorAll(".subject-row");

    rows.forEach(row => {
      subjects.push({
        name: row.querySelector(".sub-name").value,
        credits: parseFloat(row.querySelector(".sub-credits").value) || 0,
        grade1: row.querySelector(".sub-g1").value,
        grade2: row.querySelector(".sub-g2").value,
        isExcluded: row.querySelector(".sub-exclude").checked
      });
    });

    semestersData.push({ name: semName, subjects });
  });

  return {
    scaleKey: currentScaleKey,
    targetCPA: document.getElementById("targetCPA")?.value || "3.20",
    totalProgramCredits: document.getElementById("totalProgramCredits")?.value || "130",
    semesters: semestersData
  };
}

function saveData() {
  const state = getAppState();
  localStorage.setItem("GPALAB_DATA", JSON.stringify(state));

  // Nếu đã đăng nhập Firebase, tự động đồng bộ lên Firestore
  if (currentUser && window.db) {
    window.db.collection("users").doc(currentUser.uid).set({
      gpalab_data: state,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => console.error("Lỗi đồng bộ Cloud:", err));
  }
}

function loadData() {
  const raw = localStorage.getItem("GPALAB_DATA");
  const container = document.getElementById("semesterContainer");
  if (!container) return;
  container.innerHTML = "";

  if (raw) {
    try {
      const state = JSON.parse(raw);
      if (state.targetCPA) document.getElementById("targetCPA").value = state.targetCPA;
      if (state.totalProgramCredits) document.getElementById("totalProgramCredits").value = state.totalProgramCredits;
      if (state.scaleKey) currentScaleKey = state.scaleKey;

      if (state.semesters && state.semesters.length > 0) {
        state.semesters.forEach(sem => addSemesterBlock(sem));
      } else {
        addSemesterBlock();
      }
    } catch (e) {
      console.error("Lỗi parse LocalStorage:", e);
      addSemesterBlock();
    }
  } else {
    addSemesterBlock();
  }

  calculateAll();
}

function clearAllData() {
  if (confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu bảng điểm?")) {
    localStorage.removeItem("GPALAB_DATA");
    location.reload();
  }
}

// ==========================================
// 8. ĐĂNG NHẬP GOOGLE VỚI FIREBASE (FIX LỖI POPUP/SAFARI)
// ==========================================
async function loginGoogle() {
  if (!window.firebase || !firebase.auth) {
    alert("Chưa nạp được thư viện Firebase!");
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await firebase.auth().signInWithPopup(provider);
    currentUser = result.user;
    updateUserUI(currentUser);
  } catch (error) {
    console.warn("Popup bị chặn, chuyển sang Redirect:", error);
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request'
    ) {
      firebase.auth().signInWithRedirect(provider);
    } else {
      alert("Lỗi đăng nhập: " + error.message);
    }
  }
}

function logoutGoogle() {
  if (firebase.auth) {
    firebase.auth().signOut().then(() => {
      currentUser = null;
      updateUserUI(null);
    });
  }
}

function updateUserUI(user) {
  const loginBtn = document.getElementById("loginGoogleBtn");
  const userBox = document.getElementById("userProfileNav");
  const userNameNav = document.getElementById("userNameNav");
  const userAvatarNav = document.getElementById("userAvatarNav");

  if (user) {
    if (loginBtn) loginBtn.classList.add("hidden");
    if (userBox) userBox.classList.remove("hidden");
    if (userNameNav) userNameNav.innerText = user.displayName || user.email;
    if (userAvatarNav) userAvatarNav.src = user.photoURL || "fox.png";
  } else {
    if (loginBtn) loginBtn.classList.remove("hidden");
    if (userBox) userBox.classList.add("hidden");
  }
}

// ==========================================
// 9. KHỞI CHẠY HỆ THỐNG
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  initCharts();
  loadData();

  // Khởi tạo Auth listener nếu có Firebase
  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      currentUser = user;
      updateUserUI(user);
      if (user && window.db) {
        window.db.collection("users").doc(user.uid).get().then(doc => {
          if (doc.exists && doc.data().gpalab_data) {
            localStorage.setItem("GPALAB_DATA", JSON.stringify(doc.data().gpalab_data));
            loadData();
          }
        });
      }
    });

    firebase.auth().getRedirectResult().then(result => {
      if (result.user) {
        currentUser = result.user;
        updateUserUI(result.user);
      }
    }).catch(err => console.error("Lỗi redirect auth:", err));
  }
});