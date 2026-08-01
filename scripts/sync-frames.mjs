/**
 * Generates the sample premium frame library (SVG overlays) into public/frames
 * and writes the frames manifest (public/config/frames-manifest.json).
 *
 * Usage:  npm run sync:frames
 * Any .svg / .png you drop into public/frames/... is picked up automatically.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FRAMES_DIR = path.join(ROOT, "public", "frames");
const CONFIG_DIR = path.join(ROOT, "public", "config");

const W = 800;
const H = 1067;

/* ---------- tiny helpers ---------- */

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function wrap(label, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${inner}
</svg>
`;
}

function rectBorder({ x = 18, y = 18, w = W - 36, h = H - 36, color, width = 4, rx = 34, dash = null }) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
}

function doubleBorder(color, color2, dash = null) {
  return rectBorder({ color, width: 5, rx: 36 }) + "\n" + rectBorder({ x: 40, y: 40, w: W - 80, h: H - 80, color: color2, width: 2, rx: 26, dash });
}

function corners({ color, size = 44, inset = 24, width = 6 }) {
  const mk = (x, y, r) => `<path d="M ${x} ${y + size} L ${x + size} ${y + size} L ${x + size} ${y}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" transform="rotate(${r} ${x + size / 2} ${y + size / 2})"/>`;
  const pts = [
    [inset, inset, 0],
    [W - inset - size, inset, 90],
    [W - inset - size, H - inset - size, 180],
    [inset, H - inset - size, 270],
  ];
  return pts.map(([x, y, r]) => mk(x, y, r)).join("\n");
}

function topBand({ text, color, textColor = "#E3C374", fontSize = 40, sub }) {
  return `<g>
  <rect x="0" y="0" width="${W}" height="150" fill="url(#bandGrad)"/>
  <text x="${W / 2}" y="84" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-weight="700" font-size="${fontSize}" letter-spacing="6" fill="${textColor}">${text}</text>
  ${sub ? `<text x="${W / 2}" y="122" text-anchor="middle" font-family="'Inter',sans-serif" font-weight="500" font-size="20" letter-spacing="4" fill="${color}">${sub}</text>` : ""}
</g>`;
}

function defs(colors) {
  const [a, b, c] = colors;
  return `<defs>
  <linearGradient id="bandGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${a}"/>
    <stop offset="0.5" stop-color="${b}"/>
    <stop offset="1" stop-color="${c}"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.35" r="0.9">
    <stop offset="0" stop-color="${b}" stop-opacity="0.5"/>
    <stop offset="1" stop-color="${c}" stop-opacity="0"/>
  </radialGradient>
</defs>`;
}

function glowRect() {
  return `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#glow)"/>`;
}

/* ---------- frame recipes ---------- */

const gold = "#C9A24B";
const goldSoft = "#E3C374";
const navy = "#223669";
const ice = "#EEF2FF";

function recipe(id, name, category, build) {
  return { id, name, category, build };
}

function styleGlass() {
  return [defs(["#ffffff30", "#ffffff10", "#ffffff00"]), glowRect(),
    `<rect x="26" y="26" width="${W - 52}" height="${H - 52}" rx="44" fill="#ffffff10" stroke="#ffffff55" stroke-width="3"/>`,
    `<rect x="46" y="46" width="${W - 92}" height="${H - 92}" rx="32" fill="none" stroke="#ffffff33" stroke-width="1.5" stroke-dasharray="2 10"/>`].join("\n");
}

function styleLuxury() {
  return [defs([`${gold}`, `${goldSoft}`, "#8c6c2a"]), glowRect(),
    corners({ color: goldSoft, size: 56, inset: 30, width: 8 }),
    rectBorder({ color: `${gold}66`, width: 2, rx: 40 }),
    rectBorder({ x: 52, y: 52, w: W - 104, h: H - 104, color: `${goldSoft}33`, width: 1, rx: 30 })].join("\n");
}

function styleCyber() {
  const neon = "#22d3ee";
  return [defs(["#0e7490", "#22d3ee", "#312e81"]), glowRect(),
    `<rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="26" fill="none" stroke="${neon}" stroke-width="4"/>`,
    `<rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="18" fill="none" stroke="${neon}55" stroke-width="1.5" stroke-dasharray="14 8 4 8"/>`,
    corners({ color: "#312e81", size: 40, inset: 30, width: 7 })].join("\n");
}

