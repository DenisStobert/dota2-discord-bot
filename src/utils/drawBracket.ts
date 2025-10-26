import { createCanvas } from "canvas";

export interface Match {
  team1: string;
  team2: string | null;
  winner?: string | null;
}

export function drawBracket(matches: Match[]) {
  const numTeams = matches.length * 2;
  const rounds = Math.ceil(Math.log2(numTeams));

  const roundWidth = 220;
  const matchHeight = 40;
  const verticalGap = 20;

  const width = roundWidth * rounds + 220;
  const height = (matchHeight + verticalGap) * (numTeams / 2) + 120;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 🔳 фон
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, width, height);

  // 🏆 заголовок
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial";
  const title = "🏆 Турнирная Сетка";
  const titleWidth = ctx.measureText(title).width;
  ctx.fillText(title, (width - titleWidth) / 2, 60);

  const startX = 100;
  let matchesInRound = numTeams / 2;
  let matchIndex = 0;
  const totalVerticalSpace = height - 160;

  // 🔠 функция обрезки длинных имён
  const truncate = (text: string, maxWidth: number): string => {
    const measured = ctx.measureText(text).width;
    if (measured <= maxWidth) return text;
    let truncated = text;
    while (ctx.measureText(truncated + "…").width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "…";
  };

  for (let r = 0; r < rounds; r++) {
    const roundX = startX + r * roundWidth;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    const label = r === rounds - 1 ? "Финал" : `Раунд ${r + 1}`;
    const labelWidth = ctx.measureText(label).width;
    ctx.fillText(label, roundX + (180 - labelWidth) / 2, 95);

    const stepY = totalVerticalSpace / matchesInRound;
    const offsetY = stepY / 2 + 100;

    for (let i = 0; i < matchesInRound; i++) {
      const y = offsetY + i * stepY;
      const m = matches[matchIndex] ?? { team1: "TBD", team2: "TBD" };

      // фон под матч
      const boxY = y - matchHeight / 2;
      ctx.fillStyle = "#161b22";
      ctx.fillRect(roundX, boxY, 180, matchHeight);

      // 🔹 линия-разделитель между командами
      ctx.strokeStyle = "#30363d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(roundX, y);
      ctx.lineTo(roundX + 180, y);
      ctx.stroke();

      // команды — белый текст с ограничением длины
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px Arial";
      const maxTextWidth = 160; // отступы по 10px с каждой стороны
      const team1 = truncate(m.team1, maxTextWidth);
      const team2 = truncate(m.team2 ?? "BYE", maxTextWidth);

      ctx.fillText(team1, roundX + 10, y - 8);
      ctx.fillText(team2, roundX + 10, y + 18);

      // 🟩 соединительные линии (со сдвигом)
      const midY = y;
      const horizontalStartX = roundX + 180; // +10 от правого края бокса
      const verticalX = roundX + roundWidth - 20;

      ctx.strokeStyle = "#aaaaaa";
      ctx.lineWidth = 1.5;

      // горизонтальная от матча к вертикали
      ctx.beginPath();
      ctx.moveTo(horizontalStartX, midY);
      ctx.lineTo(verticalX, midY);
      ctx.stroke();

      // вертикальные линии между матчами
      if (i % 2 === 0 && i + 1 < matchesInRound) {
        const nextY = offsetY + (i + 1) * stepY;
        const midConnectY = (y + nextY) / 2;

        // вертикальная
        ctx.beginPath();
        ctx.moveTo(verticalX, y);
        ctx.lineTo(verticalX, nextY);
        ctx.stroke();

        // горизонтальная к следующему раунду
        ctx.beginPath();
        ctx.moveTo(verticalX, midConnectY);
        ctx.lineTo(verticalX + 20, midConnectY);
        ctx.stroke();
      }

      matchIndex++;
    }

    matchesInRound /= 2;
  }

  // рамка
  ctx.strokeStyle = "#30363d";
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  return canvas.toBuffer("image/png");
}
