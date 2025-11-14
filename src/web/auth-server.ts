import express from "express";
import passport from "passport";
import session from "express-session";
import { Strategy as SteamStrategy } from "passport-steam";
import { logger } from "../utils/logger";
import { initDatabase, getDb, saveDatabase } from "../database/db";
import crypto from "crypto";

const pending = new Map<string, string>(); // token -> discordId

export async function startAuthServer() {
  await initDatabase();
  const db = getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      steam_id TEXT UNIQUE,
      name TEXT,
      avatar TEXT,
      discord_id TEXT
    )
  `);
  saveDatabase();

  const app = express();
  const PORT = 3080;

  // ✅ добавляем express-session перед passport
  app.use(
    session({
      secret: "supersecretkey", // замени на свой ключ
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Настраиваем passport
  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  passport.use(
    new SteamStrategy(
      {
        returnURL: "http://localhost:3080/auth/steam/return",
        realm: "http://localhost:3080/",
        apiKey: process.env.STEAM_API_KEY || "YOUR_STEAM_API_KEY",
      },
      (identifier, profile, done) => process.nextTick(() => done(null, profile))
    )
  );

  // 1️⃣ Discord вызывает этот endpoint — создаём токен и редиректим на Steam
  app.get(
    "/auth/steam",
    (req, res, next) => {
      const discordId = req.query.discord_id as string;
      if (!discordId) return res.status(400).send("Missing discord_id");

      const token = crypto.randomBytes(16).toString("hex");
      pending.set(token, discordId);
      logger.info(`🪪 Created pending login for ${discordId} token=${token}`);

      // 👇 добавляем token в returnURL
      ((passport as any)._strategies.steam as any)._relyingParty.returnUrl =
        `http://localhost:3080/auth/steam/return?token=${token}`;

      next();
    },
    passport.authenticate("steam", { failureRedirect: "/" })
  );

  // 2️⃣ Steam возвращает юзера обратно
  app.get(
    "/auth/steam/return",
    passport.authenticate("steam", { failureRedirect: "/" }),
    async (req, res) => {
      const steamUser = req.user as any;
      const token = req.query.token as string;
      const discordId = pending.get(token);
      pending.delete(token);

      if (!discordId) {
        logger.warn("⚠️ Не найден discord_id для токена (возможно, истёк)");
        return res.status(400).send("Discord session expired.");
      }

      const steamId = steamUser.id;
      const displayName = steamUser.displayName;
      const avatar = steamUser.photos?.[2]?.value || "";

      db.run(
        "INSERT OR REPLACE INTO users (steam_id, name, avatar, discord_id) VALUES (?, ?, ?, ?)",
        [steamId, displayName, avatar, discordId]
      );
      saveDatabase();

      try {
        const { discordBot } = await import("../bot/instance");
        const discordUser = await discordBot.client.users.fetch(discordId);
        await discordUser.send(
          `✅ Аккаунт Steam **${displayName}** успешно привязан! 🎮`
        );
        logger.info(`📨 DM sent to ${displayName} (${discordId})`);
      } catch (err) {
        logger.error("⚠️ Ошибка при отправке DM в Discord:", err);
      }

      res.send(`
        <html>
          <body style="text-align:center;font-family:sans-serif;">
            <h2>✅ Успешная авторизация!</h2>
            <p>Можно закрыть это окно.</p>
            <script>setTimeout(() => window.close(), 1000);</script>
          </body>
        </html>
      `);
    }
  );

  app.listen(PORT, () =>
    logger.info(`🌐 Steam Auth server running at http://localhost:${PORT}`)
  );
}
