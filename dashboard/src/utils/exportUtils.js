// src/utils/exportUtils.js
import html2canvas from "html2canvas";

// RF2: Esporta un elemento DOM come immagine PNG
export async function exportWidgetAsImage(element, filename) {
  if (!element) return;
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2, // Alta risoluzione
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

// RF2: Scarica i dati di un widget come file CSV
export async function exportWidgetAsCsv(dataset, config) {
  const params = new URLSearchParams();
  if (config.startDate) params.set("date_start", config.startDate);
  if (config.endDate) params.set("date_end", config.endDate);

  // Usa l'endpoint CSV del backend (RF3.1)
  const apiKey = import.meta.env.VITE_API_KEY;
  const url = `/api/dashboard/${dataset}.csv?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: { "x-api-key": apiKey } });
    if (!res.ok) throw new Error("Errore nel download CSV");
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${dataset}-${Date.now()}.csv`;
    link.click();
  } catch (err) {
    console.error("Errore export CSV:", err);
    alert("Impossibile esportare i dati in CSV");
  }
}
