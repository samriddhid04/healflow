// pages/OtherPages.jsx
import React from "react";
import { useApi, apiPatch } from "../hooks/useApi.js";
import { Card, Badge, Spinner, ErrorState, SectionHeader } from "../components/ui.jsx";

// ── SCHEDULE ──────────────────────────────────────────────────────────────────
export function Schedule() {
  const TODAY = new Date().toISOString().split("T")[0];
  const { data, loading, error, refetch } = useApi(`/appointments?date=${TODAY}`);

  // data is already the array (unwrapped by useApi)
  const appointments = Array.isArray(data) ? data : [];

  async function updateStatus(id, status) {
    await apiPatch(`/appointments/${id}/status`, { status });
    refetch();
  }

  const statusOrder = { "in-progress": 0, upcoming: 1, completed: 2, cancelled: 3 };
  const sorted = [...appointments].sort((a, b) => {
    const diff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    return diff !== 0 ? diff : a.time.localeCompare(b.time);
  });

  const counts = {
    inProgress: appointments.filter(a => a.status === "in-progress").length,
    upcoming:   appointments.filter(a => a.status === "upcoming").length,
    completed:  appointments.filter(a => a.status === "completed").length,
  };

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionHeader
        title="Today's Schedule"
        subtitle={`${appointments.length} appointments · ${todayLabel}`}
      />

      {/* Summary chips */}
      {!loading && !error && (
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "In Progress", count: counts.inProgress, bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
            { label: "Upcoming",    count: counts.upcoming,   bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
            { label: "Completed",   count: counts.completed,  bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
          ].map(c => (
            <div key={c.label} style={{
              padding: "8px 16px", borderRadius: 8,
              background: c.bg, color: c.text,
              border: `1px solid ${c.border}`,
              fontSize: 13, fontWeight: 500,
            }}>
              <span style={{ fontWeight: 700, marginRight: 6 }}>{c.count}</span>{c.label}
            </div>
          ))}
        </div>
      )}

      {loading && <Spinner />}
      {error   && <ErrorState message={error} />}

      {!loading && !error && appointments.length === 0 && (
        <Card style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>No appointments today</div>
          <div style={{ fontSize: 13, color: "var(--text-4)" }}>
            Date: {TODAY} — no appointments found for this date.
          </div>
        </Card>
      )}

      {!loading && !error && sorted.length > 0 && (
        <Card>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "70px 1.4fr 1.4fr 1.3fr 90px 70px 160px",
            gap: 12, padding: "12px 20px",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            fontSize: 11, fontWeight: 600,
            color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            <span>Time</span>
            <span>Patient</span>
            <span>Type</span>
            <span>Provider</span>
            <span>Room</span>
            <span>Dur.</span>
            <span>Status</span>
          </div>

          {sorted.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1.4fr 1.4fr 1.3fr 90px 70px 160px",
                gap: 12, padding: "14px 20px", alignItems: "center",
                borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none",
                background:
                  a.status === "in-progress" ? "rgba(251,191,36,0.04)" :
                  a.status === "completed"   ? "rgba(21,128,61,0.03)"  : "transparent",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: a.status === "completed" ? "var(--text-4)" : "var(--text-1)", fontVariantNumeric: "tabular-nums" }}>
                {a.time}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: a.status === "completed" ? "var(--text-3)" : "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.patientName}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.type}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.provider}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{a.room}</div>
              <div style={{ fontSize: 12, color: "var(--text-4)" }}>{a.duration}m</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge type="appt" value={a.status} />
                {a.status === "upcoming" && (
                  <button
                    onClick={() => updateStatus(a.id, "in-progress")}
                    style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, border: "none", background: "var(--blue)", color: "#fff", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
                  >Start</button>
                )}
                {a.status === "in-progress" && (
                  <button
                    onClick={() => updateStatus(a.id, "completed")}
                    style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, border: "none", background: "#15803D", color: "#fff", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
                  >Done ✓</button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── LABS ──────────────────────────────────────────────────────────────────────
export function Labs() {
  const { data, loading, error } = useApi("/labs");
  const labs = Array.isArray(data) ? data : [];

  const flagged  = labs.filter(l => l.flagged);
  const critical = labs.filter(l => l.status === "critical");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionHeader
        title="Lab Results"
        subtitle={`${labs.length} results · ${flagged.length} flagged for review`}
      />

      {!loading && critical.length > 0 && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--red-light)", border: "1px solid #FECACA", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 16 }}>🚨</span>
          <span style={{ fontSize: 13, color: "var(--red)", fontWeight: 600 }}>
            {critical.length} critical result{critical.length !== 1 ? "s" : ""} — immediate physician review required
          </span>
        </div>
      )}

      {!loading && flagged.length > 0 && critical.length === 0 && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--amber-light)", border: "1px solid #FDE68A", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 13, color: "var(--amber)", fontWeight: 500 }}>
            {flagged.length} result{flagged.length !== 1 ? "s" : ""} flagged for physician review
          </span>
        </div>
      )}

      {loading && <Spinner />}
      {error   && <ErrorState message={error} />}

      {!loading && !error && (
        <Card>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 1.4fr 110px 140px 1.1fr 90px 36px",
            gap: 12, padding: "12px 20px",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            fontSize: 11, fontWeight: 600,
            color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            <span>Patient</span>
            <span>Test</span>
            <span>Result</span>
            <span>Reference Range</span>
            <span>Ordered By</span>
            <span>Status</span>
            <span></span>
          </div>

          {labs.map((l, i) => (
            <div
              key={l.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 1.4fr 110px 140px 1.1fr 90px 36px",
                gap: 12, padding: "14px 20px", alignItems: "center",
                borderBottom: i < labs.length - 1 ? "1px solid var(--border)" : "none",
                background:
                  l.status === "critical" ? "rgba(185,28,28,0.03)" :
                  l.status === "abnormal" ? "rgba(180,83,9,0.02)"  : "transparent",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.patientName}</div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>{l.test}</div>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: l.status === "critical" ? "var(--red)" : l.status === "abnormal" ? "var(--amber)" : "var(--text-1)",
              }}>{l.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{l.reference}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.orderedBy}</div>
              <Badge type="lab" value={l.status} />
              <div style={{ textAlign: "center", fontSize: 14 }}>{l.flagged ? "🚩" : ""}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── MESSAGES ──────────────────────────────────────────────────────────────────
export function Messages() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 420, gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>💬</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "var(--text-1)" }}>Secure Messaging</div>
      <div style={{ fontSize: 14, color: "var(--text-4)", textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
        HIPAA-compliant internal messaging between care team members.<br/>Coming in the next release.
      </div>
    </div>
  );
}