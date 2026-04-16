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

// ✅ Fix cảnh báo DeprecationWarning và đảm bảo bot online
client.once(Events.ClientReady, (c) => {
  console.log(`🚀 Bot đã online trên Railway: ${c.user.tag}`);
});

const processedLinks = new Set();

client.on(Events.MessageCreate, async (message) => {
  // 1. Chặn bot và lọc tin nhắn không chứa link Threads
  if (message.author.bot) return;

  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/@[^\s/]+\/post\/[^\s?]+/;
  const matchLink = message.content.match(regex);
  if (!matchLink) return;

  let url = matchLink.split('?');

  // 2. Chống phản hồi trùng lặp
  if (processedLinks.has(url)) return;
  processedLinks.add(url);
  setTimeout(() => processedLinks.delete(url), 15000);

  try {
    // Tách sẵn username từ URL để dự phòng nếu cào dữ liệu thất bại
    const urlMatch = url.match(/threads\.(net|com)\/@([^\/\?]+)/);
    const backupUsername = urlMatch ? urlMatch : 'Threads User';
    const usernameTag = `@${backupUsername}`;

    const { data } = await axios.get(url, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" 
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    
    // Lấy thông tin từ Meta Tags
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content');

    // 3. Logic ép định dạng: "Tên (@username) on Threads"
    let displayName = '';
    const nameMatch = ogTitle.match(/^(.*?)\s*(\(@|on Threads)/i);
    
    if (nameMatch && nameMatch && nameMatch.trim() !== "") {
      displayName = nameMatch.trim();
    } else {
      // Nếu Threads chặn cào tiêu đề, dùng username làm tên hiển thị
      displayName = backupUsername;
    }

    const finalTitle = `${displayName} (${usernameTag}) on Threads`;

    // 4. Lọc ảnh rác (avatar) và làm sạch caption
    const isRealImage = image && !image.includes("profile_pic") && !image.includes("default");
    const cleanDescription = description.replace(/\n{3,}/g, '\n\n').trim();

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(finalTitle)
      .setURL(url)
      .setTimestamp();

    if (cleanDescription) embed.setDescription(cleanDescription);
    if (isRealImage) embed.setImage(image);

    // Gửi phản hồi
    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });

  } catch (err) {
    console.error(`❌ Lỗi xử lý link: ${err.message}`);
  }
});

// Railway sẽ dùng biến TOKEN trong phần Variables
client.login(process.env.TOKEN);