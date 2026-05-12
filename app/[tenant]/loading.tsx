export default function TenantLoading() {
  return (
    <div>
      <section className="page-header">
        <div className="page-header-inner">
          <span className="skel" style={{ width: 90, height: 12, marginBottom: 14 }} />
          <span className="skel" style={{ width: 280, height: 36, marginBottom: 16 }} />
          <span className="skel" style={{ width: 460, height: 16 }} />
        </div>
      </section>
      <section className="section">
        <div className="container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span className="skel" style={{ width: "100%", height: 180 }} />
          <span className="skel" style={{ width: "100%", height: 120 }} />
          <span className="skel" style={{ width: "100%", height: 120 }} />
        </div>
      </section>
    </div>
  );
}
