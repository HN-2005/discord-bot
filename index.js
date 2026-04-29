require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
const axios = require('axios');

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

// chống trùng theo link (đã normalize)
const processedLinks = new Set();

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/;
  const match = message.content.match(regex);
  if (!match) return;

  let url = match[0].split('?')[0]; // bỏ query

  if (processedLinks.has(url)) return;
  processedLinks.add(url);
  setTimeout(() => processedLinks.delete(url), 10000);

  try {
    // 🔥 gọi oEmbed
    const { data } = await axios.get(
      `https://www.threads.com/oembed?url=${encodeURIComponent(url)}`,
      { timeout: 10000 }
    );

    // 🧠 dữ liệu từ oEmbed
    const authorName = data.author_name || 'Threads User';
    const authorUrl = data.author_url || '';
    const caption = data.title || '';
    const thumb = data.thumbnail_url || null;

    // fallback username từ URL
    const userMatch = url.match(/threads\.(net|com)\/@([^\/]+)/);
    const username = userMatch ? `@${userMatch[2]}` : '';

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`${authorName} (${username}) on Threads`)
      .setURL(url)
      .setTimestamp();

    if (caption) {
      embed.setDescription(caption.replace(/\n{3,}/g, '\n\n').trim());
    }

    // 🔥 thumbnail/video thumb
    if (thumb) {
      embed.setImage(thumb);
    }

    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });

  } catch (err) {
    console.error("❌ oEmbed lỗi:", err.message);

    // fallback đơn giản nếu oEmbed fail
    await message.reply({
      content: `📎 ${url}`,
      allowedMentions: { repliedUser: false }
    });
  }
});

client.login(process.env.TOKEN);
