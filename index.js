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
  console.log(`🚀 Bot chuẩn đã online: ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/@[^\s/]+\/post\/[^\s?]+/;
  const match = message.content.match(regex);
  
  if (match) {
    // Sửa lỗi split bằng cách lấy match
    const url = match.split('?');

    try {
      const { data } = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
      });

      const $ = cheerio.load(data);
      const title = $('meta[property="og:title"]').attr('content') || 'Threads Post';
      const desc = $('meta[property="og:description"]').attr('content') || '';
      const img = $('meta[property="og:image"]').attr('content');

      const embed = new EmbedBuilder()
        .setColor('#000000')
        .setTitle(title)
        .setURL(url)
        .setDescription(desc);
      
      if (img && !img.includes('profile_pic')) embed.setImage(img);

      await message.reply({ embeds: [embed] });
    } catch (e) {
      console.log("Lỗi: " + e.message);
    }
  }
});

client.login(process.env.TOKEN);
