// Global variables
let allEmployees = [];
let filteredData = [];
let currentSort = null;

// Performance optimization: debounce helper function
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// DOM elements
const filterYearSelect = document.getElementById("filter-year");
const filterMonthSelect = document.getElementById("filter-month");
const filterWeekSelect = document.getElementById("filter-week");
const calculateBtn = document.querySelector(".calculate-btn");
const exportCsvBtn = document.querySelector(".export-csv-btn");
const backButton = document.querySelector(".back-button");
const summarySection = document.querySelector(".summary-section");
const employeesSection = document.querySelector(".employees-section");
const employeesTbody = document.getElementById("employees-tbody");
const searchEmployee = document.getElementById("search-employee");
const sortBtns = document.querySelectorAll(".sort-btn");
const modal = document.getElementById("employee-detail-modal");
const closeBtn = document.querySelector(".close-btn");
const closeModalBtn = document.querySelector(".close-modal-btn");
const printBtn = document.querySelector(".print-btn");

// Load employees from backend
async function loadEmployees() {
  try {
    const res = await fetch("/employees");
    allEmployees = await res.json();
    console.log("Employés chargés:", allEmployees);
  } catch (err) {
    console.error("Échec du chargement des employés:", err);
    alert("Échec du chargement des données des employés");
  }
}

// Calculate hours worked between two times
function calculateHours(entrerTime, sortiTime) {
  if (!entrerTime || !sortiTime) return 0;

  const timeToMinutes = (timeStr) => {
    const parts = timeStr.match(/(\d+):(\d+)\s(AM|PM)/i);
    if (!parts) return 0;
    let hours = parseInt(parts[1]);
    const minutes = parseInt(parts[2]);
    const period = parts[3].toUpperCase();
    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours !== 12) hours += 12;
    return hours * 60 + minutes;
  };

  const entrerMinutes = timeToMinutes(entrerTime);
  const sortiMinutes = timeToMinutes(sortiTime);
  const diffMinutes = sortiMinutes - entrerMinutes;

  return Math.max(0, diffMinutes / 60);
}

