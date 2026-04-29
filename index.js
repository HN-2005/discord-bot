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

client.once(Events.ClientReady, (c) => {
  console.log(`🚀 Bot online: ${c.user.tag}`);
});

// 🧠 chống trùng link
const processedLinks = new Set();

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  console.log("📩 Nhận:", message.content);

  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/;
  const match = message.content.match(regex);
  if (!match) return;

  let url = match[0].split('?')[0];

  // 🔥 dùng proxy để lấy metadata
  const proxyUrl = url
    .replace("threads.com", "threadsfix.com")
    .replace("threads.net", "threadsfix.com");

  if (processedLinks.has(url)) return;
  processedLinks.add(url);
  setTimeout(() => processedLinks.delete(url), 10000);

  try {
    const { data } = await axios.get(proxyUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000
    });

    const $ = cheerio.load(data);

    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    let image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content');

    let video =
      $('meta[property="og:video"]').attr('content') ||
      $('meta[property="og:video:secure_url"]').attr('content');

    // 🧠 username
    const urlMatch = url.match(/threads\.(net|com)\/@([^\/]+)/);
    const username = urlMatch ? `@${urlMatch[2]}` : '@user';

    // 🧠 display name
    let displayName = username.replace('@', '');

    const nameMatch = ogTitle.match(/^(.*?)\s*\(@/);
    if (nameMatch && nameMatch[1]) {
      displayName = nameMatch[1].trim();
    }

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`${displayName} (${username}) on Threads`)
      .setURL(url)
      .setTimestamp();

    if (description) {
      embed.setDescription(description.replace(/\n{3,}/g, '\n\n').trim());
    }

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
    console.error("❌ Lỗi:", err.message);

    await message.reply({
      content: `🔗 ${url}`,
      allowedMentions: { repliedUser: false }
    });
  }
});

client.login(process.env.TOKEN);