function styleMinimal() {
  return [defs(["#ffffff", "#d6d9e4", "#9aa3c0"]),
    `<rect x="30" y="30" width="${W - 60}" height="${H - 60}" rx="30" fill="none" stroke="#0b1022" stroke-width="2"/>`,
    `<line x1="60" y1="${H - 60}" x2="${W - 60}" y2="${H - 60}" stroke="#0b1022" stroke-width="2"/>`,
    `<line x1="60" y1="${H - 76}" x2="${W - 60}" y2="${H - 76}" stroke="#0b1022" stroke-width="1" stroke-dasharray="4 6"/>`].join("\n");
}

function styleGradient() {
  return [defs([navy, "#7c5cff", "#22d3ee"]), glowRect(),
    `<rect x="0" y="0" width="${W}" height="14" fill="url(#bandGrad)"/>`,
    `<rect x="0" y="${H - 14}" width="${W}" height="14" fill="url(#bandGrad)"/>`,
    `<rect x="26" y="26" width="${W - 52}" height="${H - 52}" rx="40" fill="none" stroke="#ffffff66" stroke-width="3"/>`].join("\n");
}

function styleGolden() {
  return [defs([gold, goldSoft, "#8c6c2a"]), glowRect(),
    doubleBorder(goldSoft, `${gold}88`, "2 8"),
    `<circle cx="${W / 2}" cy="120" r="46" fill="none" stroke="${goldSoft}" stroke-width="4"/>`,
    `<circle cx="${W / 2}" cy="120" r="34" fill="none" stroke="${goldSoft}" stroke-width="2"/>`,
    `<circle cx="${W / 2}" cy="120" r="8" fill="${goldSoft}"/>`].join("\n");
}

function styleCorporate() {
  return [defs([navy, "#2c4382", navy]),
    `<rect x="40" y="40" width="${W - 80}" height="6" rx="3" fill="#E3C374"/>`,
    `<rect x="40" y="${H - 46}" width="${W - 80}" height="6" rx="3" fill="#E3C374"/>`,
    `<rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="20" fill="none" stroke="#5b7bd6" stroke-width="2"/>`,
    `<text x="${W / 2}" y="${H - 96}" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-weight="600" font-size="30" letter-spacing="10" fill="${ice}">EST. 2026</text>`].join("\n");
}

function styleAurora() {
  return [defs([navy, "#7c5cff", "#22d3ee"]),
    `<ellipse cx="${W * 0.25}" cy="${H * 0.3}" rx="260" ry="150" fill="url(#bandGrad)" opacity="0.18"/>`,
    `<ellipse cx="${W * 0.8}" cy="${H * 0.62}" rx="300" ry="160" fill="url(#bandGrad)" opacity="0.14"/>`,
    `<path d="M 0 ${H * 0.12} C ${W * 0.3} ${H * 0.02}, ${W * 0.6} ${H * 0.2}, ${W} ${H * 0.08}" fill="none" stroke="#7c5cff" stroke-width="3" opacity="0.6"/>`,
    `<path d="M 0 ${H * 0.2} C ${W * 0.3} ${H * 0.08}, ${W * 0.7} ${H * 0.28}, ${W} ${H * 0.16}" fill="none" stroke="#22d3ee" stroke-width="2" opacity="0.5"/>`].join("\n");
}

function styleDark() {
  return [defs(["#ffffff20", "#ffffff0c", "#ffffff00"]),
    `<rect x="30" y="30" width="${W - 60}" height="${H - 60}" rx="28" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.5"/>`,
    `<rect x="44" y="44" width="${W - 88}" height="${H - 88}" rx="20" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.25"/>`,
    `<circle cx="${W / 2}" cy="120" r="30" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.5"/>`].join("\n");
}

function styleDeveloper() {
  const green = "#34d399";
  return [defs(["#0f172a", "#1e293b", "#0b1022"]),
    `<rect x="26" y="26" width="${W - 52}" height="${H - 52}" rx="30" fill="none" stroke="${green}" stroke-width="3"/>`,
    `<rect x="40" y="40" width="${W - 80}" height="52" rx="10" fill="${green}22" stroke="${green}88" stroke-width="1.5"/>`,
    `<text x="${W / 2}" y="73" text-anchor="middle" font-family="'JetBrains Mono','Inter',monospace" font-weight="700" font-size="26" fill="${green}" letter-spacing="2">&lt;/&gt; 2026</text>`,
    `<circle cx="${W / 2}" cy="${H - 90}" r="14" fill="none" stroke="${green}" stroke-width="3"/>`,
    `<circle cx="${W / 2}" cy="${H - 90}" r="5" fill="${green}"/>`].join("\n");
}