// Get week number from date string (DD/MM/YYYY)
function getWeekNumber(dateStr) {
  const [day, month, year] = dateStr.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Calculate pay for employees based on filters
function calculatePay() {
  const year = filterYearSelect.value;
  const month = filterMonthSelect.value;
  const week = filterWeekSelect.value;

  filteredData = [];

  allEmployees.forEach((employee) => {
    // Include all employees, even those without pay rates (they'll show 0 pay)
    // But skip if they have no payType and payAmount set
    if (!employee.payType || !employee.payAmount) {
      // Still include but with 0 pay and show hours worked
      // Actually skip these for now - only include employees with pay information
      return;
    }

    let totalHours = 0;
    let daysWorked = 0;
    const dayBreakdown = [];
    const uniqueDates = new Set(); // Track unique dates for accurate day count

    // Only process pointage if the employee has records
    const pointageRecords = employee.hdePointage || [];

    pointageRecords.forEach((record) => {
      // record.date is now DD/MM/YYYY
      const [recordDay, recordMonth, recordYear] = record.date.split("/");

      // Filter by year and month
      if (recordYear !== year) return;
      if (month && recordMonth !== month) return;

      // Filter by week if specified
      if (week) {
        const recordWeek = getWeekNumber(record.date);
        if (recordWeek !== parseInt(week)) return;
      }

      if (record.entrer && record.sorti) {
        const hours = calculateHours(record.entrer, record.sorti);
        totalHours += hours;

        // Count unique dates only
        uniqueDates.add(record.date);

        // Calculate daily pay based on pay type
        let dailyPay = 0;
        if (employee.payType === "hourly") {
          dailyPay = hours * employee.payAmount;
        } else if (employee.payType === "weekly") {
          // For weekly pay, divide by 5 (work days per week) to show daily breakdown
          dailyPay = employee.payAmount / 5;
        } else if (employee.payType === "monthly") {
          // For monthly pay, divide by 22 (work days per month) to show daily breakdown
          dailyPay = employee.payAmount / 22;
        }

        dayBreakdown.push({
          date: record.date,
          entrer: record.entrer,
          sorti: record.sorti,
          hours: hours.toFixed(2),
          dailyPay: dailyPay.toFixed(2),
        });
      }
    });

    // Set daysWorked based on unique dates
    daysWorked = uniqueDates.size;

    // For hourly workers, they need hours worked to calculate pay
    // For weekly/monthly workers, they get paid regardless of hours tracked
    const isHourly = employee.payType === "hourly";
    const hasWorkedHours = daysWorked > 0 || totalHours > 0;

    if (hasWorkedHours || !isHourly) {
      let totalPay = 0;
      if (employee.payType === "hourly") {
        totalPay = (totalHours * employee.payAmount).toFixed(2);
      } else if (employee.payType === "weekly") {
        // Weekly pay is fixed regardless of hours
        totalPay = employee.payAmount.toFixed(2);
      } else if (employee.payType === "monthly") {
        // Monthly pay is fixed regardless of hours
        totalPay = employee.payAmount.toFixed(2);
      }

      filteredData.push({
        ...employee,
        totalHours: totalHours.toFixed(2),
        daysWorked,
        totalPay,
        dayBreakdown,
      });
    }
  });

  // Show sections
  summarySection.classList.remove("hidden");
  employeesSection.classList.remove("hidden");

  // Populate UI
  updateSummary();
  populateTable();
}

// Update summary statistics
function updateSummary() {
  const totalEmployees = filteredData.length;
  const totalHours = filteredData
    .reduce((sum, emp) => sum + parseFloat(emp.totalHours), 0)
    .toFixed(2);
  const totalPay = filteredData
    .reduce((sum, emp) => sum + parseFloat(emp.totalPay), 0)
    .toFixed(2);
  const avgPay =
    totalEmployees > 0 ? (totalPay / totalEmployees).toFixed(2) : 0;

  document.getElementById("total-employees").textContent = totalEmployees;
  document.getElementById("total-hours").textContent = totalHours;
  document.getElementById("total-pay").textContent = `$${parseFloat(
    totalPay
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  document.getElementById("avg-pay").textContent = `$${parseFloat(
    avgPay
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Populate employees table
function populateTable(dataToDisplay = filteredData) {
  employeesTbody.innerHTML = "";

  dataToDisplay.forEach((emp) => {
    // Format pay display based on pay type
    let payDisplay = "N/A";
    if (emp.payType === "hourly") {
      payDisplay = `$${emp.payAmount.toFixed(2)}/h`;
    } else if (emp.payType === "weekly") {
      payDisplay = `$${emp.payAmount.toFixed(2)}/sem`;
    } else if (emp.payType === "monthly") {
      payDisplay = `$${emp.payAmount.toFixed(2)}/mois`;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="employee-name">${emp.name}</td>
      <td>${emp.id}</td>
      <td>${payDisplay}</td>
      <td>${emp.daysWorked}</td>
      <td>${emp.totalHours}h</td>
      <td><strong>$${parseFloat(emp.totalPay).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</strong></td>
      <td><button class="details-btn">Voir les détails</button></td>
    `;

    row.querySelector(".details-btn").addEventListener("click", () => {
      openEmployeeModal(emp);
    });

    employeesTbody.appendChild(row);
  });
}

// Open employee detail modal
function openEmployeeModal(emp) {
  // Format pay display based on pay type
  let payDisplay = "N/A";
  if (emp.payType === "hourly") {
    payDisplay = `$${emp.payAmount.toFixed(2)}/h`;
  } else if (emp.payType === "weekly") {
    payDisplay = `$${emp.payAmount.toFixed(2)}/sem`;
  } else if (emp.payType === "monthly") {
    payDisplay = `$${emp.payAmount.toFixed(2)}/mois`;
  }

  document.getElementById("modal-emp-name").textContent = emp.name;
  document.getElementById("modal-emp-role").textContent = emp.role;
  document.getElementById("modal-emp-id").textContent = `ID: ${emp.id}`;
  document.getElementById("modal-emp-image").src =
    emp.image || "imgs/default-avatar.png";
  document.getElementById("modal-pay-per-hour").textContent = payDisplay;
  document.getElementById(
    "modal-total-hours"
  ).textContent = `${emp.totalHours}h`;
  document.getElementById("modal-total-pay").textContent = `$${parseFloat(
    emp.totalPay
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  document.getElementById("modal-days-worked").textContent = emp.daysWorked;

  // Populate daily breakdown as a structured table
  const dailyBreakdownDiv = document.getElementById("modal-daily-breakdown");
  dailyBreakdownDiv.innerHTML = "";

  // Sort dates in descending order (newest first)
  const sortedDays = [...emp.dayBreakdown].sort((a, b) => {
    const [aDay, aMonth, aYear] = a.date.split("/").map(Number);
    const [bDay, bMonth, bYear] = b.date.split("/").map(Number);
    const dateA = new Date(aYear, aMonth - 1, aDay);
    const dateB = new Date(bYear, bMonth - 1, bDay);
    return dateB - dateA;
  });

  // Create structured table
  const table = document.createElement("table");
  table.className = "daily-breakdown-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Entrée</th>
        <th>Sortie</th>
        <th>Heures</th>
        <th>Paie</th>
      </tr>
    </thead>
    <tbody>
      ${sortedDays
        .map(
          (day) => `
        <tr>
          <td class="date-cell">${day.date}</td>
          <td class="time-cell">${day.entrer}</td>
          <td class="time-cell">${day.sorti}</td>
          <td class="hours-cell">${day.hours}h</td>
          <td class="pay-cell">$${parseFloat(day.dailyPay).toLocaleString(
            "en-US",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          )}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  `;
  dailyBreakdownDiv.appendChild(table);

  modal.classList.remove("hidden");
}

// Close modal
function closeModal() {
  modal.classList.add("hidden");
}

// Search employees
function searchEmployees() {
  const searchTerm = searchEmployee.value.toLowerCase();
  const filtered = filteredData.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm) || emp.id.includes(searchTerm)
  );
  populateTable(filtered);
}

// Sort employees
function sortEmployees(sortBy) {
  currentSort = sortBy;
  let sortedData = [...filteredData];

  sortBtns.forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  if (sortBy === "name") {
    sortedData.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "hours") {
    sortedData.sort(
      (a, b) => parseFloat(b.totalHours) - parseFloat(a.totalHours)
    );
  } else if (sortBy === "pay") {
    sortedData.sort((a, b) => parseFloat(b.totalPay) - parseFloat(a.totalPay));
  }

  populateTable(sortedData);
}

// Export to CSV
function exportToCSV() {
  if (filteredData.length === 0) {
    alert("Aucune donnée à exporter. Veuillez d'abord calculer la paie.");
    return;
  }

  const year = filterYearSelect.value;
  const month = filterMonthSelect.value || "Tous";
  const week = filterWeekSelect.value || "Tous";

  let csv = `Rapport de paie - Année: ${year}, Mois: ${month}, Semaine: ${week}\n\n`;
  csv += `Total employés,${filteredData.length}\n`;
  csv += `Total heures,${filteredData
    .reduce((sum, emp) => sum + parseFloat(emp.totalHours), 0)
    .toFixed(2)}\n`;
  csv += `Total paie,${filteredData
    .reduce((sum, emp) => sum + parseFloat(emp.totalPay), 0)
    .toFixed(2)}\n\n`;

  csv +=
    "Employé,ID,Type de paie,Taux de paie,Jours travaillés,Total heures,Total paie\n";
  filteredData.forEach((emp) => {
    let payDisplay = "N/A";
    if (emp.payType === "hourly") {
      payDisplay = `$${emp.payAmount.toFixed(2)}/h`;
    } else if (emp.payType === "weekly") {
      payDisplay = `$${emp.payAmount.toFixed(2)}/sem`;
    } else if (emp.payType === "monthly") {
      payDisplay = `$${emp.payAmount.toFixed(2)}/mois`;
    }
    csv += `"${emp.name}",${emp.id},${emp.payType || "Aucun"},${payDisplay},${
      emp.daysWorked
    },${emp.totalHours},${emp.totalPay}\n`;
  });

  // Add daily breakdown for each employee
  csv += "\n\nDétails quotidiens par employé\n";
  filteredData.forEach((emp) => {
    csv += `\n${emp.name} (${emp.id})\n`;
    csv += `Date,Entrée,Sortie,Heures,Paie quotidienne\n`;
    emp.dayBreakdown.forEach((day) => {
      csv += `${day.date},${day.entrer},${day.sorti},${day.hours},${day.dailyPay}\n`;
    });
  });

  // Download CSV
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
  );
  element.setAttribute("download", `rapport-paie-${year}-${month}.csv`);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// Print modal content
function printModal() {
  const printContent = document.querySelector(".modal-content").innerHTML;
  const printWindow = window.open("", "", "height=600,width=800");
  printWindow.document.write(`
    <html>
      <head>
        <title>Rapport de paie des employés</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .modal-header { background: #667eea; color: white; padding: 20px; border-radius: 8px; }
          .modal-body { padding: 20px; }
          .info-section { margin-bottom: 20px; }
          .daily-entry { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; }
        </style>
      </head>
      <body>${printContent}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Set default year to current year
function setDefaultYear() {
  const currentYear = new Date().getFullYear().toString();
  filterYearSelect.value = currentYear;
}

// Event listeners
calculateBtn.addEventListener("click", calculatePay);
exportCsvBtn.addEventListener("click", exportToCSV);
backButton.addEventListener("click", () => {
  window.location.href = "/admin-employees.html";
});
// Performance optimization: debounce search input
const debouncedSearch = debounce(searchEmployees, 300);
searchEmployee.addEventListener("input", debouncedSearch);
sortBtns.forEach((btn) => {
  btn.addEventListener("click", (e) => sortEmployees(e.target.dataset.sort));
});
closeBtn.addEventListener("click", closeModal);
closeModalBtn.addEventListener("click", closeModal);
printBtn.addEventListener("click", printModal);

// Modal backdrop click to close
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

// Initialize
loadEmployees();
setDefaultYear();

// Update cache when data-monitor notifies about changes
window.addEventListener("employees:updated", async (e) => {
  try {
    allEmployees = e.detail.employees || [];
    console.log("calculate-pay: employees updated", allEmployees.length);
    // If the page already has filtered data visible, recalculate
    if (filteredData && filteredData.length > 0) {
      calculatePay();
    }
  } catch (err) {
    console.error("Error handling employees:updated in calculate-pay.js", err);
  }
});
