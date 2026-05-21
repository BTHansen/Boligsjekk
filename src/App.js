import React from "react";
import { useState } from "react";

const AHUS = { name: "Ahus", lat: 59.9312, lon: 10.9483, maxMin: 35 };
const OSLO_S = { name: "Oslo S", lat: 59.9109, lon: 10.7502, maxMin: 25 };

const ENTUR_GEOCODE = "https://api.entur.io/geocoder/v1/autocomplete";
const ENTUR_JOURNEY = "https://api.entur.io/journey-planner/v3/graphql";

const JOURNEY_QUERY = `
query ($from: Location!, $to: Location!, $dateTime: DateTime!) {
  trip(
    from: $from
    to: $to
    dateTime: $dateTime
    numTripPatterns: 3
    transportModes: [
      { transportMode: bus },
      { transportMode: rail },
      { transportMode: metro },
      { transportMode: tram }
    ]
  ) {
    tripPatterns {
      duration
      legs {
        mode
        line { publicCode }
      }
    }
  }
}`;

async function geocode(address) {
  const url = `${ENTUR_GEOCODE}?text=${encodeURIComponent(address + ", Norge")}&size=1&layers=address,venue`;
  const res = await fetch(url, { headers: { "ET-Client-Name": "boligsjekk-privat" } });
  const data = await res.json();
  const feat = data.features?.[0];
  if (!feat) throw new Error("Fant ikke adressen");
  const [lon, lat] = feat.geometry.coordinates;
  return { lat, lon, label: feat.properties.label };
}

async function getTravelTime(fromLat, fromLon, toLat, toLon) {
  const now = new Date();
  now.setHours(8, 0, 0, 0);
  const dateTime = now.toISOString();

  const res = await fetch(ENTUR_JOURNEY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ET-Client-Name": "boligsjekk-privat",
    },
    body: JSON.stringify({
      query: JOURNEY_QUERY,
      variables: {
        from: { coordinates: { latitude: fromLat, longitude: fromLon } },
        to: { coordinates: { latitude: toLat, longitude: toLon } },
        dateTime,
      },
    }),
  });
  const data = await res.json();
  const patterns = data.data?.trip?.tripPatterns;
  if (!patterns?.length) return null;
  const minDuration = Math.min(...patterns.map((p) => p.duration));
  return Math.round(minDuration / 60);
}

const statusColor = (mins, max) => {
  if (mins === null) return "#555";
  if (mins <= max) return "#4edb8a";
  if (mins <= max + 5) return "#f0a04b";
  return "#e05a5a";
};

const statusIcon = (mins, max) => {
  if (mins === null) return "?";
  if (mins <= max) return "✓";
  if (mins <= max + 5) return "~";
  return "✗";
};

