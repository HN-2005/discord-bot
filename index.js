require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
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
const LINK_TTL = 15000; // chống spam link 15s
const processedLinks = new Set();

// ===== READY =====
client.once(Events.ClientReady, (c) => {
  console.log(`🚀 Bot online: ${c.user.tag}`);
});

// ===== UTIL =====
function normalizeThreadsUrl(rawUrl) {
  let url = rawUrl.split('?')[0];

  // convert sang proxy để lấy metadata
  url = url
    .replace("threads.net", "threadsfix.com")
    .replace("threads.com", "threadsfix.com");

  return url;
}

function extractOriginalUrl(rawUrl) {
  return rawUrl.split('?')[0];
}

// ===== MAIN =====
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/;
  const match = message.content.match(regex);
  if (!match) return;

  const originalUrl = extractOriginalUrl(match[0]);
  const proxyUrl = normalizeThreadsUrl(match[0]);

  // chống trùng
  if (processedLinks.has(originalUrl)) return;
  processedLinks.add(originalUrl);
  setTimeout(() => processedLinks.delete(originalUrl), LINK_TTL);

  try {
    const { data } = await axios.get(proxyUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);

    // ===== TITLE =====
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';

    // ===== DESCRIPTION =====
    let description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    if (description) {
      description = description
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // ===== MEDIA =====
    let image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content');

    let video =
      $('meta[property="og:video"]').attr('content') ||
      $('meta[property="og:video:secure_url"]').attr('content');

    // ===== USERNAME =====
    const urlMatch = originalUrl.match(/threads\.(net|com)\/@([^\/]+)/);
    const username = urlMatch ? `@${urlMatch[2]}` : '@user';

    // ===== DISPLAY NAME =====
    let displayName = username.replace('@', '');

    const nameMatch = ogTitle.match(/^(.*?)\s*\(@/);
    if (nameMatch && nameMatch[1]) {
      displayName = nameMatch[1].trim();
    }

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`${displayName} (${username}) on Threads`)
      .setURL(originalUrl)
      .setTimestamp();

    if (description) {
      embed.setDescription(description);
    }

    // ===== MEDIA LOGIC =====
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

    // ===== SEND =====
    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });

  } catch (err) {
    console.error("❌ Lỗi fetch Threads:", err.message);

    // fallback: gửi link thường
    await message.reply({
      content: `🔗 ${originalUrl}`,
      allowedMentions: { repliedUser: false }
    });
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
