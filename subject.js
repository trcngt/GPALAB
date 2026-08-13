const SCORE_OPTIONS = [
  "Điểm Chuyên Cần",
  "Điểm Bài Tập",
  "Điểm Bài Tập Lớn / BTL",
  "Điểm Thực Hành / Thí Nghiệm",
  "Điểm Đánh Giá Thường Xuyên",
  "Điểm Thảo Luận / Thuyết Trình",
  "Điểm Giữa Kỳ / Thi Giữa Kỳ",
  "Điểm Thi Cuối Kỳ",
  "Tùy chỉnh tên khác..."
];

const GRADE_THRESHOLDS = {
  "A": 8.5,
  "B+": 8.0,
  "B": 7.0,
  "C+": 6.5,
  "C": 5.5,
  "D+": 5.0,
  "D": 4.0
};

const GPA_STORAGE_KEY = "GPA_CPA_GROUPED_DATA_V9";

// ----- TOGGLE DARK MODE -----
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
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.getElementById('themeIcon').innerText = '☀️';
  }
}

// ----- TỰ ĐỘNG TẠO OPTION DANH SÁCH HỌC KỲ ĐỂ ĐỒNG BỘ GPA -----
function generateSemesterOptionsForSync() {
  const select = document.getElementById("exportToSemesterSelect");
  if (!select) return;

  const years = 4;
  const list = [];
  let mainSemCount = 1;

  for (let y = 1; y <= years; y++) {
    list.push(`Học kỳ ${mainSemCount} (Kỳ 1 - Năm ${y})`);
    mainSemCount++;
    list.push(`Học kỳ ${mainSemCount} (Kỳ 2 - Năm ${y})`);
    mainSemCount++;
    list.push(`Học kỳ Phụ (Hè Năm ${y})`);
  }

  select.innerHTML = list.map(sem => `<option value="${sem}">${sem}</option>`).join('');
}

// ----- HÀM ĐẨY MÔN HỌC TRỰC TIẾP SANG BẢNG GPA TỔNG QUAN (INDEX.HTML) -----
function pushToGPATable() {
  const name = document.getElementById("subjectName").value.trim() || "Môn học mới";
  const credit = parseFloat(document.getElementById("subjectCredit").value) || 3;
  const letter = document.getElementById("gradeLetter").innerText;
  const targetSemTitle = document.getElementById("exportToSemesterSelect").value;

  if (!letter || (letter === "F" && document.getElementById("score10").innerText === "0.0")) {
    if (!confirm("Điểm chữ hiện tại đang là F (0.0). Bạn vẫn muốn lưu môn này vào GPA chứ?")) {
      return;
    }
  }

  let appData = {};
  const saved = localStorage.getItem(GPA_STORAGE_KEY);
  if (saved) {
    try { appData = JSON.parse(saved); } catch (e) { appData = {}; }
  }

  if (!appData.semestersData) {
    appData.semestersData = [];
  }

  let semObj = appData.semestersData.find(s => s.title === targetSemTitle);

  const newCourse = {
    name: name,
    credit: credit.toString(),
    grade: letter,
    improveGrade: "",
    excludeGPA: false
  };

  if (semObj) {
    semObj.courses.push(newCourse);
  } else {
    appData.semestersData.push({
      title: targetSemTitle,
      courses: [newCourse]
    });
  }

  localStorage.setItem(GPA_STORAGE_KEY, JSON.stringify(appData));
  alert(`🎉 Đã lưu môn "${name}" (${credit} TC, Điểm ${letter}) vào "${targetSemTitle}" ở trang GPA Tổng Quan thành công!`);
}

// ----- HÀM XỬ LÝ NHIỀU ĐẦU ĐIỂM (VD: 8.5, 9 -> CHIA TRUNG BÌNH) -----
function parseScoreInput(inputStr) {
  if (!inputStr) return { avg: NaN, count: 0 };
  
  const parts = inputStr.toString().replace(/\+/g, ' ').split(/[\s,]+/);
  const numbers = parts.map(p => parseFloat(p)).filter(n => !isNaN(n) && n >= 0 && n <= 10);
  
  if (numbers.length === 0) return { avg: NaN, count: 0 };
  
  const sum = numbers.reduce((a, b) => a + b, 0);
  return {
    avg: sum / numbers.length,
    count: numbers.length
  };
}

