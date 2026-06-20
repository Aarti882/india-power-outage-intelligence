import { jsPDF } from 'jspdf';

export const generateStateReportCard = (stateName, sevi, deficit, outages, recovery, requirement) => {
  const doc = new jsPDF('p', 'pt', 'a4');

  // Colors based on SEVI risk level
  let riskLevel = 'Low Risk';
  let riskColor = '#10b981'; // Green
  let insight = 'Low vulnerability ranking. Energy security is high, with excellent recovery performance and low supply deficits.';

  if (sevi >= 40) {
    riskLevel = 'High Risk';
    riskColor = '#ef4444'; // Red
    insight = 'High vulnerability driven by elevated deficit peaks and slow restoration rates. Immediate grid reinforcement, capacity enhancements, and localized storage deployment are highly recommended.';
  } else if (sevi >= 25) {
    riskLevel = 'Medium Risk';
    riskColor = '#f59e0b'; // Orange
    insight = 'Moderate outage risks. Grid stability is stable, but seasonal demand spikes (e.g. summer cooling load) could strain local distribution buffers. Monitor recovery times closely.';
  }

  // Draw Header Background Banner (Dark Navy #0a1128)
  doc.setFillColor(10, 17, 40);
  doc.rect(0, 0, 595.28, 140, 'F');

  // Title & Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('INDIA POWER OUTAGE INTELLIGENCE SYSTEM', 40, 60);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(255, 122, 0); // Orange (#ff7a00)
  doc.text('STATE VULNERABILITY REPORT CARD', 40, 85);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`Report Generated: ${new Date().toLocaleString()} | Horizon: 2015 - 2024`, 40, 110);

  // Divider line
  doc.setDrawColor(255, 122, 0);
  doc.setLineWidth(2.5);
  doc.line(0, 140, 595.28, 140);

  // State Name Section
  doc.setTextColor(10, 17, 40);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(stateName.toUpperCase(), 40, 195);

  // Draw Risk Level Badge
  doc.setFillColor(riskColor);
  doc.roundedRect(420, 172, 135, 28, 6, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('Helvetica', 'bold');
  doc.text(riskLevel.toUpperCase(), 487, 190, { align: 'center' });

  // Grid Metrics Section Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(10, 17, 40);
  doc.text('GRID PERFORMANCE INDEXES', 40, 245);
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, 253, 555, 253);

  // Helper function to draw metric box cards
  const drawMetricBox = (x, y, w, h, label, value, unit) => {
    // Fill card background
    doc.setFillColor(248, 250, 252); // slate 50
    doc.roundedRect(x, y, w, h, 6, 6, 'F');
    // Draw border
    doc.setDrawColor(226, 232, 240); // slate 200
    doc.roundedRect(x, y, w, h, 6, 6, 'D');

    // Label
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate 500
    doc.text(label.toUpperCase(), x + 15, y + 22);

    // Value
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate 900
    doc.text(value, x + 15, y + 47);

    // Unit
    if (unit) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(unit, x + 15 + doc.getTextWidth(value) + 5, y + 45);
    }
  };

  // Row 1
  drawMetricBox(40, 275, 245, 65, 'SEVI Score', sevi.toFixed(2), '/ 100');
  drawMetricBox(310, 275, 245, 65, 'Energy Deficit Ratio', deficit.toFixed(2), '%');

  // Row 2
  drawMetricBox(40, 360, 245, 65, 'Avg Outages', outages.toFixed(1), 'events / mo');
  drawMetricBox(310, 360, 245, 65, 'Recovery Speed', recovery.toFixed(2), 'hours');

  // Row 3 (requirement)
  drawMetricBox(40, 445, 515, 65, 'Average Monthly Energy Demand', requirement.toFixed(1), 'MU (Million Units)');

  // Insight Section
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(10, 17, 40);
  doc.text('AI-GENERATED RISK INSIGHTS', 40, 555);

  doc.setDrawColor(226, 232, 240);
  doc.line(40, 563, 555, 563);

  // Background for Insight Box (Orange Theme box)
  doc.setFillColor(255, 247, 237); // orange 50
  doc.roundedRect(40, 580, 515, 75, 8, 8, 'F');
  doc.setDrawColor(254, 215, 170); // orange 200
  doc.roundedRect(40, 580, 515, 75, 8, 8, 'D');

  // Insight Text
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(124, 45, 18); // orange 900
  const splitInsight = doc.splitTextToSize(insight, 480);
  doc.text(splitInsight, 55, 612);

  // Footer branding
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate 400
  doc.text('Confidential | Grid Intelligence Division | Ministry of Power', 40, 775);
  doc.text('India Power Outage System', 555, 775, { align: 'right' });

  // Save the PDF
  doc.save(`${stateName}_SEVI_Report.pdf`);
};