function styleFutureEngineer() {
  return [defs([navy, "#22d3ee", "#7c5cff"]), glowRect(),
    `<circle cx="${W / 2}" cy="${H / 2}" r="150" fill="none" stroke="#22d3ee" stroke-width="1.5" stroke-dasharray="6 10"/>`,
    `<circle cx="${W / 2}" cy="${H / 2}" r="118" fill="none" stroke="#7c5cff" stroke-width="2" opacity="0.8"/>`,
    `<circle cx="${W / 2}" cy="${H / 2}" r="8" fill="#22d3ee"/>`,
    `<line x1="${W / 2 - 150}" y1="${H / 2}" x2="${W / 2 + 150}" y2="${H / 2}" stroke="#22d3ee33" stroke-width="1"/>`,
    `<line x1="${W / 2}" y1="${H / 2 - 150}" x2="${W / 2}" y2="${H / 2 + 150}" stroke="#22d3ee33" stroke-width="1"/>`].join("\n");
}

function styleFestival() {
  return [defs([gold, "#ff8a5c", "#ff3fa4"]),
    `<rect x="0" y="0" width="${W}" height="12" fill="url(#bandGrad)"/>`,
    `<rect x="0" y="${H - 12}" width="${W}" height="12" fill="url(#bandGrad)"/>`,
    corners({ color: goldSoft, size: 46, inset: 30, width: 6 })].join("\n");
}

function stylePolaroid() {
  return `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="#ffffff"/>` +
    `<rect x="34" y="34" width="${W - 68}" height="${H - 190}" fill="#eef2ff"/>` +
    `<rect x="26" y="26" width="${W - 52}" height="${H - 204}" rx="6" fill="none" stroke="#0b102266" stroke-width="2"/>` +
    `<text x="${W / 2}" y="${H - 78}" text-anchor="middle" font-family="'Dancing Script','Inter',cursive" font-weight="700" font-size="44" fill="#0b1022">freshers · 2026</text>`;
}

function styleFilm() {
  return [defs(["#0b1022", "#1e293b", "#0b1022"]),
    `<rect x="0" y="0" width="${W}" height="54" fill="#0b1022"/>`,
    `<rect x="0" y="${H - 54}" width="${W}" height="54" fill="#0b1022"/>`,
    Array.from({ length: 14 }, (_, i) => `<rect x="${18 + i * 56}" y="10" width="26" height="34" rx="3" fill="#ffffff22"/>`).join("\n"),
    Array.from({ length: 14 }, (_, i) => `<rect x="${18 + i * 56}" y="${H - 44}" width="26" height="34" rx="3" fill="#ffffff22"/>`).join("\n"),
    `<rect x="26" y="60" width="${W - 52}" height="${H - 120}" fill="none" stroke="#ffffff55" stroke-width="3" rx="8"/>`].join("\n");
}

function styleBokeh() {
  const circles = Array.from({ length: 9 }, (_, i) => {
    const x = 60 + ((i * 83) % (W - 120));
    const y = 70 + ((i * 131) % (H - 140));
    const r = 22 + ((i * 17) % 40);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#ffffff88" stroke-width="2"/>`;
  }).join("\n");
  return [defs(["#ffffff00", "#ffffff20", "#ffffff00"]), glowRect(), circles].join("\n");
}

function styleNeon() {
  const neon = "#ff3fa4";
  return [defs(["#7c2bd9", neon, "#22d3ee"]),
    `<rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="46" fill="none" stroke="${neon}" stroke-width="5"/>`,
    `<rect x="38" y="38" width="${W - 76}" height="${H - 76}" rx="34" fill="none" stroke="#22d3ee" stroke-width="2.5"/>`,
    corners({ color: "#22d3ee", size: 40, inset: 34, width: 5 })].join("\n");
}

