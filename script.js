// ===== CẤU HÌNH FIREBASE =====
const firebaseConfig = {
  apiKey: "AIzaSyCORR7q7fLBgFnXeaSHaC_evHPEbl4BUwU",
  authDomain: "gpa-cpa-calculator.firebaseapp.com",
  projectId: "gpa-cpa-calculator",
  storageBucket: "gpa-cpa-calculator.firebasestorage.app",
  messagingSenderId: "236389025248",
  appId: "1:236389025248:web:78f72389250ee18415d785",
  measurementId: "G-19E8H633DX"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
const STORAGE_KEY = "GPA_CPA_GROUPED_DATA_V9";

// Biến instance cho 2 biểu đồ
let gpaChartInstance = null;
let gradeDistChartInstance = null;

let customGradeMapValues = {
  "A+": 4.0, "A": 3.7, "B+": 3.5, "B": 3.0, "C+": 2.5, "C": 2.0, "D+": 1.5, "D": 1.0, "F": 0.0
};

const GRADE_MAPS = {
  standard_a: {
    "A":  { gpa4: 4.0, gpa10: 9.0 },
    "B+": { gpa4: 3.5, gpa10: 8.2 },
    "B":  { gpa4: 3.0, gpa10: 7.5 },
    "C+": { gpa4: 2.5, gpa10: 6.7 },
    "C":  { gpa4: 2.0, gpa10: 6.0 },
    "D+": { gpa4: 1.5, gpa10: 5.2 },
    "D":  { gpa4: 1.0, gpa10: 4.5 },
    "F":  { gpa4: 0.0, gpa10: 0.0 }
  },
  plus_a: {
    "A+": { gpa4: 4.0, gpa10: 9.5 },
    "A":  { gpa4: 3.7, gpa10: 8.8 },
    "B+": { gpa4: 3.5, gpa10: 8.2 },
    "B":  { gpa4: 3.0, gpa10: 7.5 },
    "C+": { gpa4: 2.5, gpa10: 6.7 },
    "C":  { gpa4: 2.0, gpa10: 6.0 },
    "D+": { gpa4: 1.5, gpa10: 5.2 },
    "D":  { gpa4: 1.0, gpa10: 4.5 },
    "F":  { gpa4: 0.0, gpa10: 0.0 }
  },
  custom: {}
};

// ----- DARK MODE TOGGLE -----
function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');
  if (isDark) {
    html.classList.remove('dark');
    document.getElementById('themeIcon').innerText = '🌙';
    localStorage.setItem('theme', 'light');
  } else {
    html.classList.add('dark');
    document.getElementById('themeIcon').innerText = '☀️';
    localStorage.setItem('theme', 'dark');
  }
  calculate();
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.getElementById('themeIcon').innerText = '☀️';
  }
}

// ----- TOGGLE PANEL & SAVE CUSTOM GRADE MAP -----
function toggleCustomGradePanel() {
  const scale = document.getElementById("gradeScale").value;
  const wrapper = document.getElementById("customGradeWrapper");
  if (scale === "custom") {
    wrapper.classList.remove("hidden");
  } else {
    wrapper.classList.add("hidden");
  }
}

function saveCustomScale() {
  customGradeMapValues["A+"] = parseFloat(document.getElementById("cust_Aplus").value) || 4.0;
  customGradeMapValues["A"] = parseFloat(document.getElementById("cust_A").value) || 3.7;
  customGradeMapValues["B+"] = parseFloat(document.getElementById("cust_Bplus").value) || 3.5;
  customGradeMapValues["B"] = parseFloat(document.getElementById("cust_B").value) || 3.0;
  customGradeMapValues["C+"] = parseFloat(document.getElementById("cust_Cplus").value) || 2.5;
  customGradeMapValues["C"] = parseFloat(document.getElementById("cust_C").value) || 2.0;
  customGradeMapValues["D+"] = parseFloat(document.getElementById("cust_Dplus").value) || 1.5;
  customGradeMapValues["D"] = parseFloat(document.getElementById("cust_D").value) || 1.0;
  customGradeMapValues["F"] = parseFloat(document.getElementById("cust_F").value) || 0.0;

  updateCustomGradeMapObject();
  calculate();
  saveData();
}

function updateCustomGradeMapObject() {
  GRADE_MAPS.custom = {};
  Object.keys(customGradeMapValues).forEach(g => {
    GRADE_MAPS.custom[g] = { gpa4: customGradeMapValues[g], gpa10: customGradeMapValues[g] * 2.25 };
  });
}

