import { useState } from "react";
import { GRID_COLS } from "../components/layout/gridConstants";

const STORAGE_KEY = "ecotrack-dashboard-layout";

// Sample widget with mock data for demo purposes
const DEMO_WIDGET = {
  i: "demo-chart-1",
  x: 0,
  y: 0,
  w: 6,
  h: 4,
  widgetType: "ChartBar",
  dataset: "co2_monthly",
  dateMode: "dynamic",
  dynamicDays: 30,
};

export function useDashboardLayout() {
  const loadLayout = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // Return demo widget on first load if no layout exists
      return raw ? JSON.parse(raw) : [DEMO_WIDGET];
    } catch {
      return [DEMO_WIDGET];
    }
  };

  const [layout, setLayout] = useState(loadLayout);

  const saveLayout = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(layout, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecotrack-dashboard-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setLayout(JSON.parse(e.target.result));
      } catch {
        alert("File di configurazione non valido");
      }
    };
    reader.readAsText(file);
  };

  // Aggiunge widget alla posizione cliccata, ritorna l'oggetto widget
  const addWidgetAt = (col, row) => {
    const newId = `w${Date.now()}`;
    // Ensure x position is valid - widget has width 6
    const x = Math.max(0, Math.min(col, GRID_COLS - 6));
    const newWidget = {
      i: newId,
      x,
      y: row,
      w: 6,
      h: 4,
      widgetType: null,
      dataset: null,
    };
    setLayout((prev) => [...prev, newWidget]);
    return newWidget;
  };

  const updateWidget = (widgetId, updates) => {
    setLayout((prev) =>
      prev.map((w) => (w.i === widgetId ? { ...w, ...updates } : w)),
    );
  };

  const removeWidget = (widgetId) => {
    console.log("Removing widget", widgetId);
    setLayout((prev) => prev.filter((w) => w.i !== widgetId));
  };

  const onLayoutChange = (newLayout) => {
    setLayout((prev) =>
      prev.map((w) => {
        const updated = newLayout.find((n) => n.i === w.i);
        return updated
          ? { ...w, x: updated.x, y: updated.y, w: updated.w, h: updated.h }
          : w;
      }),
    );
  };

  return {
    layout,
    saveLayout,
    exportConfig,
    importConfig,
    addWidgetAt,
    updateWidget,
    removeWidget,
    onLayoutChange,
  };
}
