// HTML-to-PDF using html2pdf.js
(function () {
  const btn = document.getElementById("download-guide-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const titleElement = document.querySelector(".main-title-container");
    const contentElement = document.getElementById("guide-content");
    if (!contentElement || !window.html2pdf) return;

    // Create a wrapper that includes both title and content
    const wrapper = document.createElement("div");
    if (titleElement) {
      wrapper.appendChild(titleElement.cloneNode(true));
    }
    wrapper.appendChild(contentElement.cloneNode(true));

    const filename = `Guide_Pointage_Fierbout_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    const opt = {
      margin: [8, 8, 8, 8],
      filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0, logging: false },
      pagebreak: {
        mode: ["css", "avoid-all"],
        avoid: [".section"],
        margin: [5, 5, 5, 5],
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true,
      },
    };

    window.html2pdf().from(wrapper).set(opt).save();
  });
})();
