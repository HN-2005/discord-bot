require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ]
});

client.once(Events.ClientReady, (c) => {
  console.log(`🚀 Bot đã online trên Railway: ${c.user.tag}`);
});

const processedLinks = new Set();

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/@[^\s/]+\/post\/[^\s?]+/;
  const match = message.content.match(regex);
  
  // SỬA LỖI TẠI ĐÂY: match mới là chuỗi link cần xử lý
  if (!match) return;
  let url = match.split('?');

  if (processedLinks.has(url)) return;
  processedLinks.add(url);
  setTimeout(() => processedLinks.delete(url), 15000);

  try {
    const urlMatch = url.match(/threads\.(net|com)\/@([^\/\?]+)/);
    const backupUser = urlMatch ? `@${urlMatch}` : '@User';

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content');

    let displayName = ogTitle.split('(@').trim();
    if (!displayName || displayName.toLowerCase().includes('threads')) {
        displayName = urlMatch ? urlMatch : 'User';
    }

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`${displayName} (${backupUser}) on Threads`)
      .setURL(url)
      .setTimestamp();

    if (description) embed.setDescription(description.replace(/\n{3,}/g, '\n\n').trim());
    if (image && !image.includes("profile_pic")) embed.setImage(image);

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

  } catch (err) {
    console.error("Lỗi xử lý link:", err.message);
  }
});

client.login(process.env.TOKEN);