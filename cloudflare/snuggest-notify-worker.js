const SITE = "https://ozgadk.github.io";

export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": SITE,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST" || req.headers.get("Origin") !== SITE)
      return new Response("forbidden", { status: 403 });

    let b;
    try { b = await req.json(); } catch { return new Response("bad", { status: 400, headers: cors }); }

    const esc = (s, n = 60) => String(s ?? "").slice(0, n).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
    let text;

    if (b.type === "report") {
      // Gün sonu raporu
      text = esc(b.text, 3000);
      if (!text) return new Response("bad", { status: 400, headers: cors });
    } else {
      // QR sipariş
      const table = String(b.table || "");
      const lines = Array.isArray(b.lines) ? b.lines.slice(0, 40) : [];
      if (!/^\d{1,3}$/.test(table) || !lines.length)
        return new Response("bad", { status: 400, headers: cors });
      const rows = lines.map((l) => {
        const q = Math.min(20, Math.max(1, parseInt(l.q, 10) || 1));
        return `${q}× ${esc(l.name)}${l.l ? " (" + esc(l.l) + ")" : ""}`;
      });
      text = `🔔 <b>Masa ${table}</b>${b.who ? " · 👤 " + esc(b.who, 20) : ""} — QR sipariş\n` + rows.join("\n") +
        (b.note ? `\n📝 <i>${esc(b.note, 200)}</i>` : "") +
        (b.total ? `\n<b>Toplam: ${esc(b.total)}</b>` : "");
    }

    const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TG_CHAT, text, parse_mode: "HTML" }),
    });
    return new Response(r.ok ? "ok" : "telegram error", { status: r.ok ? 200 : 502, headers: cors });
  },
};
