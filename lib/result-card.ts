import type { Result } from "@/lib/types";

const WIDTH = 1080;
const HEIGHT = 1350;

export async function createResultCard(title: string, votes: number, results: Result[], language: "es" | "en" = "es") {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear la imagen");

  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, "#1c0d1d");
  background.addColorStop(.48, "#4b1237");
  background.addColorStop(1, "#160b20");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(880, 100, 0, 880, 100, 600);
  glow.addColorStop(0, "rgba(255,54,139,.62)");
  glow.addColorStop(1, "rgba(255,54,139,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, 700);
  ctx.fillStyle = "rgba(255,255,255,.035)";
  for (let x = -200; x < WIDTH + 200; x += 80) {
    ctx.save(); ctx.translate(x, 0); ctx.rotate(-.2); ctx.fillRect(0, 0, 2, HEIGHT); ctx.restore();
  }

  ctx.fillStyle = "#ff4d9c";
  ctx.font = "700 25px 'DM Sans', sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText(language === "en" ? "RATE A QUEEN · FINAL RESULTS" : "RATE A QUEEN · RESULTADOS", 70, 82);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#fffaf3";
  ctx.font = "italic 700 66px 'Playfair Display', serif";
  const titleLines = wrapText(ctx, title, 940, 2);
  titleLines.forEach((line, index) => ctx.fillText(line, 70, 160 + index * 70));
  const headerBottom = 180 + titleLines.length * 70;
  ctx.fillStyle = "rgba(255,255,255,.68)";
  ctx.font = "500 25px 'DM Sans', sans-serif";
  ctx.fillText(language === "en" ? `${votes} anonymous votes · final ranking` : `${votes} votos anónimos · clasificación final`, 72, headerBottom);

  const winner = results[0];
  if (winner) {
    const top = headerBottom + 42;
    roundedRect(ctx, 55, top, 970, 265, 32);
    const cardGradient = ctx.createLinearGradient(55, top, 1025, top + 265);
    cardGradient.addColorStop(0, "rgba(255,222,112,.24)");
    cardGradient.addColorStop(1, "rgba(255,255,255,.08)");
    ctx.fillStyle = cardGradient; ctx.fill();
    ctx.strokeStyle = "rgba(255,225,125,.55)"; ctx.lineWidth = 2; ctx.stroke();

    await drawPortrait(ctx, winner.image_url, 85, top + 32, 200, 200, "#f7c85c");
    ctx.fillStyle = "#ffd86b"; ctx.font = "800 24px 'DM Sans', sans-serif"; ctx.fillText(language === "en" ? "THE WINNER" : "LA GANADORA", 320, top + 65);
    ctx.fillStyle = "#fff"; ctx.font = "700 52px 'Playfair Display', serif"; ctx.fillText(trimText(ctx, winner.name, 620), 320, top + 128);
    ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.font = "500 24px 'DM Sans', sans-serif"; ctx.fillText(language === "en" ? `${winner.average.toFixed(2)} average points` : `${winner.average.toFixed(2)} puntos de media`, 320, top + 174);
    ctx.fillStyle = "#ffd86b"; ctx.font = "700 25px 'DM Sans', sans-serif"; ctx.fillText(language === "en" ? `${winner.first_places} first places` : `${winner.first_places} primeros puestos`, 320, top + 215);
  }

  const listTop = headerBottom + 337;
  const shown = results.slice(1, 9);
  const rowHeight = Math.min(104, Math.floor((1245 - listTop) / Math.max(shown.length, 1)));
  for (let index = 0; index < shown.length; index++) {
    const queen = shown[index];
    const y = listTop + index * rowHeight;
    roundedRect(ctx, 55, y, 970, rowHeight - 10, 22);
    ctx.fillStyle = index % 2 ? "rgba(255,255,255,.055)" : "rgba(255,255,255,.09)"; ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.65)"; ctx.font = "700 30px 'Playfair Display', serif"; ctx.fillText(String(index + 2).padStart(2, "0"), 82, y + rowHeight / 2 + 9);
    await drawPortrait(ctx, queen.image_url, 145, y + 10, rowHeight - 30, rowHeight - 30, "#f02d80");
    ctx.fillStyle = "#fff"; ctx.font = "700 29px 'DM Sans', sans-serif"; ctx.fillText(trimText(ctx, queen.name, 520), 250, y + rowHeight / 2 + 8);
    ctx.textAlign = "right"; ctx.fillStyle = "#ff9bc7"; ctx.font = "800 28px 'DM Sans', sans-serif"; ctx.fillText(queen.average.toFixed(2), 970, y + rowHeight / 2 + 7); ctx.textAlign = "left";
  }

  if (results.length > 9) {
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.58)"; ctx.font = "600 21px 'DM Sans', sans-serif"; ctx.fillText(language === "en" ? `+ ${results.length - 9} more queens at rateaqueen.app` : `+ ${results.length - 9} reinas más en rateaqueen.app`, WIDTH / 2, 1280); ctx.textAlign = "left";
  } else {
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = "600 21px 'DM Sans', sans-serif"; ctx.fillText("rateaqueen.app", 70, 1290);
  }

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("No se pudo exportar la imagen")), "image/png"));
  return new File([blob], `rate-a-queen-${slug(title)}.png`, { type: "image/png" });
}

async function drawPortrait(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, width: number, height: number, fallback: string) {
  ctx.save(); roundedRect(ctx, x, y, width, height, Math.min(28, width / 4)); ctx.clip();
  if (url) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const image = await loadImage(objectUrl);
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.max(width / image.width, height / image.height);
      const drawWidth = image.width * ratio; const drawHeight = image.height * ratio;
      ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
      ctx.restore(); return;
    } catch { /* usa el marcador inferior */ }
  }
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height); gradient.addColorStop(0, fallback); gradient.addColorStop(1, "#6f285a"); ctx.fillStyle = gradient; ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "rgba(255,255,255,.82)"; ctx.font = `700 ${Math.max(24, width * .3)}px 'Playfair Display', serif`; ctx.textAlign = "center"; ctx.fillText("♛", x + width / 2, y + height * .65); ctx.textAlign = "left"; ctx.restore();
}

function loadImage(url: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url; }); }
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) { ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.arcTo(x + width, y, x + width, y + height, radius); ctx.arcTo(x + width, y + height, x, y + height, radius); ctx.arcTo(x, y + height, x, y, radius); ctx.arcTo(x, y, x + width, y, radius); ctx.closePath(); }
function trimText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) { if (ctx.measureText(text).width <= maxWidth) return text; let value = text; while (value.length && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1); return `${value}…`; }
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) { const words = text.split(/\s+/); const lines: string[] = []; for (const word of words) { const candidate = lines.length ? `${lines.at(-1)} ${word}` : word; if (ctx.measureText(candidate).width <= maxWidth) { if (!lines.length) lines.push(word); else lines[lines.length - 1] = candidate; } else if (lines.length < maxLines) lines.push(word); } if (lines.length === maxLines) lines[maxLines - 1] = trimText(ctx, lines[maxLines - 1], maxWidth); return lines; }
function slug(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "resultados"; }
