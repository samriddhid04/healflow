// components/ui.jsx  –  shared atomic components
import React from "react";

const STATUS = {
  active:     { label: "Active",     bg: "var(--green-light)",  text: "var(--green)" },
  critical:   { label: "Critical",   bg: "var(--red-light)",    text: "var(--red)" },
  discharged: { label: "Discharged", bg: "var(--slate-light)",  text: "var(--slate)" },
};

const APPT_STATUS = {
  upcoming:    { label: "Upcoming",     bg: "#EFF6FF", text: "#1D4ED8" },
  "in-progress":{ label: "In Progress", bg: "#FFFBEB", text: "#B45309" },
  completed:   { label: "Completed",    bg: "#F0FDF4", text: "#15803D" },
  cancelled:   { label: "Cancelled",    bg: "#F8FAFC", text: "#64748B" },
};

const LAB_STATUS = {
  normal:   { label: "Normal",   bg: "#F0FDF4", text: "#15803D" },
  abnormal: { label: "Abnormal", bg: "#FFFBEB", text: "#B45309" },
  critical: { label: "Critical", bg: "#FEF2F2", text: "#B91C1C" },
  pending:  { label: "Pending",  bg: "#EFF6FF", text: "#1D4ED8" },
};

export function Badge({ type = "status", value }) {
  const map = type === "appt" ? APPT_STATUS : type === "lab" ? LAB_STATUS : STATUS;
  const m = map[value] || { label: value, bg: "#F1F5F9", text: "#475569" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.4px",
      padding: "3px 9px", borderRadius: 20,
      background: m.bg, color: m.text, whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}

export function Avatar({ initials, hue = "#1D4ED8", size = 38 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: hue + "18", color: hue,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.3), fontWeight: 600, letterSpacing: "0.5px",
    }}>{initials}</div>
  );
}

export function Card({ children, style = {}, className }) {
  return (
    <div className={className} style={{
      background: "var(--white)", borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)",
      ...style,
    }}>{children}</div>
  );
}

export function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        border: "3px solid var(--border)",
        borderTopColor: "var(--blue)",
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 24px", gap: 12,
    }}>
      <div style={{ fontSize: 28 }}>⚠️</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>Unable to load data</div>
      <div style={{ fontSize: 13, color: "var(--text-4)", textAlign: "center" }}>
        Make sure the backend is running on <code style={{ fontSize: 12, background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>localhost:4000</code>
      </div>
      <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{message}</div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
      <div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: "var(--text-1)", marginBottom: 3 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: "var(--text-3)" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}