import api from "./api";

/**
 * Downloads an Excel (.xlsx) file from the backend for the given module
 * (contacts, enquiries, jobs, financials).
 */
export async function downloadExcel(module: "contacts" | "enquiries" | "jobs" | "financials") {
  try {
    const response = await api.get(`/api/export/${module}`, {
      responseType: "blob",
    });

    // Create a temporary link element to trigger the browser download
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${module}_export.xlsx`);
    document.body.appendChild(link);
    link.click();

    // Clean up
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    alert(error?.response?.data?.detail || "Failed to download Excel report");
  }
}