// ----- AUTHENTICATION GOOGLE -----
function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(error => alert("Lỗi đăng nhập: " + error.message));
}

function logoutGoogle() {
  auth.signOut().then(() => alert("Đã đăng xuất!"));
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  const loginBtn = document.getElementById("loginBtn");
  const userInfo = document.getElementById("userInfo");

  if (user) {
    if (loginBtn) loginBtn.classList.add("hidden");
    if (userInfo) userInfo.classList.remove("hidden");
    const avatar = document.getElementById("userAvatar");
    const name = document.getElementById("userName");
    if (avatar) avatar.src = user.photoURL || "fox.png";
    if (name) name.innerText = user.displayName || user.email;

    // Tự động tải dữ liệu từ Cloud về
    if (db) {
      db.collection("users").doc(user.uid).get().then(doc => {
        if (doc.exists) {
          loadData(doc.data());
        } else {
          loadData();
        }
      }).catch(err => {
        console.error("Lỗi tải Cloud:", err);
        loadData();
      });
    }
  } else {
    if (loginBtn) loginBtn.classList.remove("hidden");
    if (userInfo) userInfo.classList.add("hidden");
    loadData();
  }
});

function generateSemesterOptionsHTML(selectedTitle = "") {
  const years = parseFloat(document.getElementById("programYears").value) || 4;
  const list = [];
  let mainSemCount = 1;

  for (let y = 1; y <= Math.ceil(years); y++) {
    list.push(`Học kỳ ${mainSemCount} (Kỳ 1 - Năm ${y})`);
    mainSemCount++;

    if (mainSemCount <= Math.round(years * 2)) {
      list.push(`Học kỳ ${mainSemCount} (Kỳ 2 - Năm ${y})`);
      mainSemCount++;
    }
    list.push(`Học kỳ Phụ (Hè Năm ${y})`);
  }

  return list.map((sem, idx) => {
    const isSel = selectedTitle ? sem === selectedTitle : idx === document.querySelectorAll(".semester-card").length;
    return `<option value="${sem}" ${isSel ? 'selected' : ''}>${sem}</option>`;
  }).join("");
}

function updateAllSemesterDropdowns() {
  document.querySelectorAll(".sem-title-select").forEach(select => {
    const currentVal = select.value;
    select.innerHTML = generateSemesterOptionsHTML(currentVal);
  });
}

function addSemesterBlock(savedTitle = null, courses = null) {
  const container = document.getElementById("semesterContainer");
  const semId = "sem_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

  const semBlock = document.createElement("div");
  semBlock.className = "semester-card bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden";
  semBlock.setAttribute("data-sem-id", semId);

  semBlock.innerHTML = `
    <div class="p-4 bg-slate-100 dark:bg-slate-900 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-200 dark:border-slate-700">
      <div class="flex items-center space-x-2 w-full lg:w-auto">
        <select class="sem-title-select font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full lg:w-80" onchange="calculate(); saveData();">
          ${generateSemesterOptionsHTML(savedTitle)}
        </select>
      </div>

      <div class="flex flex-wrap items-center justify-between lg:justify-end w-full lg:w-auto gap-x-4 gap-y-1 text-sm">
        <div class="text-slate-600 dark:text-slate-300">
          Tín chỉ: <span class="sem-credits font-bold text-slate-800 dark:text-slate-100">0</span> |
          GPA Kỳ (Hệ 4): <span class="sem-gpa4 font-bold text-indigo-600 dark:text-indigo-400">0.00</span> |
          GPA Kỳ (Hệ 10): <span class="sem-gpa10 font-bold text-emerald-600 dark:text-emerald-400">0.00</span>
        </div>
        <div class="text-slate-600 dark:text-slate-300">
          Xếp loại: <span class="sem-rank font-bold text-amber-600">Chưa xác định</span>
        </div>
        <button onclick="removeSemesterBlock(this)" data-html2canvas-ignore="true" class="text-xs text-red-500 hover:text-red-700 font-medium border border-red-200 hover:border-red-400 px-2.5 py-1 rounded transition">
          Xóa Kỳ
        </button>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse min-w-[750px]">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
            <th class="p-3">Tên môn học</th>
            <th class="p-3 w-20">Số TC</th>
            <th class="p-3 w-32">Điểm ban đầu</th>
            <th class="p-3 w-32">Điểm cải thiện</th>
            <th class="p-3 w-16 text-center">Bỏ GPA</th>
            <th class="p-3 w-16">Hệ 4</th>
            <th class="p-3 w-16">Hệ 10</th>
            <th class="p-3 w-12 text-center" data-html2canvas-ignore="true">Xóa</th>
          </tr>
        </thead>
        <tbody class="course-tbody divide-y divide-slate-100 dark:divide-slate-700 text-sm">
        </tbody>
      </table>
    </div>

    <div class="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 flex justify-start" data-html2canvas-ignore="true">
      <button onclick="addCourseRow('${semId}')" class="text-xs bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-medium px-3 py-1.5 rounded border border-indigo-200 dark:border-indigo-800 transition">
        + Thêm môn học
      </button>
    </div>
  `;

  container.appendChild(semBlock);

  if (courses && courses.length > 0) {
    courses.forEach(c => addCourseRow(semId, c));
  } else {
    addCourseRow(semId);
    addCourseRow(semId);
  }

  calculate();
  return semId;
}