function styleInnovation() {
  return [defs([navy, "#5b7bd6", "#7c5cff"]), glowRect(),
    `<path d="M ${W * 0.22} ${H * 0.16} L ${W * 0.34} ${H * 0.16} L ${W * 0.34} ${H * 0.34} L ${W * 0.22} ${H * 0.34} Z" fill="none" stroke="#5b7bd6" stroke-width="4"/>`,
    `<path d="M ${W * 0.78} ${H * 0.16} L ${W * 0.66} ${H * 0.16} L ${W * 0.66} ${H * 0.34} L ${W * 0.78} ${H * 0.34} Z" fill="none" stroke="#5b7bd6" stroke-width="4"/>`,
    `<path d="M ${W * 0.22} ${H * 0.84} L ${W * 0.34} ${H * 0.84} L ${W * 0.34} ${H * 0.66} L ${W * 0.22} ${H * 0.66} Z" fill="none" stroke="#5b7bd6" stroke-width="4"/>`,
    `<path d="M ${W * 0.78} ${H * 0.84} L ${W * 0.66} ${H * 0.84} L ${W * 0.66} ${H * 0.66} L ${W * 0.78} ${H * 0.66} Z" fill="none" stroke="#5b7bd6" stroke-width="4"/>`,
    `<line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#7c5cff44" stroke-width="2"/>`].join("\n");
}

function styleLeadership() {
  return [defs([gold, navy, "#223669"]),
    corners({ color: goldSoft, size: 40, inset: 30, width: 5 }),
    `<rect x="30" y="30" width="${W - 60}" height="${H - 60}" rx="24" fill="none" stroke="#ffffff44" stroke-width="1.5"/>`,
    `<path d="M ${W / 2} 70 L ${W / 2 + 44} 158 L ${W / 2 + 20} 150 L ${W / 2 + 32} 236 L ${W / 2} 196 L ${W / 2 - 32} 236 L ${W / 2 - 20} 150 L ${W / 2 - 44} 158 Z" fill="none" stroke="${goldSoft}" stroke-width="5" stroke-linejoin="round"/>`].join("\n");
}

function styleCreative() {
  return [defs(["#ff3fa4", "#f472b6", "#7c5cff"]),
    `<circle cx="${W * 0.14}" cy="${H * 0.14}" r="42" fill="none" stroke="#ff3fa4" stroke-width="4"/>`,
    `<circle cx="${W * 0.86}" cy="${H * 0.14}" r="42" fill="none" stroke="#f472b6" stroke-width="4"/>`,
    `<circle cx="${W * 0.14}" cy="${H * 0.86}" r="42" fill="none" stroke="#7c5cff" stroke-width="4"/>`,
    `<circle cx="${W * 0.86}" cy="${H * 0.86}" r="42" fill="none" stroke="#22d3ee" stroke-width="4"/>`,
    `<path d="M 40 40 H 760 V 1027 H 40 Z" fill="none" stroke="#ffffff33" stroke-width="2"/>`].join("\n");
}

function styleInstagram() {
  return [defs(["#ff3fa4", "#f97316", "#22d3ee"]),
    `<rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="34" fill="none" stroke="url(#bandGrad)" stroke-width="6"/>`,
    `<circle cx="${W / 2}" cy="${H / 2}" r="86" fill="none" stroke="url(#bandGrad)" stroke-width="5"/>`,
    `<circle cx="${W / 2}" cy="${H / 2}" r="10" fill="#ff3fa4"/>`,
    `<circle cx="${W / 2 + 100}" cy="${H / 2 - 100}" r="9" fill="#f97316"/>`,
    `<rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="34" fill="none" stroke="url(#bandGrad)" stroke-width="6"/>`,
    `<rect x="52" y="52" width="${W - 104}" height="${H - 104}" rx="26" fill="none" stroke="#ffffff33" stroke-width="2"/>`].join("\n");
}

function courseBadge(short, iconShape) {
  return [defs([navy, "#2c4382", "#0b1022"]),
    `<rect x="0" y="${H - 170}" width="${W}" height="170" fill="url(#bandGrad)"/>`,
    `<rect x="0" y="${H - 178}" width="${W}" height="8" fill="#E3C374"/>`,
    `<text x="${W / 2}" y="${H - 96}" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-weight="700" font-size="54" letter-spacing="6" fill="#E3C374">${short}</text>`,
    `<circle cx="${W / 2}" cy="140" r="54" fill="none" stroke="#5b7bd6" stroke-width="3"/>`,
    `<circle cx="${W / 2}" cy="140" r="8" fill="#5b7bd6"/>`,
    iconShape].join("\n");
}

