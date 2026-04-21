import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const CONSENT_COLOURS = {
  'Consented':            { bg: '#1a7a4a' },
  'In deliberation':      { bg: '#b45309' },
  'Declined':             { bg: '#922B21' },
  'Withdrawn':            { bg: '#922B21' },
  'Initial contact made': { bg: '#1B3A4B' },
  'Not yet approached':   { bg: '#6B6B6B' },
  'Not recorded':         { bg: '#9CA3AF' },
};

function ConsentBadge({ status }) {
  const col = CONSENT_COLOURS[status] || CONSENT_COLOURS['Not recorded'];
  return (
    <span style={{ background: col.bg, color: '#fff', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {status || 'Not recorded'}
    </span>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '20px 24px', border: '1px solid #DDD5C4', borderTop: `4px solid ${accent || '#1B3A4B'}` }}>
      <div style={{ fontSize: '28px', fontWeight: 800, color: '#1B3A4B', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginTop: '4px' }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ onClose }) {
  const [reports, setReports]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState({ region: '', consent: '', lead: '' });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [rRes, sRes] = await Promise.all([
          fetch(`${API_BASE}/api/reports`),
          fetch(`${API_BASE}/api/reports/summary`),
        ]);
        if (!rRes.ok || !sRes.ok) throw new Error('Failed to load data');
        const [rData, sData] = await Promise.all([rRes.json(), sRes.json()]);
        setReports(rData);
        setSummary(sData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const regions = [...new Set(reports.map(r => r.region).filter(Boolean))];
  const leads   = [...new Set(reports.map(r => r.worker_name).filter(Boolean))];

  const filtered = reports.filter(r => {
    if (filter.region  && r.region         !== filter.region)  return false;
    if (filter.consent && r.consent_status !== filter.consent) return false;
    if (filter.lead    && r.worker_name    !== filter.lead)    return false;
    return true;
  });

  const consentCounts  = reports.reduce((acc, r) => {
    const k = r.consent_status || 'Not recorded';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const uniqueGroups = new Set(reports.map(r => r.to_group).filter(Boolean)).size;

  if (loading) return (
    <div className="dashboard-overlay" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ color: '#1B3A4B', fontSize: '18px' }}>Loading program data…</div>
    </div>
  );

  if (error) return (
    <div className="dashboard-overlay" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#922B21' }}>Could not load dashboard: {error}</p>
        <button onClick={onClose} style={{ marginTop: '16px', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#1B3A4B', color: '#fff' }}>Back</button>
      </div>
    </div>
  );

  return (
    <div className="dashboard-overlay">
      <div className="dashboard-panel">

        <div style={{ background: '#1B3A4B', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '18px' }}>📊 Supervisor Dashboard</div>
            <div style={{ color: '#94b5c5', fontSize: '12px', marginTop: '2px' }}>GBR Traditional Owner-Led Water Quality Improvement Program</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '14px' }}>
            ← Field View
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <StatCard label="Total Engagements" value={summary?.totalEngagements ?? reports.length} accent="#1B3A4B" />
            <StatCard label="TO Groups Contacted" value={uniqueGroups} sub="unique groups" accent="#2E75B6" />
            <StatCard label="Consented" value={consentCounts['Consented'] || 0} accent="#1a7a4a" />
            <StatCard label="In Deliberation" value={consentCounts['In deliberation'] || 0} accent="#b45309" />
            <StatCard label="Regional Leads" value={leads.length} sub="active" accent="#6B3FA0" />
          </div>

          {summary?.byRegion && Object.keys(summary.byRegion).length > 0 && (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #DDD5C4', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>By Region</div>
              {Object.entries(summary.byRegion).map(([region, data]) => (
                <div key={region} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0ece4' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1B3A4B' }}>{region}</div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{data.uniqueGroups} groups</span>
                    <span style={{ fontSize: '12px', color: '#888' }}>{data.total} engagements</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select value={filter.region} onChange={e => setFilter(f => ({ ...f, region: e.target.value }))} style={sel}>
              <option value="">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filter.consent} onChange={e => setFilter(f => ({ ...f, consent: e.target.value }))} style={sel}>
              <option value="">All Consent Status</option>
              {Object.keys(CONSENT_COLOURS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filter.lead} onChange={e => setFilter(f => ({ ...f, lead: e.target.value }))} style={sel}>
              <option value="">All Leads</option>
              {leads.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {(filter.region || filter.consent || filter.lead) && (
              <button onClick={() => setFilter({ region: '', consent: '', lead: '' })} style={{ background: 'none', border: '1px solid #DDD5C4', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                Clear
              </button>
            )}
          </div>

          <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
            {filtered.length} engagement{filtered.length !== 1 ? 's' : ''}
          </div>

          {filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#888', border: '1px solid #DDD5C4' }}>
              No engagements recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map(r => (
                <div key={r.id} onClick={() => setSelected(selected?.id === r.id ? null : r)}
                  style={{ background: '#fff', borderRadius: '10px', padding: '14px 16px', border: '1px solid #DDD5C4', cursor: 'pointer', borderLeft: `4px solid ${CONSENT_COLOURS[r.consent_status]?.bg || '#DDD5C4'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#1B3A4B' }}>{r.to_group || 'Group not specified'}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{r.region} · {r.worker_name} · {r.date}</div>
                      {r.topics_discussed && (
                        <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
                          {r.topics_discussed.split(' | ').slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>
                    <ConsentBadge status={r.consent_status} />
                  </div>
                  {selected?.id === r.id && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0ece4', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                      {r.engagement_type && <div><span style={{ color: '#888' }}>Type: </span>{r.engagement_type}</div>}
                      {r.attendees       && <div><span style={{ color: '#888' }}>Attendees: </span>{r.attendees}</div>}
                      {r.consent_notes   && <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#888' }}>Consent notes: </span>{r.consent_notes}</div>}
                      {r.cultural_protocol_notes && (
                        <div style={{ gridColumn: '1/-1', background: '#FFF8E7', padding: '8px', borderRadius: '6px', borderLeft: '3px solid #C9A96E' }}>
                          <span style={{ color: '#888' }}>Cultural protocols: </span>{r.cultural_protocol_notes}
                        </div>
                      )}
                      {r.follow_up_actions && <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#888' }}>Follow-up: </span>{r.follow_up_actions}</div>}
                      {r.next_contact     && <div style={{ gridColumn: '1/-1', color: '#1B3A4B', fontWeight: 600 }}>📅 Next contact: {r.next_contact}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const sel = {
  background: '#fff',
  border: '1px solid #DDD5C4',
  borderRadius: '8px',
  padding: '6px 12px',
  fontSize: '13px',
  color: '#444',
  cursor: 'pointer',
};