export default function App() {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState([]);

  const check = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError("");
    setLabel("");
    try {
      const loc = await geocode(address);
      setLabel(loc.label);
      const [ahusMin, osloMin] = await Promise.all([
        getTravelTime(loc.lat, loc.lon, AHUS.lat, AHUS.lon),
        getTravelTime(loc.lat, loc.lon, OSLO_S.lat, OSLO_S.lon),
      ]);
      const entry = {
        id: Date.now(),
        address: loc.label,
        ahus: ahusMin,
        oslo: osloMin,
        ok: ahusMin !== null && osloMin !== null && ahusMin <= AHUS.maxMin && osloMin <= OSLO_S.maxMin,
      };
      setResults((prev) => [entry, ...prev]);
    } catch (e) {
      setError(e.message || "Noe gikk galt");
    }
    setLoading(false);
  };

  const save = (entry) => {
    if (!saved.find((s) => s.id === entry.id)) setSaved((prev) => [entry, ...prev]);
  };

  const remove = (id) => setResults((prev) => prev.filter((r) => r.id !== id));

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0f1a",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#d4e5f7",
      padding: "28px 16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Epilogue:wght@700;900&display=swap');
        * { box-sizing: border-box; }
        input { outline: none; }
        input:focus { border-color: #4a9eed !important; }
        .check-btn {
          background: #4a9eed;
          color: #0a0f1a;
          border: none;
          border-radius: 6px;
          padding: 0 20px;
          height: 48px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .check-btn:hover { background: #7eb8f7; }
        .check-btn:disabled { background: #2a3a4e; color: #556; cursor: not-allowed; }
        .card {
          background: rgba(255,255,255,0.04);
          border: 1px solid #1e3050;
          border-radius: 10px;
          padding: 16px 18px;
          margin-bottom: 10px;
          transition: border-color 0.2s;
        }
        .card.ok { border-left: 3px solid #4edb8a; }
        .card.fail { border-left: 3px solid #e05a5a; }
        .save-btn {
          background: transparent;
          border: 1px solid #2a4060;
          color: #7eb8f7;
          border-radius: 4px;
          padding: 4px 10px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .save-btn:hover { border-color: #4a9eed; color: #e8f4fd; }
        .del-btn {
          background: transparent;
          border: none;
          color: #3a5070;
          font-size: 16px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
          transition: color 0.15s;
        }
        .del-btn:hover { color: #e05a5a; }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 20px;
          padding: 3px 10px;
          font-size: 12px;
          font-weight: 500;
        }
      `}</style>

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "#4a9eed", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 6px" }}>
            Entur Journey Planner API
          </p>
          <h1 style={{
            fontFamily: "'Epilogue', sans-serif",
            fontSize: "clamp(20px, 5vw, 30px)",
            fontWeight: 900,
            margin: "0 0 4px",
            lineHeight: 1.1,
          }}>
            Boligsjekk<span style={{ color: "#4a9eed" }}>.</span>
          </h1>
          <p style={{ color: "#5a7a9a", fontSize: 12, margin: 0 }}>
            Sjekk reisetid til Ahus (maks 35 min) og Oslo S (maks 25 min)
          </p>
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && check()}
            placeholder="Lim inn adresse fra Finn.no…"
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid #2a4060",
              borderRadius: 6,
              padding: "0 14px",
              height: 48,
              color: "#e8f4fd",
              fontSize: 13,
              fontFamily: "'DM Mono', monospace",
            }}
          />
          <button className="check-btn" onClick={check} disabled={loading || !address.trim()}>
            {loading ? "Sjekker…" : "Sjekk"}
          </button>
        </div>

        {label && (
          <p style={{ fontSize: 11, color: "#4a9eed", marginBottom: 16 }}>
            📍 {label}
          </p>
        )}
        {error && (
          <p style={{ fontSize: 12, color: "#e05a5a", marginBottom: 16 }}>
            ⚠ {error}
          </p>
        )}

        {/* Criteria reminder */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(74,158,237,0.1)", border: "1px solid #1e3a58", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#7eb8f7" }}>
            🏥 Ahus — maks 35 min
          </div>
          <div style={{ background: "rgba(74,158,237,0.1)", border: "1px solid #1e3a58", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#7eb8f7" }}>
            🚉 Oslo S — maks 25 min
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
              Sjekket
            </p>
            {results.map((r) => (
              <div key={r.id} className={`card ${r.ok ? "ok" : "fail"}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: "#e8f4fd", wordBreak: "break-word" }}>
                      {r.address}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="pill" style={{
                        background: `${statusColor(r.ahus, AHUS.maxMin)}22`,
                        border: `1px solid ${statusColor(r.ahus, AHUS.maxMin)}55`,
                        color: statusColor(r.ahus, AHUS.maxMin),
                      }}>
                        {statusIcon(r.ahus, AHUS.maxMin)} Ahus {r.ahus !== null ? `${r.ahus} min` : "ukjent"}
                      </span>
                      <span className="pill" style={{
                        background: `${statusColor(r.oslo, OSLO_S.maxMin)}22`,
                        border: `1px solid ${statusColor(r.oslo, OSLO_S.maxMin)}55`,
                        color: statusColor(r.oslo, OSLO_S.maxMin),
                      }}>
                        {statusIcon(r.oslo, OSLO_S.maxMin)} Oslo S {r.oslo !== null ? `${r.oslo} min` : "ukjent"}
                      </span>
                      {r.ok && (
                        <span className="pill" style={{ background: "#4edb8a22", border: "1px solid #4edb8a55", color: "#4edb8a" }}>
                          ✓ Treffer begge krav
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <button className="save-btn" onClick={() => save(r)}>Lagre</button>
                    <button className="del-btn" onClick={() => remove(r.id)}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Saved */}
        {saved.length > 0 && (
          <div>
            <p style={{ fontSize: 11, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
              Favoritter
            </p>
            {saved.map((r) => (
              <div key={r.id} style={{
                background: "rgba(78,219,138,0.05)",
                border: "1px solid #2a5a3a",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 8,
              }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#e8f4fd" }}>{r.address}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="pill" style={{ background: "#4edb8a22", border: "1px solid #4edb8a44", color: "#4edb8a", fontSize: 11 }}>
                    Ahus {r.ahus} min
                  </span>
                  <span className="pill" style={{ background: "#4edb8a22", border: "1px solid #4edb8a44", color: "#4edb8a", fontSize: 11 }}>
                    Oslo S {r.oslo} min
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#2a4060" }}>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>🏠</p>
            <p style={{ fontSize: 12 }}>Lim inn en adresse fra Finn.no og trykk Sjekk</p>
          </div>
        )}

        <p style={{ fontSize: 10, color: "#2a3a4e", marginTop: 24, textAlign: "center" }}>
          Reisetider beregnet av Entur · Avganger kl. 08:00 hverdager · Kan avvike fra faktisk reisetid
        </p>
      </div>
    </div>
  );
}