function removeSemesterBlock(btn) {
  if (confirm("Bạn có chắc chắn muốn xóa học kỳ này?")) {
    btn.closest(".semester-card").remove();
    calculate();
    saveData();
  }
}

function addCourseRow(semId, data = null) {
  const semBlock = document.querySelector(`[data-sem-id="${semId}"]`);
  if (!semBlock) return;

  const tbody = semBlock.querySelector(".course-tbody");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td class="p-3">
      <input type="text" placeholder="Tên môn học..." value="${data ? data.name : ''}" class="subject-name w-full border dark:border-slate-700 bg-transparent rounded p-1.5 focus:outline-indigo-500 text-xs" oninput="calculate(); saveData();" />
    </td>
    <td class="p-3">
      <input type="number" min="1" max="10" placeholder="Số TC" value="${data && data.credit !== undefined ? data.credit : ''}" class="credit-input w-full border dark:border-slate-700 bg-transparent rounded p-1.5 focus:outline-indigo-500 text-xs" oninput="calculate(); saveData();" />
    </td>
    <td class="p-3">
      <select class="grade-select w-full border dark:border-slate-700 dark:bg-slate-800 rounded p-1.5 text-xs font-medium focus:outline-indigo-500" onchange="calculate(); saveData();">
      </select>
    </td>
    <td class="p-3">
      <select class="improve-grade-select w-full border dark:border-slate-700 dark:bg-slate-800 rounded p-1.5 text-xs font-medium focus:outline-indigo-500" onchange="calculate(); saveData();">
      </select>
    </td>
    <td class="p-3 text-center">
      <input type="checkbox" class="exclude-checkbox h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" ${data && data.excludeGPA ? 'checked' : ''} onchange="calculate(); saveData();" />
    </td>
    <td class="p-3 font-semibold text-indigo-600 dark:text-indigo-400 grade-4-display">-</td>
    <td class="p-3 font-semibold text-emerald-600 dark:text-emerald-400 grade-10-display">-</td>
    <td class="p-3 text-center" data-html2canvas-ignore="true">
      <button onclick="removeCourseRow(this)" class="text-red-500 hover:text-red-700 font-bold px-2">✕</button>
    </td>
  `;

  tbody.appendChild(tr);

  const gradeSelect = tr.querySelector(".grade-select");
  const improveGradeSelect = tr.querySelector(".improve-grade-select");

  renderGradeOptionsForSelect(gradeSelect, data ? data.grade : "", "-- Chọn điểm --");
  renderGradeOptionsForSelect(improveGradeSelect, data ? data.improveGrade : "", "-- Điểm học lại --");

  calculate();
}

function removeCourseRow(btn) {
  btn.closest("tr").remove();
  calculate();
  saveData();
}

function renderAllGradeOptions() {
  document.querySelectorAll(".semester-card tr").forEach(row => {
    const gradeSelect = row.querySelector(".grade-select");
    const improveSelect = row.querySelector(".improve-grade-select");

    if (gradeSelect) renderGradeOptionsForSelect(gradeSelect, gradeSelect.value, "-- Chọn điểm --");
    if (improveSelect) renderGradeOptionsForSelect(improveSelect, improveSelect.value, "-- Điểm học lại --");
  });
}

function renderGradeOptionsForSelect(selectElement, currentValue = "", defaultText = "-- Chọn điểm --") {
  updateCustomGradeMapObject();
  const currentScale = document.getElementById("gradeScale").value;
  const scaleMap = GRADE_MAPS[currentScale] || GRADE_MAPS.standard_a;
  const grades = Object.keys(scaleMap);

  let html = `<option value="" ${!currentValue ? 'selected' : ''}>${defaultText}</option>`;
  html += grades.map(g => `<option value="${g}" ${g === currentValue ? 'selected' : ''}>${g}</option>`).join("");

  selectElement.innerHTML = html;
}

// ----- CALCULATION & CHARTS & GOAL & INSIGHTS -----
function calculate() {
  updateCustomGradeMapObject();
  const scaleKey = document.getElementById("gradeScale").value;
  const gradeMap = GRADE_MAPS[scaleKey] || GRADE_MAPS.standard_a;

  let grandTotalCredits = 0;
  let grandTotalPoints4 = 0;
  let grandTotalPoints10 = 0;

  const semBlocks = document.querySelectorAll(".semester-card");
  const chartLabels = [];
  const chartDataGPA4 = [];
  const lowGradeCourses = [];

  const gradeCounts = {};

  semBlocks.forEach(semBlock => {
    const semTitle = semBlock.querySelector(".sem-title-select").value;
    const rows = semBlock.querySelectorAll(".course-tbody tr");
    let semCredits = 0;
    let semPoints4 = 0;
    let semPoints10 = 0;

    rows.forEach(row => {
      const creditVal = row.querySelector(".credit-input").value;
      const credit = parseFloat(creditVal);
      const primaryGrade = row.querySelector(".grade-select").value;
      const improveGrade = row.querySelector(".improve-grade-select").value;
      const isExcluded = row.querySelector(".exclude-checkbox").checked;
      const subjectName = row.querySelector(".subject-name").value || "Môn học";

      const activeGrade = improveGrade || primaryGrade;

      if (!isNaN(credit) && credit > 0 && activeGrade && gradeMap[activeGrade]) {
        const grade4 = gradeMap[activeGrade].gpa4;
        const grade10 = gradeMap[activeGrade].gpa10;

        const g4Display = row.querySelector(".grade-4-display");
        const g10Display = row.querySelector(".grade-10-display");

        g4Display.innerText = grade4.toFixed(1);
        g10Display.innerText = grade10.toFixed(1);

        if (improveGrade) {
          g4Display.className = "p-3 font-bold text-amber-500 grade-4-display";
          g10Display.className = "p-3 font-bold text-amber-500 grade-10-display";
        } else {
          g4Display.className = "p-3 font-semibold text-indigo-600 dark:text-indigo-400 grade-4-display";
          g10Display.className = "p-3 font-semibold text-emerald-600 dark:text-emerald-400 grade-10-display";
        }

        if (!isExcluded) {
          semCredits += credit;
          semPoints4 += grade4 * credit;
          semPoints10 += grade10 * credit;

          gradeCounts[activeGrade] = (gradeCounts[activeGrade] || 0) + 1;

          if (["F", "D", "D+", "C", "C+"].includes(activeGrade) && !improveGrade) {
            lowGradeCourses.push({ name: subjectName, credit, currentGrade: activeGrade, currentGrade4: grade4 });
          }
        }
      } else {
        row.querySelector(".grade-4-display").innerText = "-";
        row.querySelector(".grade-10-display").innerText = "-";
      }
    });

    const semGPA4 = semCredits > 0 ? (semPoints4 / semCredits) : 0;
    const semGPA10 = semCredits > 0 ? (semPoints10 / semCredits) : 0;

    semBlock.querySelector(".sem-credits").innerText = semCredits;
    semBlock.querySelector(".sem-gpa4").innerText = semGPA4.toFixed(2);
    semBlock.querySelector(".sem-gpa10").innerText = semGPA10.toFixed(2);
    semBlock.querySelector(".sem-rank").innerText = getRank(semGPA4, semCredits);

    grandTotalCredits += semCredits;
    grandTotalPoints4 += semPoints4;
    grandTotalPoints10 += semPoints10;

    chartLabels.push(semTitle.split(" (")[0]);
    chartDataGPA4.push(semGPA4.toFixed(2));
  });

  const cpa4 = grandTotalCredits > 0 ? (grandTotalPoints4 / grandTotalCredits) : 0;
  const cpa10 = grandTotalCredits > 0 ? (grandTotalPoints10 / grandTotalCredits) : 0;

  document.getElementById("totalCreditsAll").innerText = grandTotalCredits;
  document.getElementById("totalSemestersCount").innerText = semBlocks.length;
  document.getElementById("totalCPA4").innerText = cpa4.toFixed(2);
  document.getElementById("totalCPA10").innerText = cpa10.toFixed(2);
  document.getElementById("cpaRank").innerText = getRank(cpa4, grandTotalCredits);

  updateGPAChart(chartLabels, chartDataGPA4);
  updateGradeDistributionChart(gradeCounts);

  calculateGoal();
  generateSmartInsights(lowGradeCourses, grandTotalCredits, grandTotalPoints4, cpa4);
}

// ----- 1. BIỂU ĐỒ ĐƯỜNG (XU HƯỚNG GPA) -----
function updateGPAChart(labels, dataGPA4) {
  const ctx = document.getElementById('gpaChart');
  if (!ctx) return;

  const isDark = document.documentElement.classList.contains('dark');
  const lineColor = isDark ? '#818cf8' : '#4f46e5';
  const gridColor = isDark ? '#334155' : '#f1f5f9';

  if (gpaChartInstance) {
    gpaChartInstance.data.labels = labels;
    gpaChartInstance.data.datasets[0].data = dataGPA4;
    gpaChartInstance.data.datasets[0].borderColor = lineColor;
    gpaChartInstance.options.scales.y.grid.color = gridColor;
    gpaChartInstance.update('active');
  } else {
    gpaChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'GPA Học kỳ (Hệ 4)',
          data: dataGPA4,
          borderColor: lineColor,
          backgroundColor: 'rgba(79, 70, 229, 0.12)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: lineColor,
          pointBorderColor: '#ffffff',
          pointRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        scales: {
          y: { min: 0, max: 4.0, ticks: { stepSize: 0.5 }, grid: { color: gridColor } }
        }
      }
    });
  }
}

// ----- 2. BIỂU ĐỒ TRÒN (PHÂN BỔ ĐIỂM CHỮ DOUGHNUT) -----
function updateGradeDistributionChart(gradeCounts) {
  const ctx = document.getElementById('gradeDistributionChart');
  if (!ctx) return;

  const labels = Object.keys(gradeCounts);
  const data = Object.values(gradeCounts);

  const colorMap = {
    "A+": "#10b981", "A": "#059669",
    "B+": "#6366f1", "B": "#4f46e5",
    "C+": "#f59e0b", "C": "#d97706",
    "D+": "#f97316", "D": "#ea580c",
    "F":  "#ef4444"
  };

  const bgColors = labels.map(g => colorMap[g] || "#8b5cf6");

  if (gradeDistChartInstance) {
    gradeDistChartInstance.data.labels = labels;
    gradeDistChartInstance.data.datasets[0].data = data;
    gradeDistChartInstance.data.datasets[0].backgroundColor = bgColors;
    gradeDistChartInstance.update('active');
  } else {
    gradeDistChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              font: { size: 11, weight: 'bold' },
              color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#475569'
            }
          }
        },
        cutout: '65%'
      }
    });
  }
}

// ----- TÍNH ĐIỂM MỤC TIÊU -----
function calculateGoal() {
  const targetCPAEl = document.getElementById("targetCPA");
  const totalProgramCreditsEl = document.getElementById("totalProgramCredits");
  const goalResult = document.getElementById("neededGPA");

  if (!targetCPAEl || !totalProgramCreditsEl || !goalResult) return;

  // Chuẩn hóa dấu phẩy thành dấu chấm trước khi ép kiểu Float
  const rawTargetCPA = targetCPAEl.value.toString().replace(',', '.').trim();
  const targetCPA = parseFloat(rawTargetCPA) || 3.2;

  const rawTotalCredits = totalProgramCreditsEl.value.toString().replace(',', '.').trim();
  const totalProgramCredits = parseFloat(rawTotalCredits) || 130;

  const currentCredits = parseFloat(document.getElementById("totalCreditsAll").innerText.replace(',', '.')) || 0;
  const currentCPA4 = parseFloat(document.getElementById("totalCPA4").innerText.replace(',', '.')) || 0;

  const remainingCredits = totalProgramCredits - currentCredits;

  // 1. Chưa có môn học nào
  if (currentCredits === 0) {
    goalResult.innerText = `Cần đạt trung bình ${targetCPA.toFixed(2)} GPA / kỳ (${totalProgramCredits} TC toàn khóa)`;
    goalResult.className = "text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300";
    return;
  }

  // 2. ĐÃ HỌC ĐỦ HOẶC VƯỢT TÍN CHỈ (remainingCredits <= 0)
  if (remainingCredits <= 0) {
    // Làm tròn 2 chữ số thập phân để so sánh chuẩn xác
    const roundedCurrentCPA = Math.round(currentCPA4 * 100) / 100;
    const roundedTargetCPA = Math.round(targetCPA * 100) / 100;

    if (roundedCurrentCPA >= roundedTargetCPA) {
      goalResult.innerHTML = `🎉 <strong>Chúc mừng!</strong> Bạn đã tích lũy ${currentCredits}/${totalProgramCredits} TC và <strong>ĐẠT mục tiêu</strong> (CPA: <span class="text-emerald-600 font-bold">${currentCPA4.toFixed(2)}</span> / ${targetCPA.toFixed(2)}).`;
      goalResult.className = "text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 leading-relaxed";
    } else {
      const diff = (targetCPA - currentCPA4).toFixed(2);
      goalResult.innerHTML = `⚠️ <strong>CHƯA ĐẠT MỤC TIÊU:</strong> Đã học đủ ${currentCredits} TC nhưng CPA đạt <strong>${currentCPA4.toFixed(2)}</strong> / ${targetCPA.toFixed(2)} (còn thiếu <strong>${diff}</strong> điểm). Hãy học cải thiện các môn điểm thấp để kéo CPA!`;
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
    goalResult.innerHTML = `❌ Cần <strong>${neededGPA.toFixed(2)} GPA</strong> cho ${remainingCredits} TC còn lại.<br><span class="text-[11px] font-normal opacity-90">(Mục tiêu không khả thi nếu chỉ học môn mới. Cần học cải thiện thêm các môn cũ).</span>`;
    goalResult.className = "text-xs font-semibold text-red-500 leading-relaxed";
  } else if (neededGPA <= 0) {
    goalResult.innerHTML = `🎉 CPA hiện tại (<strong>${currentCPA4.toFixed(2)}</strong>) đã chắc chắn vượt mục tiêu ${targetCPA.toFixed(2)}!`;
    goalResult.className = "text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 leading-relaxed";
  } else {
    goalResult.innerHTML = `Cần đạt trung bình: <strong class="text-indigo-600 dark:text-indigo-400 text-sm sm:text-base">${neededGPA.toFixed(2)} GPA</strong> / kỳ (${remainingCredits} TC còn lại)`;
    goalResult.className = "text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed";
  }
}

// ----- CHẨN ĐOÁN & GỢI Ý HỌC CẢI THIỆN -----
function generateSmartInsights(lowGradeCourses, totalCredits, totalPoints, currentCPA) {
  const container = document.getElementById("insightsContainer");
  if (!container) return;

  if (lowGradeCourses.length === 0 || totalCredits === 0) {
    container.innerHTML = `<p class="text-slate-400 italic">Bảng điểm chưa có môn F/D/C cần cải thiện. Kết quả học tập tốt!</p>`;
    return;
  }

  const targetGrade4 = 3.5;
  const suggestions = lowGradeCourses.map(course => {
    const gainPoints = (targetGrade4 - course.currentGrade4) * course.credit;
    const newCPA = (totalPoints + gainPoints) / totalCredits;
    const cpaBoost = newCPA - currentCPA;
    return { ...course, cpaBoost };
  }).sort((a, b) => b.cpaBoost - a.cpaBoost);

  let html = "";
  suggestions.slice(0, 3).forEach((s) => {
    html += `
      <div class="p-2 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
        📌 <strong>${s.name}</strong> (${s.credit} TC, điểm ${s.currentGrade}): Học lại lên <strong>B+</strong> → CPA toàn khóa tăng <strong class="text-emerald-600">+${s.cpaBoost.toFixed(2)}</strong> điểm.
      </div>
    `;
  });

  container.innerHTML = html;
}

function getRank(gpa4, credits) {
  if (credits === 0) return "Chưa xác định";
  if (gpa4 >= 3.6) return "Xuất sắc";
  if (gpa4 >= 3.2) return "Giỏi";
  if (gpa4 >= 2.5) return "Khá";
  if (gpa4 >= 2.0) return "Trung bình";
  return "Yếu / Kém";
}

function saveData() {
  if (isLoadingData) return;
  const programYears = document.getElementById("programYears")?.value || "4.5";
  const gradeScale = document.getElementById("gradeScale")?.value || "standard_a";
  const targetCPA = document.getElementById("targetCPA")?.value || "3.20";
  const totalProgramCredits = document.getElementById("totalProgramCredits")?.value || "157";

  const semestersData = [];
  document.querySelectorAll(".semester-card").forEach(semBlock => {
    const title = semBlock.querySelector(".sem-title-select")?.value || "Học kỳ";
    const courses = [];

    semBlock.querySelectorAll(".course-tbody tr").forEach(row => {
      courses.push({
        name: row.querySelector(".subject-name")?.value || "",
        credit: parseFloat(row.querySelector(".credit-input")?.value) || 0,
        grade: row.querySelector(".grade-select")?.value || "",
        improveGrade: row.querySelector(".improve-grade-select")?.value || "",
        excludeGPA: row.querySelector(".exclude-checkbox")?.checked || false
      });
    });

    semestersData.push({ title, courses });
  });

  const appData = { programYears, gradeScale, targetCPA, totalProgramCredits, customGradeMapValues, semestersData };

  // Luôn lưu bản offline vào LocalStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));

  // Đồng bộ lên Cloud nếu đang đăng nhập
  if (currentUser && db) {
    db.collection("users").doc(currentUser.uid).set(appData, { merge: true }).catch(err => console.error("Lỗi đồng bộ Cloud:", err));
  }
}

function loadData(externalData = null) {
  isLoadingData = true;
  
  // Quét qua tất cả các key lưu trữ cũ để lấy lại điểm đã nhập
  let raw = externalData ? JSON.stringify(externalData) : null;
  if (!raw) {
    raw = localStorage.getItem("GPA_CPA_GROUPED_DATA_V9") || 
          localStorage.getItem("GPALAB_DATA") || 
          localStorage.getItem("GPALAB_DATA_V1");
  }

  const container = document.getElementById("semesterContainer");
  if (!container) { isLoadingData = false; return; }
  container.innerHTML = "";

  if (raw) {
    try {
      const appData = typeof raw === "string" ? JSON.parse(raw) : raw;

      if (appData.programYears && document.getElementById("programYears")) {
        document.getElementById("programYears").value = appData.programYears;
      }
      if (appData.gradeScale && document.getElementById("gradeScale")) {
        document.getElementById("gradeScale").value = appData.gradeScale;
        toggleCustomGradePanel();
      }
      if (appData.targetCPA && document.getElementById("targetCPA")) {
        document.getElementById("targetCPA").value = appData.targetCPA;
      }
      if (appData.totalProgramCredits && document.getElementById("totalProgramCredits")) {
        document.getElementById("totalProgramCredits").value = appData.totalProgramCredits;
      }
      if (appData.customGradeMapValues) {
        customGradeMapValues = appData.customGradeMapValues;
      }

      // Xử lý cả 2 kiểu cấu trúc dữ liệu cũ (semesters hoặc semestersData)
      const semList = appData.semestersData || appData.semesters || [];

      if (semList.length > 0) {
        const cleanSemesters = semList.slice(0, 9); // Giữ đúng 9 kỳ không bị nhân đôi
        cleanSemesters.forEach(sem => {
          const title = sem.title || sem.name || "Học kỳ";
          const courses = sem.courses || (sem.subjects ? sem.subjects.map(s => ({
            name: s.name,
            credit: s.credits,
            grade: s.grade1,
            improveGrade: s.grade2,
            excludeGPA: s.isExcluded
          })) : []);

          addSemesterBlock(title, courses);
        });
      } else {
        addSemesterBlock();
      }
    } catch (e) {
      console.error("Lỗi nạp dữ liệu cũ:", e);
      addSemesterBlock();
    }
  } else {
    addSemesterBlock();
  }

  calculate();
  isLoadingData = false;
}

function renderLoadedData(appData) {
  if (appData.programYears) document.getElementById("programYears").value = appData.programYears;
  if (appData.gradeScale) {
    document.getElementById("gradeScale").value = appData.gradeScale;
    toggleCustomGradePanel();
  }
  if (appData.targetCPA) document.getElementById("targetCPA").value = appData.targetCPA;
  if (appData.totalProgramCredits) document.getElementById("totalProgramCredits").value = appData.totalProgramCredits;
  if (appData.customGradeMapValues) {
    customGradeMapValues = appData.customGradeMapValues;
    Object.keys(customGradeMapValues).forEach(k => {
      const elId = k === "A+" ? "cust_Aplus" : `cust_${k.replace('+', 'plus')}`;
      const el = document.getElementById(elId);
      if (el) el.value = customGradeMapValues[k];
    });
  }

  if (appData.semestersData && appData.semestersData.length > 0) {
    appData.semestersData.forEach(sem => addSemesterBlock(sem.title, sem.courses));
  } else {
    addSemesterBlock();
  }
}

function clearData() {
  if (confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?")) {
    if (currentUser) db.collection("users").doc(currentUser.uid).delete();
    else localStorage.removeItem(STORAGE_KEY);
    document.getElementById("semesterContainer").innerHTML = "";
    addSemesterBlock();
    addSemesterBlock();
  }
}

// ===== TRACY AI MENTOR LOGIC =====
function toggleTracyChat() {
  const box = document.getElementById("tracyChatBox");
  box.classList.toggle("hidden");
}

function sendTracyMessage() {
  const input = document.getElementById("tracyInput");
  const msg = input.value.trim();
  if (!msg) return;

  const messagesDiv = document.getElementById("tracyMessages");

  const userBubble = document.createElement("div");
  userBubble.className = "bg-indigo-600 text-white p-3 rounded-2xl max-w-[85%] ml-auto leading-relaxed shadow-sm";
  userBubble.innerText = msg;
  messagesDiv.appendChild(userBubble);

  input.value = "";
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  const typingBubble = document.createElement("div");
  typingBubble.className = "bg-slate-100 dark:bg-slate-900 text-slate-400 p-2.5 rounded-2xl max-w-[80%] italic";
  typingBubble.innerText = "Tracy đang phân tích dữ liệu...";
  messagesDiv.appendChild(typingBubble);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  setTimeout(() => {
    typingBubble.remove();
    const reply = generateTracyResponse(msg);
    const tracyBubble = document.createElement("div");
    tracyBubble.className = "bg-indigo-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 p-3 rounded-2xl max-w-[88%] leading-relaxed border border-indigo-100 dark:border-slate-700 shadow-sm";
    tracyBubble.innerHTML = reply;
    messagesDiv.appendChild(tracyBubble);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, 1000);
}

function generateTracyResponse(userQuery) {
  const credits = document.getElementById("totalCreditsAll").innerText;
  const cpa4 = document.getElementById("totalCPA4").innerText;
  const rank = document.getElementById("cpaRank").innerText;
  const neededGPA = document.getElementById("neededGPA").innerText;
  const queryLower = userQuery.toLowerCase();

  if (queryLower.includes("cải thiện") || queryLower.includes("kéo điểm") || queryLower.includes("điểm thấp")) {
    const insights = document.getElementById("insightsContainer").innerText;
    return `Dựa vào bảng điểm của bạn:<br><br>${insights.includes("chưa có môn") ? "Hiện bạn chưa có môn điểm F/D nào cần học lại gấp. Hãy duy trì điểm số tốt này nhé!" : insights}`;
  }

  if (queryLower.includes("mục tiêu") || queryLower.includes("bằng") || queryLower.includes("còn lại")) {
    return `Hiện bạn đang có <strong>${credits} Tín chỉ</strong> với CPA <strong>${cpa4} (${rank})</strong>.<br><br>Để đạt mục tiêu đề ra, bạn cần đạt trung bình <strong>${neededGPA}</strong> cho các học kỳ còn lại!`;
  }

  if (queryLower.includes("chào") || queryLower.includes("hi") || queryLower.includes("xin chào")) {
    return `Chào bạn! Tracy rất vui được đồng hành cùng bạn. Bạn muốn Tracy phân tích kết quả học tập hay tư vấn lộ trình nào?`;
  }

  return `CPA hiện tại của bạn là <strong>${cpa4}</strong> (${rank}) với tổng <strong>${credits} Tín chỉ</strong>.<br><br>Tracy khuyên bạn nên tập trung cải thiện các môn 3-4 tín chỉ có điểm dưới B để kéo CPA lên nhanh nhất!`;
}

window.onload = function() {
  loadData();
};