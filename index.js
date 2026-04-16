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

  // 🔥 regex bắt mọi link Threads
  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/;
  const match = message.content.match(regex);
  if (!match) return;

  let url = match[0];

  // 🔥 bỏ query (?xmt=...)
  url = url.split('?')[0];

  // 🔥 chống trùng
  if (processedLinks.has(url)) return;
  processedLinks.add(url);
  setTimeout(() => processedLinks.delete(url), 10000);

  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000
    });

    const $ = cheerio.load(data);

    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content');

    // 🧠 lấy username từ URL
    const urlMatch = url.match(/threads\.(net|com)\/@([^\/]+)/);
    const username = urlMatch ? `@${urlMatch[2]}` : '@user';

    // 🧠 parse tên
    let displayName = 'Threads User';

    const nameMatch = ogTitle.match(/^(.*?)\s*\(@/);
    if (nameMatch && !nameMatch[1].toLowerCase().includes('threads')) {
      displayName = nameMatch[1].trim();
    } else {
      displayName = username.replace('@', '');
    }

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`${displayName} (${username}) on Threads`)
      .setURL(url)
      .setTimestamp();

    if (description) {
      embed.setDescription(description.replace(/\n{3,}/g, '\n\n').trim());
    }

    if (image && !image.includes("profile_pic")) {
      embed.setImage(image);
    }

    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });

  } catch (err) {
    console.error("❌ Lỗi:", err.message);
  }
});

client.login(process.env.TOKEN);