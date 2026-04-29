require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
const axios = require('axios');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const he = require('he');

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

const processedLinks = new Set();

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/;
  const match = message.content.match(regex);
  if (!match) return;

  let url = match[0].split('?')[0];

  if (processedLinks.has(url)) return;
  processedLinks.add(url);
  setTimeout(() => processedLinks.delete(url), 10000);

  // 🔥 FIX USERNAME (lấy từ URL luôn)
  const urlMatch = url.match(/threads\.(net|com)\/@([^\/]+)/);
  let username = urlMatch ? urlMatch[2] : "user";
  let displayName = username;

  let image = null;
  let description = "";

  try {
    // lấy caption nhẹ
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000
    });

    description =
      data.match(/property="og:description" content="([^"]+)"/)?.[1] || "";

  } catch {}

  try {
    // Puppeteer lấy media thật
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    // 🔥 lấy media ổn định hơn
    image = await page.evaluate(() => {
      // ưu tiên video
      const video = document.querySelector('video');
      if (video) return video.poster || video.src;

      // fallback ảnh
      const img = document.querySelector('img[src*="cdn"]');
      if (img) return img.src;

      return null;
    });

    await browser.close();

  } catch (err) {
    console.log("⚠️ Puppeteer lỗi:", err.message);
  }

  const embed = new EmbedBuilder()
    .setColor(0x000000)
    .setTitle(`${he.decode(displayName)} (@${username}) on Threads`)
    .setURL(url)
    .setTimestamp();

  if (description) {
    embed.setDescription(
      he.decode(description).replace(/\n{3,}/g, '\n\n').trim()
    );
  }

  if (image) {
    embed.setImage(image);

    if (image.includes("mp4")) {
      embed.setFooter({ text: "▶️ Video trên Threads" });
    }
  }

  await message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false }
  });
});

client.login(process.env.TOKEN);
