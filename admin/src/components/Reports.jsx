import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  BarChart3,
  Calendar,
  Download,
  FileText,
  Loader,
  TrendingUp,
} from "lucide-react";

const Reports = () => {
  const [reportType, setReportType] = useState("daily"); // daily, monthly, yearly
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(
    new Date().getUTCFullYear().toString(),
  );
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const reportQueryParams = useCallback(() => {
    if (reportType === "daily") {
      return { type: "daily", date: selectedDate };
    }
    if (reportType === "monthly") {
      const monthValue =
        selectedMonth.length === 7 && selectedMonth.includes("-")
          ? selectedMonth
          : new Date().toISOString().slice(0, 7);
      return { type: "monthly", month: monthValue };
    }
    return { type: "yearly", year: selectedYear };
  }, [reportType, selectedDate, selectedMonth, selectedYear]);

  const formatPeriodLabel = (period) => {
    if (!period?.startDate || !period?.endDate) return "";
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
    const opts = { dateStyle: "medium", timeZone: "UTC" };
    return `${start.toLocaleString("en-GB", opts)} → ${end.toLocaleString("en-GB", opts)} (UTC)`;
  };

  const saveBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const parseErrorFromArrayBuffer = (buf) => {
    try {
      const text = new TextDecoder().decode(buf);
      const parsed = JSON.parse(text);
      return parsed.message || parsed.error || text || "Request failed";
    } catch {
      return "Download failed";
    }
  };

  /**
   * PDF is buffered on the server (Content-Length) so the body is one chunk — avoids
   * fetch/axios failing with "Failed to fetch" / "Network Error" while reading streamed PDFs.
   */
  const downloadReportBinary = async (path, mimeType) => {
    const res = await api.get(path, {
      params: reportQueryParams(),
      responseType: "arraybuffer",
      headers: { Accept: mimeType },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const buf = res.data;
    if (!buf || buf.byteLength === 0) {
      throw new Error("Empty response from server");
    }

    const ct = String(res.headers["content-type"] || "").toLowerCase();
    const firstByte = new Uint8Array(buf)[0];
    if (ct.includes("application/json") || firstByte === 0x7b) {
      throw new Error(parseErrorFromArrayBuffer(buf));
    }

    return new Blob([buf], { type: mimeType });
  };

  // Fetch report: bookings in range by `createdAt` (daily / monthly / yearly on server)
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/reports", {
        params: reportQueryParams(),
      });

      if (res.data?.success) {
        setReportData(res.data.data);
      } else {
        setReportData(null);
        toast.error(
          res.data?.message || "Failed to load report: Unexpected response format",
        );
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      setReportData(null);
      let errorMessage = "Failed to load report.";
      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          `Server error: ${error.response.status} ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage =
          "No response from server. Please check your network connection or server status.";
      } else {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [reportQueryParams]);

  const downloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      const blob = await downloadReportBinary(
        "/api/admin/reports/download/pdf",
        "application/pdf",
      );
      const stamp = new Date().toISOString().slice(0, 10);
      saveBlob(blob, `report-${reportType}-${stamp}.pdf`);
      toast.success("PDF downloaded");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      let message = error.message || "Failed to download PDF.";
      if (error.response?.data instanceof ArrayBuffer && error.response.data.byteLength > 0) {
        const b = new Uint8Array(error.response.data)[0];
        if (b === 0x7b) message = parseErrorFromArrayBuffer(error.response.data);
      }
      toast.error(message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const downloadCSV = async () => {
    setDownloadingCsv(true);
    try {
      const blob = await downloadReportBinary(
        "/api/admin/reports/download/csv",
        "text/csv;charset=utf-8",
      );
      const stamp = new Date().toISOString().slice(0, 10);
      saveBlob(blob, `report-${reportType}-${stamp}.csv`);
      toast.success("CSV downloaded");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      let message = error.message || "Failed to download CSV.";
      if (error.response?.data instanceof ArrayBuffer && error.response.data.byteLength > 0) {
        const b = new Uint8Array(error.response.data)[0];
        if (b === 0x7b) message = parseErrorFromArrayBuffer(error.response.data);
      }
      toast.error(message);
    } finally {
      setDownloadingCsv(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="rounded-xl bg-white border border-gray-200 p-6 hover:border-orange-500/50 transition-all shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-28 pb-8 sm:pt-32 px-4 sm:px-6 lg:px-8">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500 mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            Reports & Analytics
          </h1>
          <p className="text-gray-400">View and download your business reports</p>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Numbers are based on bookings whose record was created in the selected period. Ranges use{" "}
            <span className="text-gray-400">UTC</span> so they match the database. Revenue includes only
            bookings with payment status <span className="text-gray-400">paid</span> (PKR).
          </p>
        </div>

        {/* Report Type Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {["daily", "monthly", "yearly"].map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                reportType === type
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/50"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} Report
            </button>
          ))}
        </div>

        {/* Date/Month/Year Selector */}
        <div className="bg-white border border-gray-200 backdrop-blur-sm rounded-xl p-6 mb-8 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fetchReport()}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-300 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reportType === "daily" && (
              <div>
                <label className="text-gray-600 text-sm font-medium mb-2 block">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-gray-900 rounded-lg border border-gray-300 focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            {reportType === "monthly" && (
              <div>
                <label className="text-gray-600 text-sm font-medium mb-2 block">
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-gray-900 rounded-lg border border-gray-300 focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            {reportType === "yearly" && (
              <div>
                <label className="text-gray-600 text-sm font-medium mb-2 block">
                  Select Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-gray-900 rounded-lg border border-gray-300 focus:outline-none focus:border-orange-500"
                >
                  {(() => {
                    const current = new Date().getUTCFullYear();
                    const years = [];
                    for (let y = current; y >= current - 15; y -= 1) years.push(y);
                    return years.map((year) => (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    ));
                  })()}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-orange-500 animate-spin" />
            <span className="ml-3 text-gray-600">Loading report data...</span>
          </div>
        )}

        {/* Report Data */}
        {!loading && reportData && (
          <>
            {reportData.period && (
              <div className="mb-6 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                <span className="font-medium text-orange-400/90">Selected period</span>
                <span className="mx-2 text-gray-600">·</span>
                {formatPeriodLabel(reportData.period)}
                <span className="mx-2 text-gray-600">·</span>
                <span className="text-gray-500">
                  {reportData.totalBookings ?? 0} booking
                  {(reportData.totalBookings ?? 0) === 1 ? "" : "s"} in range
                </span>
              </div>
            )}

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total bookings (period)"
                value={reportData.totalBookings || 0}
                icon={Calendar}
                color="bg-blue-900/30 text-blue-400"
              />
              <StatCard
                label="Paid bookings"
                value={reportData.paidBookingsCount ?? 0}
                icon={TrendingUp}
                color="bg-green-900/30 text-green-400"
              />
              <StatCard
                label="Total revenue (paid)"
                value={`PKR ${(reportData.totalRevenue || 0).toLocaleString()}`}
                icon={BarChart3}
                color="bg-orange-900/30 text-orange-400"
              />
              <StatCard
                label="Avg / paid booking"
                value={`PKR ${(reportData.averageRevenuePerBooking || 0).toLocaleString()}`}
                icon={TrendingUp}
                color="bg-purple-900/30 text-purple-400"
              />
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Pending payment"
                value={reportData.pendingPaymentBookings ?? 0}
                icon={Calendar}
                color="bg-amber-900/30 text-amber-400"
              />
              <StatCard
                label="Completed"
                value={reportData.completedBookings || 0}
                icon={Calendar}
                color="bg-emerald-900/30 text-emerald-400"
              />
              <StatCard
                label="Cancelled"
                value={reportData.cancelledBookings || 0}
                icon={Calendar}
                color="bg-red-900/30 text-red-400"
              />
              <StatCard
                label="Active / upcoming"
                value={reportData.activeBookings || 0}
                icon={Calendar}
                color="bg-yellow-900/30 text-yellow-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <StatCard
                label="Unique vehicles (paid)"
                value={reportData.uniqueVehiclesUsed || 0}
                icon={TrendingUp}
                color="bg-cyan-900/30 text-cyan-400"
              />
              <StatCard
                label="Cars in fleet"
                value={reportData.fleetTotalCars ?? "—"}
                icon={BarChart3}
                color="bg-white text-gray-700 border border-gray-200"
              />
            </div>

          </>
        )}

        {!loading && !reportData && (
          <div className="text-center py-12">
            <p className="text-gray-400">No data available for the selected period</p>
          </div>
        )}

        {/* Downloads use the same filters as the API (no need to wait for stats above). */}
        <div className="mt-8 flex flex-col gap-2 border-t border-gray-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">Export for the current report type and date selection</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={downloadPDF}
              disabled={downloadingPdf || downloadingCsv || loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:from-orange-700 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadingPdf ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              PDF
            </button>
            <button
              type="button"
              onClick={downloadCSV}
              disabled={downloadingPdf || downloadingCsv || loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadingCsv ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
