// PDF Export functionality for pay calculations
// Uses jsPDF and jsPDF AutoTable libraries

async function exportToPDF() {
  if (typeof filteredData === "undefined" || filteredData.length === 0) {
    alert("Aucune donnée à exporter. Veuillez d'abord calculer la paie.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const year = filterYearSelect.value;
  const month = filterMonthSelect.value || "Tous";
  const week = filterWeekSelect.value || "Tous";

  // Get month name in French
  const monthNames = {
    "": "Tous les mois",
    "01": "Janvier",
    "02": "Février",
    "03": "Mars",
    "04": "Avril",
    "05": "Mai",
    "06": "Juin",
    "07": "Juillet",
    "08": "Août",
    "09": "Septembre",
    10: "Octobre",
    11: "Novembre",
    12: "Décembre",
  };

  const monthName = monthNames[month] || month;

  // Calculate totals
  const totalEmployees = filteredData.length;
  const totalHours = filteredData.reduce(
    (sum, emp) => sum + parseFloat(emp.totalHours),
    0
  );
  const totalPay = filteredData.reduce(
    (sum, emp) => sum + parseFloat(emp.totalPay),
    0
  );
  const avgPay = totalEmployees > 0 ? totalPay / totalEmployees : 0;

  // Set up PDF styles
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  let yPosition = margin;

  // Title
  pdf.setFontSize(16);
  pdf.setTextColor(40, 40, 40);
  pdf.text("RAPPORT DE PAIE", margin, yPosition);

  yPosition += 6;

  // Company info
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Fierbout", margin, yPosition);
  yPosition += 4;

  // Period info
  pdf.setFontSize(8);
  pdf.text(
    `Période: ${monthName} ${year}${
      week && week !== "" ? ` | Semaine: ${week}` : ""
    }`,
    margin,
    yPosition
  );
  yPosition += 6;

  // Summary cards section (compact)
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 24);

  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 80);

  const boxWidth = (pageWidth - 2 * margin) / 4;
  const summaryData = [
    {
      label: "Total d'employés.",
      value: totalEmployees.toFixed(0),
      isCurrency: false,
    },
    {
      label: "Total d'heures",
      value: totalHours.toFixed(2),
      isCurrency: false,
    },
    { label: "Total de la paie", value: totalPay.toFixed(0), isCurrency: true },
    { label: "Moy/emp", value: avgPay.toFixed(0), isCurrency: true },
  ];

  summaryData.forEach((item, index) => {
    const xPos = margin + index * boxWidth + 3;
    pdf.text(item.label, xPos, yPosition + 6);
    pdf.setFontSize(9);
    pdf.setTextColor(40, 40, 40);
    pdf.text(
      (item.isCurrency ? "HTG " : "") + item.value,
      xPos,
      yPosition + 13
    );
    pdf.setFontSize(7);
    pdf.setTextColor(80, 80, 80);
  });

  yPosition += 28;

  // Employee table
  pdf.setFontSize(9);
  pdf.setTextColor(40, 40, 40);
  pdf.text("Détails des salaires", margin, yPosition);
  yPosition += 5;

  // Prepare table data
  const tableData = filteredData.map((emp) => {
    let payRate = "Non défini";
    if (emp.payType === "hourly") {
      payRate = `HTG ${emp.payAmount.toFixed(2)}/h`;
    } else if (emp.payType === "weekly") {
      payRate = `HTG ${emp.payAmount.toFixed(2)}/sem`;
    } else if (emp.payType === "monthly") {
      payRate = `HTG ${emp.payAmount.toFixed(2)}/mois`;
    }

    return [
      emp.name,
      emp.id,
      payRate,
      emp.daysWorked.toString(),
      parseFloat(emp.totalHours).toFixed(2),
      `HTG ${parseFloat(emp.totalPay).toFixed(2)}`,
    ];
  });

  pdf.autoTable({
    startY: yPosition,
    head: [["Employé", "ID", "Paie/u", "J", "H", "Total"]],
    body: tableData,
    margin: { left: margin, right: margin, bottom: 15 },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [40, 40, 40],
      lineColor: [200, 200, 200],
    },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    didDrawPage: function (data) {
      // Footer
      const pageCount = pdf.internal.pages.length - 1;
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      const today = new Date().toLocaleDateString("fr-FR");
      pdf.text(
        `Page ${data.pageNumber}/${pageCount} | Généré le: ${today}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      );
    },
  });

  // Download
  const filename = `Rapport-Paie_${year}-${month}_${new Date().getTime()}.pdf`;
  pdf.save(filename);
}
