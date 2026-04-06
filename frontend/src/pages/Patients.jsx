// pages/Patients.jsx
import React, { useState, useEffect, useRef } from "react";
import { useApi, apiPatch } from "../hooks/useApi.js";
import { Card, Badge, Avatar, Spinner, ErrorState, SectionHeader } from "../components/ui.jsx";

// ── Patient Detail Modal ──────────────────────────────────────────────────────
function PatientModal({ patientId, onClose, onStatusChange }) {
  // Single patient → data is the patient object directly
  const { data: patient, loading, error, refetch } = useApi(`/patients/${patientId}`);
  const [updating, setUpdating] = useState(false);
  const overlayRef = useRef();

  // Close on overlay click
  useEffect(() => {
    function handler(e) {
      if (e.target === overlayRef.current) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function changeStatus(status) {
    setUpdating(true);
    await apiPatch(`/patients/${patientId}/status`, { status });
    setUpdating(false);
    refetch();
    onStatusChange();
  }

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(10,22,40,0.65)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200, padding: 24,
      }}
    >
      <div style={{
        background: "var(--white)", borderRadius: "var(--radius-lg)",
        width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
      }}>
        {loading && <Spinner />}
        {error   && <ErrorState message={error} />}
        {!loading && !error && patient && (
          <>
            {/* Sticky header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "20px 24px", borderBottom: "1px solid var(--border)",
              position: "sticky", top: 0, background: "var(--white)", zIndex: 10,
            }}>
              <Avatar initials={patient.avatar || "??"} hue={patient.hue || "#2563EB"} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 600, color: "var(--text-1)" }}>
                  {patient.firstName} {patient.lastName}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
                  {patient.mrn} · Age {patient.age} · {patient.gender}
                </div>
              </div>
              <Badge value={patient.status} />
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 6,
                  border: "1px solid var(--border)", background: "transparent",
                  color: "var(--text-3)", fontSize: 18, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1,
                }}
              >✕</button>
            </div>

            {/* Body grid */}
            <div style={{ padding: "22px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>

              <InfoSection title="Admission Details">
                <InfoRow label="Primary Diagnosis"    value={patient.primaryDiagnosis} />
                <InfoRow label="ICD-10 Code"           value={patient.icdCode} mono />
                <InfoRow label="Ward"                  value={patient.ward} />
                <InfoRow label="Room"                  value={patient.room} />
                <InfoRow label="Attending Physician"   value={patient.attendingPhysician} />
                <InfoRow label="Admitted"              value={patient.admittedDate} />
                {patient.dischargedDate && <InfoRow label="Discharged" value={patient.dischargedDate} />}
              </InfoSection>

              <InfoSection title="Insurance & Billing">
                <InfoRow label="Provider"  value={patient.insurance?.provider} />
                <InfoRow label="Plan"      value={patient.insurance?.plan} />
                <InfoRow label="Member ID" value={patient.insurance?.memberId} mono />
              </InfoSection>

              <InfoSection title="Latest Vitals">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                  {Object.entries(patient.vitals || {}).map(([key, val]) => {
                    const labels = { bp: "Blood Pressure", hr: "Heart Rate", temp: "Temperature", o2: "O₂ Saturation", weight: "Weight" };
                    return (
                      <div key={key} style={{
                        background: "var(--surface)", borderRadius: 8,
                        padding: "8px 12px", border: "1px solid var(--border)",
                      }}>
                        <div style={{ fontSize: 10, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>
                          {labels[key] || key}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{val}</div>
                      </div>
                    );
                  })}
                </div>
              </InfoSection>

              <InfoSection title="Patient Contact">
                <InfoRow label="Phone" value={patient.phone} />
                <InfoRow label="Email" value={patient.email} />
                <InfoRow label="Address" value={
                  patient.address
                    ? `${patient.address.street}, ${patient.address.city}, ${patient.address.state} ${patient.address.zip}`
                    : "—"
                } />
              </InfoSection>

              {patient.allergies?.length > 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: "var(--text-3)",
                    textTransform: "uppercase", letterSpacing: "0.5px",
                    marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid var(--border)",
                  }}>
                    ⚠️ Documented Allergies
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {patient.allergies.map((a, i) => (
                      <span key={i} style={{
                        fontSize: 12, padding: "4px 12px", borderRadius: 20,
                        background: "var(--amber-light)", color: "var(--amber)",
                        fontWeight: 500, border: "1px solid #FDE68A",
                      }}>{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status controls */}
            <div style={{
              padding: "14px 24px 20px", borderTop: "1px solid var(--border)",
              display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>Update Status:</span>
              {["active", "critical", "discharged"]
                .filter(s => s !== patient.status)
                .map(s => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    disabled={updating}
                    style={{
                      fontSize: 12, padding: "7px 16px", borderRadius: 6,
                      border: "1px solid var(--border-dark)",
                      background: updating ? "var(--border)" : "var(--surface)",
                      color: "var(--text-2)", fontWeight: 500, cursor: updating ? "not-allowed" : "pointer",
                      textTransform: "capitalize", fontFamily: "inherit",
                    }}
                  >
                    {updating ? "Saving…" : `Mark ${s}`}
                  </button>
                ))
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: "var(--text-3)",
        textTransform: "uppercase", letterSpacing: "0.5px",
        marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)",
      }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
      <span style={{ color: "var(--text-3)", flexShrink: 0 }}>{label}</span>
      <span style={{
        color: "var(--text-1)", fontWeight: 500, textAlign: "right",
        fontFamily: mono ? "monospace" : "inherit",
        fontSize: mono ? 12 : 13, wordBreak: "break-word",
      }}>{value || "—"}</span>
    </div>
  );
}

// ── Patients Page ─────────────────────────────────────────────────────────────
export default function Patients() {
  const [searchInput, setSearchInput] = useState("");
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("all");
  const [selected,    setSelected]    = useState(null);

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Build query — re-fetches whenever search/filter changes
  const params = new URLSearchParams({ status: filter });
  if (search) params.set("search", search);
  const query = params.toString();

  // data → array of patients, total → count
  const { data: patients, total, loading, error, refetch } = useApi(`/patients?${query}`);
  const patientList = Array.isArray(patients) ? patients : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Detail modal */}
      {selected && (
        <PatientModal
          patientId={selected}
          onClose={() => setSelected(null)}
          onStatusChange={() => { setSelected(null); refetch(); }}
        />
      )}

      <SectionHeader
        title="Patient Registry"
        subtitle={`${total ?? patientList.length} patient${(total ?? patientList.length) !== 1 ? "s" : ""} · Mass General Hospital`}
      />

      {/* Search & filter bar */}
      <Card style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>

          {/* Search input */}
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <svg
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-4)", pointerEvents: "none" }}
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by name, diagnosis, MRN, ward…"
              style={{
                width: "100%", padding: "9px 36px 9px 36px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-dark)",
                fontSize: 13, background: "var(--white)",
                color: "var(--text-1)", transition: "border-color 0.15s",
                fontFamily: "inherit",
              }}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); }}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "var(--text-4)",
                  fontSize: 14, cursor: "pointer", padding: "2px 4px", lineHeight: 1,
                }}
              >✕</button>
            )}
          </div>

          {/* Filter buttons */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { val: "all",        label: "All Patients" },
              { val: "active",     label: "Active"       },
              { val: "critical",   label: "Critical"     },
              { val: "discharged", label: "Discharged"   },
            ].map(f => (
              <button
                key={f.val}
                onClick={() => setFilter(f.val)}
                style={{
                  padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit",
                  border:     filter === f.val ? "1px solid var(--blue)"       : "1px solid var(--border-dark)",
                  background: filter === f.val ? "var(--blue-light)"           : "transparent",
                  color:      filter === f.val ? "var(--blue)"                 : "var(--text-2)",
                  fontWeight: filter === f.val ? 600 : 400,
                }}
              >{f.label}</button>
            ))}
          </div>
        </div>
      </Card>

      {/* Result count */}
      <div style={{ fontSize: 13, color: "var(--text-4)", marginTop: -8 }}>
        {loading
          ? "Searching…"
          : `${total ?? patientList.length} result${(total ?? patientList.length) !== 1 ? "s" : ""}${search ? ` for "${search}"` : ""}`
        }
      </div>

      {/* States */}
      {loading && <Spinner />}
      {error   && <ErrorState message={error} />}

      {!loading && !error && patientList.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>No patients found</div>
          <div style={{ fontSize: 13, color: "var(--text-4)" }}>Try a different name, MRN, or remove a filter.</div>
        </div>
      )}

      {/* Patient table */}
      {!loading && !error && patientList.length > 0 && (
        <div>
          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.6fr 1fr 1.3fr 88px 100px",
            gap: 12, padding: "0 16px 8px",
            fontSize: 11, fontWeight: 600,
            color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            <span>Patient</span>
            <span>Diagnosis</span>
            <span>Ward</span>
            <span>Physician</span>
            <span>Admitted</span>
            <span>Status</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {patientList.map(p => (
              <Card
                key={p.id}
                style={{ padding: "13px 16px", cursor: "pointer", transition: "border-color 0.12s, box-shadow 0.12s" }}
                onClick={() => setSelected(p.id)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "var(--blue)";
                  e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(29,78,216,0.08)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow   = "var(--shadow-sm)";
                }}
              >
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.6fr 1fr 1.3fr 88px 100px",
                  gap: 12, alignItems: "center",
                }}>
                  {/* Patient */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar initials={p.avatar || "??"} hue={p.hue || "#2563EB"} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace" }}>{p.mrn} · {p.gender}, {p.age}y</div>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.primaryDiagnosis}</div>
                    <div style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace" }}>{p.icdCode}</div>
                  </div>

                  {/* Ward */}
                  <div style={{ fontSize: 13, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.ward}</div>

                  {/* Physician */}
                  <div style={{ fontSize: 12, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.attendingPhysician}</div>

                  {/* Admitted */}
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>{p.admittedDate}</div>

                  {/* Status */}
                  <div><Badge value={p.status} /></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}