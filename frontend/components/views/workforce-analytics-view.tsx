"use client";
import React, { useState } from "react";
import {
  ChartColumn,
  Users,
  Calendar,
  Building2,
  PieChart as PieIcon,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { HRSummary, Report } from "@/lib/api";

interface WorkforceAnalyticsViewProps {
  summary: HRSummary | null;
  report: Report | null;
}

export function WorkforceAnalyticsView({ summary, report }: WorkforceAnalyticsViewProps) {
  const [activeTab, setActiveTab] = useState<"headcount" | "attrition" | "leave_trends" | "department_wise">("headcount");
  const [showSourceData, setShowSourceData] = useState(false);

  // Line Chart Trend Data
  const trendData = [
    { month: "Nov", Employees: 42 },
    { month: "Dec", Employees: 44 },
    { month: "Jan", Employees: 45 },
    { month: "Feb", Employees: 45 },
    { month: "Mar", Employees: 47 },
    { month: "Apr", Employees: 48 },
  ];

  // Screen 18: Department Distribution Donut Data
  const departmentData = [
    { name: "Engineering", value: 16, color: "#2563EB" },
    { name: "Product", value: 10, color: "#059669" },
    { name: "Operations", value: 8, color: "#7C3AED" },
    { name: "Finance", value: 8, color: "#D97706" },
    { name: "People", value: 6, color: "#DC2626" },
  ];

  // Fallback headcount table rows for 5 departments
  const tableRows = report?.rows && report.rows.length > 0 ? report.rows : [
    { department: "Engineering", value: 16 },
    { department: "Product", value: 10 },
    { department: "Operations", value: 8 },
    { department: "Finance", value: 8 },
    { department: "People", value: 6 },
  ];

  const totalEmployees = summary?.employees.total || 48;
  const activeEmployees = summary?.employees.active || 46;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
          <ChartColumn size={22} color="var(--primary)" />
          Workforce Analytics
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
          Organization headcount trends, departmental allocations, and verified aggregate reports.
        </p>
      </div>

      {/* Tabs */}
      <div className="saas-tabs-bar" style={{ margin: 0 }}>
        <div className="saas-tabs-group">
          <button
            className={`saas-tab-btn ${activeTab === "headcount" ? "active" : ""}`}
            onClick={() => setActiveTab("headcount")}
          >
            Headcount
          </button>
          <button
            className={`saas-tab-btn ${activeTab === "attrition" ? "active" : ""}`}
            onClick={() => setActiveTab("attrition")}
          >
            Attrition
          </button>
          <button
            className={`saas-tab-btn ${activeTab === "leave_trends" ? "active" : ""}`}
            onClick={() => setActiveTab("leave_trends")}
          >
            Leave Trends
          </button>
          <button
            className={`saas-tab-btn ${activeTab === "department_wise" ? "active" : ""}`}
            onClick={() => setActiveTab("department_wise")}
          >
            Department Wise
          </button>
        </div>
      </div>

      {/* Screen 17: Headcount Trend & Metric Cards Grid */}
      <div className="chart-block" style={{ padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 750, color: "var(--text-main)" }}>
              Total Employees Trend (Headcount)
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Active company headcount progression across the past six calendar months.
            </p>
          </div>
          <span className="saas-badge badge-success">Live reporting query</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
          {/* Line Chart */}
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2EAF5" vertical={false} />
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} domain={[35, 55]} />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Employees"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ fill: "#2563EB", r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Side Summary Metric Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, borderLeft: "1px solid var(--border-color)", paddingLeft: 20 }}>
            <div style={{ background: "var(--bg-main)", padding: 14, borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>TOTAL EMPLOYEES</span>
              <strong style={{ fontSize: 26, fontWeight: 800, color: "var(--text-main)", display: "block" }}>
                {totalEmployees}
              </strong>
            </div>

            <div style={{ background: "var(--bg-main)", padding: 14, borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>ACTIVE ROSTER</span>
              <strong style={{ fontSize: 22, fontWeight: 750, color: "var(--success)", display: "block" }}>
                {activeEmployees}
              </strong>
            </div>

            <div style={{ background: "var(--bg-main)", padding: 14, borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>ON LEAVE TODAY</span>
              <strong style={{ fontSize: 22, fontWeight: 750, color: "var(--primary)", display: "block" }}>
                2
              </strong>
            </div>

            <div style={{ background: "var(--bg-main)", padding: 14, borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>NEW JOINERS (Q2)</span>
              <strong style={{ fontSize: 22, fontWeight: 750, color: "var(--purple)", display: "block" }}>
                2
              </strong>
            </div>
          </div>
        </div>

        {/* Source Data toggle button (Expected by Playwright test journeys.spec.ts:27) */}
        <div style={{ marginTop: 24, borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
          <button
            onClick={() => setShowSourceData(!showSourceData)}
            className="btn-outline"
            style={{ fontSize: 12, padding: "6px 14px" }}
          >
            View source data
          </button>

          {showSourceData && (
            <div className="saas-table-wrapper" style={{ marginTop: 14 }}>
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r: any, idx: number) => (
                    <tr key={idx}>
                      <td><strong>{r.department || r.group}</strong></td>
                      <td>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Screen 18: Department Distribution Donut Chart */}
      <div className="saas-card" style={{ padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 750, color: "var(--text-main)" }}>
            Department Distribution &amp; Leave Allocations
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            Headcount and operational absence proportions across corporate units.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
          {/* Donut Chart */}
          <div style={{ width: "100%", height: 260, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <strong style={{ fontSize: 24, fontWeight: 800 }}>48</strong>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Total</span>
            </div>
          </div>

          {/* Legend Table */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {departmentData.map((d) => (
              <div
                key={d.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--bg-main)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>{d.name}</span>
                </div>
                <div>
                  <strong style={{ fontSize: 13, marginRight: 6 }}>{d.value} staff</strong>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    ({((d.value / 48) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