function deptBadge(short, iconShape) {
  return [defs([navy, "#7c5cff", "#0b1022"]),
    `<rect x="0" y="${H - 170}" width="${W}" height="170" fill="url(#bandGrad)"/>`,
    `<rect x="0" y="${H - 178}" width="${W}" height="8" fill="#7c5cff"/>`,
    `<text x="${W / 2}" y="${H - 96}" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-weight="700" font-size="52" letter-spacing="6" fill="#EEF2FF">${short}</text>`,
    `<rect x="${W / 2 - 54}" y="86" width="108" height="108" rx="24" fill="none" stroke="#5b7bd6" stroke-width="3"/>`,
    iconShape].join("\n");
}

function batchFrame(years) {
  const [a, b] = years;
  return [defs([gold, navy, "#223669"]),
    corners({ color: goldSoft, size: 48, inset: 28, width: 6 }),
    `<rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="30" fill="none" stroke="#ffffff55" stroke-width="2"/>`,
    `<text x="${W / 2}" y="300" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-weight="700" font-size="66" letter-spacing="4" fill="#E3C374">${a}</text>`,
    `<text x="${W / 2}" y="392" text-anchor="middle" font-family="'Inter',sans-serif" font-weight="500" font-size="34" fill="#EEF2FF">→</text>`,
    `<text x="${W / 2}" y="470" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-weight="700" font-size="66" letter-spacing="4" fill="#E3C374">${b}</text>`,
    `<text x="${W / 2}" y="${H - 80}" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-weight="600" font-size="26" letter-spacing="10" fill="#EEF2FF88">CLASS OF ${b}</text>`].join("\n");
}

/* ---------- library ---------- */

