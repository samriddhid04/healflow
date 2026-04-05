// pages/Dashboard.jsx
import React from "react";
import { useApi } from "../hooks/useApi.js";
import { Card, Badge, Avatar, Spinner, ErrorState, SectionHeader } from "../components/ui.jsx";

function MetricCard({ label, value, sub, accent = "var(--blue)", icon }) {
  return (
    <Card style={{ padding: "20px 22px", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500, letterSpacing: "0.2px" }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: accent + "15", display: "flex", alignItems: "center", justifyContent: "center", color: accent, fontSize: 15 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 600, color: accent, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-4)" }}>{sub}</div>}
    </Card>
  );
}

function WardCensus({ wardCensus }) {
  const wards = Object.entries(wardCensus).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...wards.map(w => w[1]), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {wards.map(([ward, count]) => (
        <div key={ward}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5, color: "var(--text-2)" }}>
            <span>{ward}</span>
            <span style={{ fontWeight: 500 }}>{count} {count === 1 ? "patient" : "patients"}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--border)" }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${(count / max) * 100}%`, background: "var(--blue)", transition: "width 0.4s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function VitalChip({ label, value, alert }) {
  return (
    <div style={{ background: alert ? "var(--red-light)" : "var(--slate-light)", borderRadius: 6, padding: "5px 10px", textAlign: "center", border: `1px solid ${alert ? "#FECACA" : "var(--border)"}` }}>
      <div style={{ fontSize: 10, color: alert ? "var(--red)" : "var(--text-4)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: alert ? "var(--red)" : "var(--text-1)" }}>{value}</div>
    </div>
  );
}

export default function Dashboard({ setPage }) {
  const { data, loading, error } = useApi("/dashboard/summary");

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} />;

  const { metrics, statusBreakdown, wardCensus, todayAppointments, criticalPatients } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>
            Clinical Dashboard
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>
            Wednesday, April 2, 2026 · Mass General Hospital · Boston, MA
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, background: "var(--green-light)", color: "var(--green)", fontWeight: 600, border: "1px solid #BBF7D0" }}>
            ● System Online
          </div>
          <div style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, background: "var(--blue-light)", color: "var(--blue)", fontWeight: 600, border: "1px solid var(--blue-mid)" }}>
            HIPAA Compliant
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <MetricCard label="Total Inpatients"    value={metrics.totalPatients}     sub="All wards"         accent="var(--blue)"  icon="🏥" />
        <MetricCard label="Active Patients"     value={metrics.activePatients}    sub="Monitoring"        accent="#15803D"      icon="✅" />
        <MetricCard label="Critical / ICU"      value={metrics.criticalPatients}  sub="Requires attention" accent="var(--red)"  icon="🚨" />
        <MetricCard label="Today's Appointments" value={metrics.appointmentsToday} sub="Scheduled"        accent="#7C3AED"      icon="📅" />
      </div>

      {/* Secondary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <MetricCard label="Pending Labs"   value={metrics.pendingLabs}   sub="Awaiting results"  accent="var(--amber)"  icon="🧪" />
        <MetricCard label="Flagged Results" value={metrics.flaggedLabs}   sub="Needs review"      accent="var(--red)"    icon="⚠️" />
        <MetricCard label="Discharged Today" value={metrics.dischargedToday} sub="Released patients" accent="var(--slate)" icon="🚪" />
      </div>

      {/* Main content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Critical alerts */}
          {criticalPatients.length > 0 && (
            <Card style={{ padding: "20px 22px", borderLeft: "3px solid var(--red)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 14 }}>🚨</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--red)" }}>
                  Critical Alerts — {criticalPatients.length} patient{criticalPatients.length !== 1 ? "s" : ""} require immediate attention
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {criticalPatients.map(p => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "12px 14px", borderRadius: 8,
                    background: "var(--red-light)", border: "1px solid #FECACA",
                  }}>
                    <Avatar initials={p.avatar} hue={p.hue} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>{p.diagnosis} · {p.ward} · {p.room}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <VitalChip label="BP"   value={p.vitals.bp}   alert={true} />
                        <VitalChip label="HR"   value={`${p.vitals.hr} bpm`} alert={p.vitals.hr > 100} />
                        <VitalChip label="O₂"   value={p.vitals.o2}   alert={parseFloat(p.vitals.o2) < 92} />
                        <VitalChip label="Temp" value={p.vitals.temp} alert={false} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Today's schedule */}
          <Card style={{ padding: "20px 22px" }}>
            <SectionHeader
              title="Today's Schedule"
              subtitle={`${todayAppointments.length} appointments`}
              action={
                <button onClick={() => setPage("schedule")} style={{
                  fontSize: 12, padding: "6px 14px", borderRadius: 6,
                  border: "1px solid var(--border-dark)", background: "transparent",
                  color: "var(--text-2)", fontWeight: 500,
                }}>View full →</button>
              }
            />
            {todayAppointments.length === 0
              ? <div style={{ textAlign: "center", padding: "24px", color: "var(--text-4)", fontSize: 13 }}>No appointments scheduled for today.</div>
              : todayAppointments.map((a, i) => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 0",
                  borderBottom: i < todayAppointments.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ minWidth: 44, fontSize: 12, fontWeight: 600, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{a.time}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 2 }}>{a.patientName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>{a.type} · {a.provider}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-4)", marginRight: 8 }}>{a.room}</div>
                  <Badge type="appt" value={a.status} />
                </div>
              ))
            }
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Patient status */}
          <Card style={{ padding: "20px 22px" }}>
            <SectionHeader title="Patient Census" subtitle="Current status breakdown" />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Object.entries({
                active:     { label: "Active",     color: "var(--green)" },
                critical:   { label: "Critical",   color: "var(--red)" },
                discharged: { label: "Discharged", color: "var(--slate)" },
              }).map(([key, meta]) => {
                const count = statusBreakdown[key];
                const pct = Math.round((count / metrics.totalPatients) * 100);
                return (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: meta.color, fontWeight: 500 }}>{meta.label}</span>
                      <span style={{ color: "var(--text-3)" }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--border)" }}>
                      <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: meta.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Ward census */}
          <Card style={{ padding: "20px 22px" }}>
            <SectionHeader title="Ward Census" subtitle="Active inpatients by unit" />
            <WardCensus wardCensus={wardCensus} />
          </Card>

          {/* Quick actions */}
          <Card style={{ padding: "20px 22px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>Quick Actions</div>
            {[
              { label: "View all patients",    action: () => setPage("patients"),  icon: "👥" },
              { label: "Today's schedule",     action: () => setPage("schedule"),  icon: "📅" },
              { label: "Review lab results",   action: () => setPage("labs"),      icon: "🧪" },
            ].map((q, i) => (
              <button key={i} onClick={q.action} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 12px", borderRadius: 8, marginBottom: 6,
                border: "1px solid var(--border)", background: "var(--surface)",
                color: "var(--text-2)", fontSize: 13, fontWeight: 500, textAlign: "left",
                transition: "all 0.12s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.background = "var(--blue-light)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
              >
                <span style={{ fontSize: 15 }}>{q.icon}</span> {q.label}
              </button>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}