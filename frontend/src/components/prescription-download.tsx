"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";

interface PrescriptionDownloadProps {
  appointmentId: string;
}

export function PrescriptionDownload({ appointmentId }: PrescriptionDownloadProps) {
  const [downloading, setDownloading] = useState(false);

  const { data: prescription, isLoading } = useQuery({
    queryKey: ["prescription", appointmentId],
    queryFn: () => apiClient.get(`/prescriptions/appointment/${appointmentId}`).then(r => r.data),
    retry: false,
  });

  const handleDownload = async () => {
    if (!prescription) return;
    setDownloading(true);
    try {
      const { generatePrescriptionPDF } = await import("@/lib/prescription-pdf");
      await generatePrescriptionPDF(prescription);
    } catch (err) {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) return null;
  if (!prescription) return null;

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-lg touch-manipulation disabled:opacity-50"
    >
      {downloading
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <FileText className="w-3 h-3" />
      }
      {downloading ? "Generating..." : "Prescription"}
    </button>
  );
}