const recipes = [
  // Freshers
  recipe("welcome-2026", "Welcome 2026", "Freshers", () => styleGradient() + "\n" + `<text x="${W / 2}" y="128" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-weight="700" font-size="38" letter-spacing="6" fill="#E3C374">WELCOME</text><text x="${W / 2}" y="178" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-weight="500" font-size="24" letter-spacing="8" fill="#EEF2FF">2026</text>`),
  recipe("orientation-day", "Orientation Day", "Freshers", () => styleLuxury() + "\n" + `<text x="${W / 2}" y="${H - 84}" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-weight="600" font-size="30" letter-spacing="8" fill="#E3C374">ORIENTATION DAY</text>`),
  recipe("the-journey-begins", "The Journey Begins", "Freshers", () => styleMinimal() + "\n" + `<path d="M ${W / 2 - 120} ${H - 96} H ${W / 2 + 40} M ${W / 2 + 20} ${H - 116} L ${W / 2 + 52} ${H - 96} L ${W / 2 + 20} ${H - 76}" fill="none" stroke="#0b1022" stroke-width="5" stroke-linecap="round"/>`),
  recipe("class-of-2026", "Class of 2026", "Freshers", () => topBand({ text: "CLASS OF", sub: "2026" }) + "\n" + styleGlass()),
  recipe("new-beginnings", "New Beginnings", "Freshers", () => styleGolden() + "\n" + `<path d="M ${W * 0.2} ${H * 0.22} A 60 60 0 0 1 ${W * 0.8} ${H * 0.22}" fill="none" stroke="${goldSoft}" stroke-width="3"/>`),

  // Batches
  recipe("batch-2026-2029", "2026–2029", "Batches", () => batchFrame([2026, 2029])),
  recipe("batch-2026-2030", "2026–2030", "Batches", () => batchFrame([2026, 2030])),
  recipe("batch-2026-2031", "2026–2031", "Batches", () => batchFrame([2026, 2031])),
  recipe("batch-2026-2032", "2026–2032", "Batches", () => batchFrame([2026, 2032])),

  // Courses
  recipe("btech", "B.Tech", "Courses", () => courseBadge("B.TECH", `<path d="M ${W / 2 - 18} 122 L ${W / 2 + 18} 122 M ${W / 2} 122 L ${W / 2} 158 M ${W / 2 - 14} 136 L ${W / 2 + 14} 136" stroke="#5b7bd6" stroke-width="4" stroke-linecap="round"/>`)),
  recipe("bca", "BCA", "Courses", () => courseBadge("BCA", `<text x="${W / 2}" y="152" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="26" fill="#5b7bd6">&lt;/&gt;</text>`)),
  recipe("bba", "BBA", "Courses", () => courseBadge("BBA", `<path d="M ${W / 2 - 22} 158 L ${W / 2} 120 L ${W / 2 + 22} 158 Z" fill="none" stroke="#5b7bd6" stroke-width="4"/>`)),
  recipe("bcom", "B.Com", "Courses", () => courseBadge("B.COM", `<text x="${W / 2}" y="156" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-weight="700" font-size="34" fill="#5b7bd6">₹</text>`)),
  recipe("mba", "MBA", "Courses", () => courseBadge("MBA", `<path d="M ${W / 2 - 20} 158 L ${W / 2 - 4} 122 L ${W / 2 + 10} 146 L ${W / 2 + 22} 120" fill="none" stroke="#5b7bd6" stroke-width="4" stroke-linecap="round"/>`)),
  recipe("mca", "MCA", "Courses", () => courseBadge("MCA", `<rect x="${W / 2 - 20}" y="120" width="40" height="34" rx="5" fill="none" stroke="#5b7bd6" stroke-width="4"/><path d="M ${W / 2 - 6} 154 L ${W / 2 + 6} 154" stroke="#5b7bd6" stroke-width="4"/>`)),
  recipe("mtech", "M.Tech", "Courses", () => courseBadge("M.TECH", `<circle cx="${W / 2}" cy="140" r="20" fill="none" stroke="#5b7bd6" stroke-width="4"/><circle cx="${W / 2}" cy="140" r="6" fill="#5b7bd6"/>`)),

  // Departments
  recipe("cse", "CSE", "Departments", () => deptBadge("CSE", `<text x="${W / 2}" y="152" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-weight="700" font-size="30" fill="#A78BFA">&lt;code/&gt;</text>`)),
  recipe("ai", "AI", "Departments", () => deptBadge("AI", `<circle cx="${W / 2}" cy="140" r="26" fill="none" stroke="#A78BFA" stroke-width="4"/><circle cx="${W / 2 + 10}" cy="130" r="4" fill="#A78BFA"/><circle cx="${W / 2 - 12}" cy="150" r="4" fill="#A78BFA"/>`)),
  recipe("cyber", "Cyber Security", "Departments", () => deptBadge("CYS", `<path d="M ${W / 2 - 20} 148 L ${W / 2} 122 L ${W / 2 + 20} 148 Z" fill="none" stroke="#A78BFA" stroke-width="4"/><circle cx="${W / 2}" cy="142" r="10" fill="none" stroke="#A78BFA" stroke-width="3"/>`)),
  recipe("ece", "ECE", "Departments", () => deptBadge("ECE", `<path d="M ${W / 2 - 24} 158 L ${W / 2} 122 L ${W / 2 + 24} 158 Z" fill="none" stroke="#A78BFA" stroke-width="4"/><circle cx="${W / 2}" cy="152" r="7" fill="#A78BFA"/>`)),
  recipe("mech", "Mechanical", "Departments", () => deptBadge("MEC", `<circle cx="${W / 2}" cy="140" r="18" fill="none" stroke="#A78BFA" stroke-width="4"/><path d="M ${W / 2 - 26} 140 L ${W / 2 - 10} 140 M ${W / 2 + 10} 140 L ${W / 2 + 26} 140 M ${W / 2} 114 L ${W / 2} 130 M ${W / 2} 150 L ${W / 2} 166" stroke="#A78BFA" stroke-width="4" stroke-linecap="round"/>`)),
  recipe("civil", "Civil", "Departments", () => deptBadge("CIV", `<path d="M ${W / 2 - 24} 160 L ${W / 2 - 24} 126 L ${W / 2} 112 L ${W / 2 + 24} 126 L ${W / 2 + 24} 160 Z" fill="none" stroke="#A78BFA" stroke-width="4"/><rect x="${W / 2 - 10}" y="134" width="20" height="26" fill="none" stroke="#A78BFA" stroke-width="3"/>`)),
  recipe("business", "Business", "Departments", () => deptBadge("BUS", `<rect x="${W / 2 - 22}" y="124" width="44" height="32" rx="4" fill="none" stroke="#A78BFA" stroke-width="4"/><path d="M ${W / 2 - 22} 136 H ${W / 2 + 22}" stroke="#A78BFA" stroke-width="3"/>`)),
  recipe("finance", "Finance", "Departments", () => deptBadge("FIN", `<path d="M ${W / 2 - 22} 150 L ${W / 2 - 4} 126 L ${W / 2 + 8} 142 L ${W / 2 + 22} 122" fill="none" stroke="#A78BFA" stroke-width="4" stroke-linecap="round"/><path d="M ${W / 2 + 6} 122 H ${W / 2 + 22} V 138" fill="none" stroke="#A78BFA" stroke-width="4"/>`)),
  recipe("marketing", "Marketing", "Departments", () => deptBadge("MKT", `<path d="M ${W / 2 - 20} 148 L ${W / 2 - 6} 132 L ${W / 2 + 4} 142 L ${W / 2 + 20} 126" fill="none" stroke="#A78BFA" stroke-width="4" stroke-linecap="round"/>`)),
  recipe("design", "Design", "Departments", () => deptBadge("DES", `<circle cx="${W / 2}" cy="140" r="20" fill="none" stroke="#A78BFA" stroke-width="4"/><path d="M ${W / 2} 120 L ${W / 2} 132" stroke="#A78BFA" stroke-width="4"/><circle cx="${W / 2}" cy="140" r="4" fill="#A78BFA"/>`)),

  // Themes
  recipe("glass", "Glass", "Themes", styleGlass),
  recipe("luxury", "Luxury", "Themes", styleLuxury),
  recipe("cyberpunk", "Cyberpunk", "Themes", styleCyber),
  recipe("minimal", "Minimal", "Themes", styleMinimal),
  recipe("gradient", "Gradient", "Themes", styleGradient),
  recipe("aurora", "Aurora", "Themes", styleAurora),
  recipe("dark-mode", "Dark Mode", "Themes", styleDark),
  recipe("golden", "Golden", "Themes", styleGolden),
  recipe("corporate", "Corporate", "Themes", styleCorporate),
  recipe("developer", "Developer", "Themes", styleDeveloper),
  recipe("future-engineer", "Future Engineer", "Themes", styleFutureEngineer),
  recipe("innovation", "Innovation", "Themes", styleInnovation),
  recipe("leadership", "Leadership", "Themes", styleLeadership),
  recipe("creative", "Creative", "Themes", styleCreative),
  recipe("instagram", "Instagram Style", "Themes", styleInstagram),

  // Festival
  recipe("festival-lights", "Festival of Lights", "Festival", styleFestival),
  recipe("festival-colors", "Festival of Colors", "Festival", () => styleCyber().replace("#22d3ee", "#ff3fa4")),

  // Special
  recipe("golden-2026", "Golden 2026", "Special", styleGolden),
  recipe("polaroid", "Polaroid", "Special", stylePolaroid),
  recipe("film-strip", "Film Strip", "Special", styleFilm),
  recipe("bokeh", "Bokeh", "Special", styleBokeh),
  recipe("neon-edge", "Neon Edge", "Special", styleNeon),
];