// ----- TẠO CỘT ĐIỂM THÀNH PHẦN -----
function addScoreRow(selectedName = "Điểm Giữa Kỳ / Thi Giữa Kỳ", score = "", weight = "") {
  const container = document.getElementById("scoreRowsContainer");
  const row = document.createElement("div");
  row.className = "score-row p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex flex-col sm:flex-row items-center gap-3 border border-slate-200 dark:border-slate-700/50";

  let optionsHTML = SCORE_OPTIONS.map(opt => {
    const isSelected = opt === selectedName ? 'selected' : '';
    return `<option value="${opt}" ${isSelected}>${opt}</option>`;
  }).join('');

  row.innerHTML = `
    <div class="flex-1 w-full flex flex-col gap-1">
      <select class="row-select border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-xs outline-none font-medium text-slate-700 dark:text-slate-200" onchange="handleOptionChange(this)">
        ${optionsHTML}
      </select>
      <input type="text" placeholder="Nhập tên cột điểm của bạn..." class="custom-name-input hidden w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-xs outline-none">
    </div>

    <div class="flex flex-col w-full sm:w-72 gap-1">
      <div class="flex gap-2">
        <input type="text" placeholder="Điểm" value="${score}" class="row-score w-1/2 border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-xs outline-none" oninput="calculateSubject()">
        
        <div class="relative w-1/2">
          <input type="number" placeholder="Trọng số" min="0" max="100" value="${weight}" class="row-weight w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 pr-7 text-xs outline-none text-right" oninput="calculateSubject()">
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
        </div>
      </div>
      <span class="sub-score-hint text-[10px] text-indigo-500 font-medium pl-1 hidden"></span>
    </div>

    <button onclick="removeScoreRow(this)" class="text-red-500 hover:text-red-700 font-bold px-2 py-1 text-xs">✕</button>
  `;

  container.appendChild(row);
  calculateSubject();
}

function handleOptionChange(selectElement) {
  const customInput = selectElement.nextElementSibling;
  if (selectElement.value === "Tùy chỉnh tên khác...") {
    customInput.classList.remove("hidden");
  } else {
    customInput.classList.add("hidden");
  }
  calculateSubject();
}

function removeScoreRow(btn) {
  btn.closest(".score-row").remove();
  calculateSubject();
}

// ----- 1. TÍNH ĐIỂM TỔNG KẾT MÔN -----
function calculateSubject() {
  const rows = document.querySelectorAll(".score-row");
  let totalWeightedScore = 0;
  let totalWeight = 0;

  rows.forEach(row => {
    const rawScoreStr = row.querySelector(".row-score").value;
    const weight = parseFloat(row.querySelector(".row-weight").value);
    const hint = row.querySelector(".sub-score-hint");

    const parsed = parseScoreInput(rawScoreStr);

    if (parsed.count > 1) {
      hint.innerText = `➔ TB ${parsed.count} đầu điểm: ${parsed.avg.toFixed(2)}`;
      hint.classList.remove("hidden");
    } else {
      hint.classList.add("hidden");
    }

    if (!isNaN(parsed.avg) && !isNaN(weight) && weight > 0) {
      totalWeightedScore += parsed.avg * weight;
      totalWeight += weight;
    }
  });

  const totalWeightDisplay = document.getElementById("totalWeight");
  totalWeightDisplay.innerText = totalWeight + "%";

  if (totalWeight === 100) {
    totalWeightDisplay.className = "text-xl font-bold text-white";
  } else {
    totalWeightDisplay.className = "text-xl font-bold text-yellow-300";
  }

  if (totalWeight === 0) {
    document.getElementById("score10").innerText = "0.0";
    document.getElementById("score4").innerText = "0.0";
    document.getElementById("gradeLetter").innerText = "F";
    calculateRequiredFinalScore();
    return;
  }

  const finalScore10 = totalWeightedScore / totalWeight;
  let finalScore4 = 0;
  let letter = "F";

  if (finalScore10 >= 8.5) { letter = "A"; finalScore4 = 4.0; }
  else if (finalScore10 >= 8.0) { letter = "B+"; finalScore4 = 3.5; }
  else if (finalScore10 >= 7.0) { letter = "B"; finalScore4 = 3.0; }
  else if (finalScore10 >= 6.5) { letter = "C+"; finalScore4 = 2.5; }
  else if (finalScore10 >= 5.5) { letter = "C"; finalScore4 = 2.0; }
  else if (finalScore10 >= 5.0) { letter = "D+"; finalScore4 = 1.5; }
  else if (finalScore10 >= 4.0) { letter = "D"; finalScore4 = 1.0; }
  else { letter = "F"; finalScore4 = 0.0; }

  document.getElementById("score10").innerText = finalScore10.toFixed(2);
  document.getElementById("score4").innerText = finalScore4.toFixed(1);
  document.getElementById("gradeLetter").innerText = letter;

  calculateRequiredFinalScore();
}

