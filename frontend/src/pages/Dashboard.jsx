// pages/Dashboard.jsx
import React from "react";
import { useApi } from "../hooks/useApi.js";
import { Card, Badge, Avatar, Spinner, ErrorState, SectionHeader } from "../components/ui.jsx";

// ── Sub-components ────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent, icon }) {
  return (
    <Card style={{ padding: "20px 22px" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 14,
      }}>
        <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>{label}</span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: accent + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15,
        }}>{icon}</div>
      </div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 38, fontWeight: 600,
        color: accent, lineHeight: 1, marginBottom: 4,
      }}>
        {value ?? "—"}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-4)" }}>{sub}</div>}
    </Card>
  );
}

function StatusBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color, fontWeight: 500 }}>{label}</span>
        <span style={{ color: "var(--text-3)" }}>{count} ({pct}%)</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "var(--border)" }}>
        <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: color, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

function WardBar({ ward, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: "var(--text-2)" }}>{ward}</span>
        <span style={{ fontWeight: 600, color: "var(--text-1)" }}>{count}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "var(--border)" }}>
        <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: "var(--blue)", transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

function VitalChip({ label, value, alert }) {
  return (
    <div style={{
      background: alert ? "var(--red-light)" : "var(--slate-light)",
      borderRadius: 6, padding: "5px 10px", textAlign: "center",
      border: `1px solid ${alert ? "#FECACA" : "var(--border)"}`,
      minWidth: 64,
    }}>
      <div style={{ fontSize: 10, color: alert ? "var(--red)" : "var(--text-4)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: alert ? "var(--red)" : "var(--text-1)" }}>{value}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard({ setPage }) {
  // data is already unwrapped by useApi → { metrics, statusBreakdown, wardCensus, todayAppointments, criticalPatients }
  const { data, loading, error } = useApi("/dashboard/summary");

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} />;

  // Safe destructure with fallbacks
  const metrics           = data?.metrics           ?? {};
  const statusBreakdown   = data?.statusBreakdown   ?? {};
  const wardCensus        = data?.wardCensus         ?? {};
  const todayAppointments = data?.todayAppointments  ?? [];
  const criticalPatients  = data?.criticalPatients   ?? [];

  const wardEntries = Object.entries(wardCensus).sort((a, b) => b[1] - a[1]);
  const wardMax     = wardEntries.length > 0 ? Math.max(...wardEntries.map(w => w[1])) : 1;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 26, fontWeight: 600, color: "var(--text-1)", marginBottom: 4,
          }}>
            Clinical Dashboard
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>
            {today} · Mass General Hospital · Boston, MA
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, background: "var(--green-light)", color: "var(--green)", fontWeight: 600, border: "1px solid #BBF7D0" }}>
            ● System Online
          </span>
          <span style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, background: "var(--blue-light)", color: "var(--blue)", fontWeight: 600, border: "1px solid var(--blue-mid)" }}>
            HIPAA Compliant
          </span>
        </div>
      </div>

      {/* Primary metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <MetricCard label="Total Inpatients"      value={metrics.totalPatients}     sub="All wards"            accent="var(--blue)"  icon="🏥" />
        <MetricCard label="Active Patients"       value={metrics.activePatients}    sub="Currently monitoring" accent="#15803D"      icon="✅" />
        <MetricCard label="Critical / ICU"        value={metrics.criticalPatients}  sub="Needs attention"      accent="var(--red)"   icon="🚨" />
        <MetricCard label="Today's Appointments"  value={metrics.appointmentsToday} sub="Scheduled"            accent="#7C3AED"      icon="📅" />
      </div>

      {/* Secondary metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <MetricCard label="Pending Labs"     value={metrics.pendingLabs}     sub="Awaiting results"  accent="var(--amber)" icon="🧪" />
        <MetricCard label="Flagged Results"  value={metrics.flaggedLabs}     sub="Needs review"      accent="var(--red)"   icon="⚠️" />
        <MetricCard label="Discharged Today" value={metrics.dischargedToday} sub="Released patients" accent="var(--slate)" icon="🚪" />
      </div>

      {/* Main content area */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>

        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Critical alerts */}
          {criticalPatients.length > 0 && (
            <Card style={{ padding: "20px 22px", borderLeft: "3px solid var(--red)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 16 }}>🚨</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--red)" }}>
                  {criticalPatients.length} patient{criticalPatients.length !== 1 ? "s" : ""} require immediate attention
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {criticalPatients.map(p => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "12px 14px", borderRadius: 8,
                    background: "var(--red-light)", border: "1px solid #FECACA",
                  }}>
                    <Avatar initials={p.avatar || "??"} hue={p.hue || "#DC2626"} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>
                        {p.diagnosis} · {p.ward} · Room {p.room}
                      </div>
                      {p.vitals && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {p.vitals.bp   && <VitalChip label="BP"   value={p.vitals.bp}   alert={true} />}
                          {p.vitals.hr   && <VitalChip label="HR"   value={p.vitals.hr}   alert={parseInt(p.vitals.hr) > 100} />}
                          {p.vitals.o2   && <VitalChip label="O₂"   value={p.vitals.o2}   alert={parseInt(p.vitals.o2) < 92} />}
                          {p.vitals.temp && <VitalChip label="Temp" value={p.vitals.temp} alert={false} />}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Today's schedule preview */}
          <Card style={{ padding: "20px 22px" }}>
            <SectionHeader
              title="Today's Schedule"
              subtitle={`${todayAppointments.length} appointment${todayAppointments.length !== 1 ? "s" : ""}`}
              action={
                <button
                  onClick={() => setPage("schedule")}
                  style={{
                    fontSize: 12, padding: "6px 14px", borderRadius: 6,
                    border: "1px solid var(--border-dark)", background: "transparent",
                    color: "var(--text-2)", fontWeight: 500, cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >View full →</button>
              }
            />

            {todayAppointments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-4)", fontSize: 13 }}>
                No appointments scheduled for today.
              </div>
            ) : (
              todayAppointments.map((a, i) => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "11px 0",
                  borderBottom: i < todayAppointments.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ minWidth: 48, fontSize: 12, fontWeight: 700, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
                    {a.time}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 1 }}>{a.patientName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>{a.type} · {a.provider}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-4)", marginRight: 8 }}>{a.room}</div>
                  <Badge type="appt" value={a.status} />
                </div>
              ))
            )}
          </Card>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Patient status breakdown */}
          <Card style={{ padding: "20px 22px" }}>
            <SectionHeader title="Patient Census" subtitle="Current status" />
            <StatusBar label="Active"     count={statusBreakdown.active     ?? 0} total={metrics.totalPatients ?? 1} color="#15803D" />
            <StatusBar label="Critical"   count={statusBreakdown.critical   ?? 0} total={metrics.totalPatients ?? 1} color="var(--red)" />
            <StatusBar label="Discharged" count={statusBreakdown.discharged ?? 0} total={metrics.totalPatients ?? 1} color="var(--slate)" />
          </Card>

          {/* Ward census */}
          {wardEntries.length > 0 && (
            <Card style={{ padding: "20px 22px" }}>
              <SectionHeader title="Ward Census" subtitle="Active inpatients by unit" />
              {wardEntries.map(([ward, count]) => (
                <WardBar key={ward} ward={ward} count={count} max={wardMax} />
              ))}
            </Card>
          )}

          {/* Quick actions */}
          <Card style={{ padding: "20px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              Quick Actions
            </div>
            {[
              { label: "View all patients",  page: "patients", icon: "👥" },
              { label: "Today's schedule",   page: "schedule", icon: "📅" },
              { label: "Review lab results", page: "labs",     icon: "🧪" },
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => setPage(q.page)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 12px", borderRadius: 8, marginBottom: 6,
                  border: "1px solid var(--border)", background: "var(--surface)",
                  color: "var(--text-2)", fontSize: 13, fontWeight: 500,
                  textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.12s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "var(--blue)";
                  e.currentTarget.style.background  = "var(--blue-light)";
                  e.currentTarget.style.color       = "var(--blue)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background  = "var(--surface)";
                  e.currentTarget.style.color       = "var(--text-2)";
                }}
              >
                <span style={{ fontSize: 15 }}>{q.icon}</span>
                {q.label}
              </button>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}