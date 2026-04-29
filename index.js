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
const processed = new Set();
const TTL = 15000;

// ===== READY =====
client.once(Events.ClientReady, () => {
  console.log(`🚀 Bot online`);
});

// ===== UTIL =====
function getThreadsUrl(content) {
  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/;
  const match = content.match(regex);
  return match ? match[0].split('?')[0] : null;
}

function toProxy(url) {
  return url
    .replace("threads.com", "threadsfix.com")
    .replace("threads.net", "threadsfix.com");
}

// ===== MAIN =====
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const url = getThreadsUrl(message.content);
  if (!url) return;

  if (processed.has(url)) return;
  processed.add(url);
  setTimeout(() => processed.delete(url), TTL);

  try {
    // 👉 tắt embed link gốc để không bị double
    if (message.suppressEmbeds) {
      try { await message.suppressEmbeds(true); } catch {}
    }

    const proxyUrl = toProxy(url);

    const { data } = await axios.get(proxyUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);

    // ===== META =====
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    let description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    let image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content');

    let video =
      $('meta[property="og:video"]').attr('content') ||
      $('meta[property="og:video:secure_url"]').attr('content');

    // ===== USER =====
    const u = url.match(/@([^\/]+)/);
    const username = u ? `@${u[1]}` : '@user';

    let displayName = username.replace('@', '');
    const nameMatch = ogTitle.match(/^(.*?)\s*\(@/);
    if (nameMatch && nameMatch[1]) {
      displayName = nameMatch[1].trim();
    }

    // ===== CLEAN TEXT =====
    if (description) {
      description = description
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`${displayName} (${username}) on Threads`)
      .setURL(url)
      .setTimestamp();

    if (description) embed.setDescription(description);

    if (video) {
      embed.setImage(video);
      embed.setFooter({ text: "▶️ Video Threads" });
    } else if (
      image &&
      !image.includes("profile_pic") &&
      !image.includes("avatar")
    ) {
      embed.setImage(image);
    }

    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });

  } catch (err) {
    console.error("❌ ERROR:", err.message);

    // fallback gửi link
    await message.reply({
      content: `🔗 ${url}`,
      allowedMentions: { repliedUser: false }
    });
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
