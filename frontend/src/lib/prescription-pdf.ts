export async function generatePrescriptionPDF(prescription: any) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(2, 132, 199);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("SoloDoc", 15, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("eMedicine Platform", 15, 26);
  doc.text("solo-doctor-emedicine-platform.vercel.app", 15, 33);

  // PRESCRIPTION title on right
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PRESCRIPTION", pageWidth - 15, 22, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(prescription.createdAt).toLocaleDateString("en-KE", { dateStyle: "full" })}`, pageWidth - 15, 30, { align: "right" });
  doc.text(`Ref: ${prescription.id.slice(0, 8).toUpperCase()}`, pageWidth - 15, 36, { align: "right" });

  // Doctor info box
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 249, 255);
  doc.rect(10, 48, 88, 30, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("PRESCRIBING DOCTOR", 14, 55);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`Dr. ${prescription.doctorProfile?.user?.fullName ?? ""}`, 14, 63);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  if (prescription.doctorProfile?.specialty) {
    doc.text(prescription.doctorProfile.specialty, 14, 70);
  }

  // Patient info box
  doc.setFillColor(240, 253, 244);
  doc.rect(102, 48, 88, 30, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("PATIENT", 106, 55);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(prescription.patientProfile?.user?.fullName ?? "", 106, 63);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(prescription.patientProfile?.user?.email ?? "", 106, 70);

  let yPos = 88;

  // Diagnosis
  if (prescription.diagnosis) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("DIAGNOSIS", 10, yPos);
    yPos += 5;
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.5);
    doc.line(10, yPos, pageWidth - 10, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const diagLines = doc.splitTextToSize(prescription.diagnosis, pageWidth - 20);
    doc.text(diagLines, 10, yPos);
    yPos += diagLines.length * 5 + 8;
  }

  // Medications table
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("MEDICATIONS", 10, yPos);
  yPos += 4;

  const medications = Array.isArray(prescription.medications) ? prescription.medications : [];

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Medication", "Dosage", "Frequency", "Duration", "Instructions"]],
    body: medications.map((med: any, i: number) => [
      i + 1,
      med.name,
      med.dosage,
      med.frequency,
      med.duration,
      med.instructions || "-",
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [2, 132, 199], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 38 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 22 },
      5: { cellWidth: 52 },
    },
    margin: { left: 10, right: 10 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Notes
  if (prescription.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("ADDITIONAL NOTES", 10, yPos);
    yPos += 4;
    doc.setDrawColor(2, 132, 199);
    doc.line(10, yPos, pageWidth - 10, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const noteLines = doc.splitTextToSize(prescription.notes, pageWidth - 20);
    doc.text(noteLines, 10, yPos);
    yPos += noteLines.length * 5 + 8;
  }

  // Valid until
  if (prescription.validUntil) {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.5);
    doc.rect(10, yPos, pageWidth - 20, 10, "FD");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(146, 64, 14);
    doc.text(`Valid Until: ${new Date(prescription.validUntil).toLocaleDateString("en-KE", { dateStyle: "full" })}`, 14, yPos + 7);
    yPos += 18;
  }

  // Signature area
  yPos = Math.max(yPos, 230);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(10, yPos + 15, 70, yPos + 15);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Doctor's Signature", 10, yPos + 20);
  doc.text(`Dr. ${prescription.doctorProfile?.user?.fullName ?? ""}`, 10, yPos + 26);

  // Footer
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 275, pageWidth, 22, "F");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("This prescription was generated by SoloDoc eMedicine Platform.", pageWidth / 2, 281, { align: "center" });
  doc.text("Please present this document to your pharmacist.", pageWidth / 2, 286, { align: "center" });
  doc.text(`Generated: ${new Date().toLocaleString("en-KE")}`, pageWidth / 2, 291, { align: "center" });

  doc.save(`prescription-${prescription.id.slice(0, 8)}.pdf`);
}