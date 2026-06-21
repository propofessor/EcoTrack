import html2canvas from "html2canvas";
import Papa from "papaparse";


export async function exportWidgetAsImage(element, filename) {
  if (!element) return;
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2,
    });
    const link = document.createElement("a");
    link.download = `${filename}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error("Errore esportazione immagine:", err);
    alert("Impossibile esportare il widget come immagine");
  }
}


export function exportWidgetAsCsv(dataset, data) {
  if (!Array.isArray(data) || data.length === 0) {
    alert("Nessun dato da esportare");
    return;
  }
  try {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${dataset || "export"}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    console.error("Errore export CSV:", err);
    alert("Impossibile esportare i dati in CSV");
  }
}