// ----- 2. HÀM TÍNH ĐIỂM THI CUỐI KỲ CẦN ĐẠT -----
function calculateRequiredFinalScore() {
  const targetLetter = document.getElementById("targetGradeLetter").value;
  const targetScore10 = GRADE_THRESHOLDS[targetLetter] || 8.0;
  const finalExamWeight = parseFloat(document.getElementById("finalExamWeight").value) || 70;

  const rows = document.querySelectorAll(".score-row");
  let processWeightedScore = 0;
  let processWeight = 0;

  rows.forEach(row => {
    const selectName = row.querySelector(".row-select").value;
    const rawScoreStr = row.querySelector(".row-score").value;
    const weight = parseFloat(row.querySelector(".row-weight").value);

    const parsed = parseScoreInput(rawScoreStr);

    if (selectName !== "Điểm Thi Cuối Kỳ" && !isNaN(parsed.avg) && !isNaN(weight) && weight > 0) {
      processWeightedScore += parsed.avg * weight;
      processWeight += weight;
    }
  });

  const badge = document.getElementById("requiredScoreBadge");
  const detailText = document.getElementById("passGradeDetailText");

  if (processWeight === 0) {
    badge.innerText = "Chưa nhập điểm quá trình";
    badge.className = "text-sm font-bold text-amber-500";
    detailText.innerText = "Hãy nhập điểm và trọng số các bài kiểm tra quá trình ở bảng phía trên.";
    return;
  }

  const currentPoints = processWeightedScore;
  const neededTotalPoints = targetScore10 * 100;
  const pointsLeft = neededTotalPoints - currentPoints;

  const requiredScore = pointsLeft / finalExamWeight;

  if (requiredScore > 10.0) {
    badge.innerText = `${requiredScore.toFixed(1)} điểm (Bất khả thi)`;
    badge.className = "text-xl font-bold text-red-500";
    detailText.innerText = `Dù đạt 10.0 điểm Cuối kỳ, điểm tổng kết tối đa bạn có thể đạt là ${((currentPoints + 10 * finalExamWeight)/100).toFixed(1)} điểm.`;
  } else if (requiredScore <= 0) {
    badge.innerText = "Đã chắc chắn đạt!";
    badge.className = "text-xl font-bold text-emerald-500";
    detailText.innerText = `Điểm quá trình của bạn đã đủ để đạt điểm ${targetLetter} mà không phụ thuộc điểm thi Cuối kỳ!`;
  } else {
    badge.innerText = `${requiredScore.toFixed(1)} / 10 điểm`;
    badge.className = "text-2xl font-extrabold text-indigo-600 dark:text-indigo-400";
    detailText.innerText = `Cần đạt tối thiểu ${requiredScore.toFixed(1)} điểm bài thi Cuối kỳ (${finalExamWeight}%) để tổng kết môn đạt điểm ${targetLetter}.`;
  }
}

window.onload = function() {
  initTheme();
  generateSemesterOptionsForSync();
  addScoreRow("Điểm Giữa Kỳ / Thi Giữa Kỳ", "", "30");
  addScoreRow("Điểm Thi Cuối Kỳ", "", "70");
};