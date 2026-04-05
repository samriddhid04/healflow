// App.jsx
import React, { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Patients from "./pages/Patients.jsx";
import { Schedule, Labs, Messages } from "./pages/Otherpages.jsx";

export default function App() {
  const [page, setPage] = useState("dashboard");

  const pages = {
    dashboard: <Dashboard setPage={setPage} />,
    patients:  <Patients />,
    schedule:  <Schedule />,
    labs:      <Labs />,
    messages:  <Messages />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface)" }}>
      <Sidebar page={page} setPage={setPage} />
      <main style={{
        flex: 1,
        padding: "32px 36px",
        overflowY: "auto",
        maxWidth: 1200,
      }}>
        {pages[page]}
      </main>
    </div>
  );
}