// components/Sidebar.jsx
import React from "react";

const NAV = [
  { id: "dashboard",    label: "Dashboard",    icon: DashIcon  },
  { id: "patients",     label: "Patients",     icon: PatientIcon },
  { id: "schedule",     label: "Schedule",     icon: CalIcon   },
  { id: "labs",         label: "Lab Results",  icon: LabIcon   },
  { id: "messages",     label: "Messages",     icon: MsgIcon   },
];

function DashIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function PatientIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function CalIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function LabIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-5 5h16l-5-5V3"/></svg>; }
function MsgIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function PulseIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>; }

export default function Sidebar({ page, setPage }) {
  return (
    <aside style={{
      width: 230, flexShrink: 0,
      background: "var(--navy)",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 22px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
          }}>
            <PulseIcon />
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: "#fff", letterSpacing: "-0.2px" }}>HealFlow</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "1px", textTransform: "uppercase" }}>Clinical Suite</div>
          </div>
        </div>
      </div>

      {/* Facility badge */}
      <div style={{ padding: "12px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Facility</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Mass General Hospital</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Boston, MA · NPI 1234567890</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "14px 12px" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", padding: "0 10px", marginBottom: 8 }}>Main Menu</div>
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => setPage(id)} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "10px 12px", borderRadius: 8,
              background: active ? "rgba(255,255,255,0.1)" : "transparent",
              border: active ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
              color: active ? "#fff" : "rgba(255,255,255,0.5)",
              fontSize: 13, fontWeight: active ? 500 : 400,
              marginBottom: 2, textAlign: "left", transition: "all 0.15s",
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              <Icon />
              {label}
            </button>
          );
        })}
      </nav>

      {/* HIPAA notice */}
      <div style={{ padding: "10px 16px", margin: "0 12px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
          🔒 HIPAA Compliant · Encrypted<br />All data access is logged & audited
        </div>
      </div>

      {/* Physician */}
      <div style={{ padding: "14px 16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#93C5FD", flexShrink: 0 }}>JW</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Dr. James Whitfield</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Cardiology · Attending</div>
          </div>
        </div>
      </div>
    </aside>
  );
}