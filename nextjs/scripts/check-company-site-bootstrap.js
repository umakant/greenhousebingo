fetch("http://localhost:5000/sites/DN-0001-CO-26/events")
  .then((r) => r.text())
  .then((h) => {
    const m = h.match(/id="pbs-company-site-events-config"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) {
      console.log("no config");
      return;
    }
    const c = JSON.parse(m[1]);
    console.log("bootstrap events:", c.bootstrap?.list?.events?.length);
    console.log("pathname:", c.pathname);
    console.log("has state groups mount:", h.includes("mt-16 space-y-16"));
  });
