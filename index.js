require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
const axios = require('axios');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

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

  let image = null;
  let description = "";
  let username = "";
  let displayName = "Threads User";

  try {
    // 🔥 lấy caption nhẹ bằng axios
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000
    });

    description =
      data.match(/property="og:description" content="([^"]+)"/)?.[1] || "";
  } catch {}

  try {
    // 🔥 Puppeteer lấy ảnh/video thật
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    // lấy media
    image = await page.evaluate(() => {
      const img = document.querySelector('img');
      if (img) return img.src;

      const video = document.querySelector('video');
      if (video) return video.poster || video.src;

      return null;
    });

    // lấy username
    username = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/@"]');
      return link ? link.href.split('/@')[1].split('/')[0] : "";
    });

    if (username) {
      displayName = username;
      username = "@" + username;
    }

    await browser.close();

  } catch (err) {
    console.log("⚠️ Puppeteer lỗi:", err.message);
  }

  const embed = new EmbedBuilder()
    .setColor(0x000000)
    .setTitle(`${displayName} (${username}) on Threads`)
    .setURL(url)
    .setTimestamp();

  if (description) embed.setDescription(description);
  if (image) embed.setImage(image);

  await message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false }
  });
});

client.login(process.env.TOKEN);