/* ---------- write ---------- */

async function main() {
  const missing = [];
  for (const r of recipes) {
    const dir = path.join(FRAMES_DIR, r.category);
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${r.id}.svg`);
    await fs.writeFile(file, wrap(`${r.name}`, r.build()));
  }

  // manifest — mirrors the API's rescan logic so `npm run sync:frames` stays
  // consistent with the "Rescan library" button in the admin panel.
  async function walk(dir, base) {
    const out = [];
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return out;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...(await walk(full, base)));
      else if (/\.(svg|png)$/i.test(e.name)) {
        const rel = path.relative(base, full).split(path.sep).join("/");
        const category = path.relative(base, path.dirname(full)).split(path.sep).join("/") || "Special";
        const stem = path.basename(e.name, path.extname(e.name));
        out.push({
          id: slugify(stem),
          name: stem.replace(/-/g, " "),
          category,
          path: `/frames/${rel}`,
          type: /\.png$/i.test(e.name) ? "png" : "svg",
          enabled: true,
          opacity: 100,
        });
      }
    }
    return out;
  }

  const frames = await walk(FRAMES_DIR, FRAMES_DIR);
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const manifest = { generatedAt: new Date().toISOString(), frames };
  await fs.writeFile(path.join(CONFIG_DIR, "frames-manifest.json"), JSON.stringify(manifest, null, 2));

  const counts = frames.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Generated ${frames.length} frames:`);
  for (const [cat, n] of Object.entries(counts)) console.log(`  ${cat}: ${n}`);
  console.log("Missing frame defs:", missing.length === 0 ? "none" : missing.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
