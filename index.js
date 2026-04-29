require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Events
} = require('discord.js');

const axios = require('axios');
const cheerio = require('cheerio');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== CONFIG =====
const DELAY = 2500; // chờ Discord embed
const processed = new Set();

// ===== READY =====
client.once(Events.ClientReady, () => {
  console.log(`🚀 Bot online`);
});

// ===== CHECK THREADS =====
function getThreadsUrl(content) {
  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/;
  const match = content.match(regex);
  return match ? match[0].split('?')[0] : null;
}

// ===== MAIN =====
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const url = getThreadsUrl(message.content);
  if (!url) return;

  if (processed.has(url)) return;
  processed.add(url);
  setTimeout(() => processed.delete(url), 15000);

  // ⏳ chờ Discord embed
  setTimeout(async () => {
    try {
      const msg = await message.fetch();

      // 👉 nếu Discord đã embed (có embed sẵn)
      if (msg.embeds.length > 0) {
        console.log("✅ Discord embed OK → bỏ qua");
        return;
      }

      console.log("⚠️ Không có embed → dùng fallback");

      // ===== SCRAPE bằng proxy =====
      const proxyUrl = url
        .replace("threads.com", "threadsfix.com")
        .replace("threads.net", "threadsfix.com");

      const { data } = await axios.get(proxyUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const $ = cheerio.load(data);

      const title =
        $('meta[property="og:title"]').attr('content') || '';

      let desc =
        $('meta[property="og:description"]').attr('content') || '';

      let image =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content');

      let video =
        $('meta[property="og:video"]').attr('content');

      // username
      const u = url.match(/@([^\/]+)/);
      const username = u ? `@${u[1]}` : '@user';

      // display name
      let name = username.replace('@', '');
      const nameMatch = title.match(/^(.*?)\s*\(@/);
      if (nameMatch) name = nameMatch[1];

      // ===== EMBED =====
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${name} (${username}) on Threads`)
        .setURL(url)
        .setTimestamp();

      if (desc) embed.setDescription(desc);

      if (video) {
        embed.setImage(video);
        embed.setFooter({ text: "▶️ Video Threads" });
      } else if (image) {
        embed.setImage(image);
      }

      await message.reply({
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });

    } catch (err) {
      console.error("❌ Fallback lỗi:", err.message);
    }
  }, DELAY);
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
