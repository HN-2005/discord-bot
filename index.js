 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/index.js b/index.js
index d0d04418d4355cf2727f46da9eced08e7d1b9c18..78859ef04fb18e735693a56aafa94c9df2e2fad2 100644
--- a/index.js
+++ b/index.js
@@ -1,92 +1,115 @@
-require('dotenv').config();
-
-const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
-const axios = require('axios');
-const cheerio = require('cheerio');
-
-const client = new Client({
-  intents: [
-    GatewayIntentBits.Guilds,
-    GatewayIntentBits.GuildMessages,
-    GatewayIntentBits.MessageContent
-  ]
-});
-
-client.once(Events.ClientReady, (c) => {
-  console.log(`🚀 Bot online: ${c.user.tag}`);
-});
-
-// 🧠 chống trùng link
-const processedLinks = new Set();
-
-client.on(Events.MessageCreate, async (message) => {
-  if (message.author.bot) return;
-
-  console.log("📩 Nhận:", message.content);
-
-  // 🔥 regex bắt mọi link Threads
-  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/;
-  const match = message.content.match(regex);
-  if (!match) return;
-
-  let url = match[0];
-
-  // 🔥 bỏ query (?xmt=...)
-  url = url.split('?')[0];
-
-  // 🔥 chống trùng
-  if (processedLinks.has(url)) return;
-  processedLinks.add(url);
-  setTimeout(() => processedLinks.delete(url), 10000);
-
-  try {
-    const { data } = await axios.get(url, {
-      headers: { "User-Agent": "Mozilla/5.0" },
-      timeout: 10000
-    });
-
-    const $ = cheerio.load(data);
-
-    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
-    const description = $('meta[property="og:description"]').attr('content') || '';
-    const image = $('meta[property="og:image"]').attr('content');
-
-    // 🧠 lấy username từ URL
-    const urlMatch = url.match(/threads\.(net|com)\/@([^\/]+)/);
-    const username = urlMatch ? `@${urlMatch[2]}` : '@user';
-
-    // 🧠 parse tên
-    let displayName = 'Threads User';
-
-    const nameMatch = ogTitle.match(/^(.*?)\s*\(@/);
-    if (nameMatch && !nameMatch[1].toLowerCase().includes('threads')) {
-      displayName = nameMatch[1].trim();
-    } else {
-      displayName = username.replace('@', '');
-    }
-
-    const embed = new EmbedBuilder()
-      .setColor(0x000000)
-      .setTitle(`${displayName} (${username}) on Threads`)
-      .setURL(url)
-      .setTimestamp();
-
-    if (description) {
-      embed.setDescription(description.replace(/\n{3,}/g, '\n\n').trim());
-    }
-
-    if (image && !image.includes("profile_pic")) {
-      embed.setImage(image);
-    }
-
-    await message.reply({
-      embeds: [embed],
-      allowedMentions: { repliedUser: false }
-    });
-
-  } catch (err) {
-    console.error("❌ Lỗi:", err.message);
-  }
-});
-
+require('dotenv').config();
+
+const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
+const axios = require('axios');
+const cheerio = require('cheerio');
+
+const client = new Client({
+  intents: [
+    GatewayIntentBits.Guilds,
+    GatewayIntentBits.GuildMessages,
+    GatewayIntentBits.MessageContent
+  ]
+});
+
+client.once(Events.ClientReady, (c) => {
+  console.log(`🚀 Bot online: ${c.user.tag}`);
+});
+
+// 🧠 chống trùng link
+const processedLinks = new Set();
+
+
+function pickPreviewImage($) {
+  const candidates = [
+    $('meta[property="og:image"]').attr('content'),
+    $('meta[property="og:image:secure_url"]').attr('content'),
+    $('meta[name="twitter:image"]').attr('content'),
+    $('meta[name="twitter:image:src"]').attr('content')
+  ];
+
+  for (const raw of candidates) {
+    if (!raw) continue;
+
+    const imageUrl = raw.replace(/&amp;/g, '&').trim();
+
+    if (!imageUrl.startsWith('http')) continue;
+    if (imageUrl.includes('profile_pic')) continue;
+
+    return imageUrl;
+  }
+
+  return null;
+}
+
+client.on(Events.MessageCreate, async (message) => {
+  if (message.author.bot) return;
+
+  console.log("📩 Nhận:", message.content);
+
+  // 🔥 regex bắt mọi link Threads
+  const regex = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/;
+  const match = message.content.match(regex);
+  if (!match) return;
+
+  let url = match[0];
+
+  // 🔥 bỏ query (?xmt=...)
+  url = url.split('?')[0];
+
+  // 🔥 chống trùng
+  if (processedLinks.has(url)) return;
+  processedLinks.add(url);
+  setTimeout(() => processedLinks.delete(url), 10000);
+
+  try {
+    const { data } = await axios.get(url, {
+      headers: { "User-Agent": "Mozilla/5.0" },
+      timeout: 10000
+    });
+
+    const $ = cheerio.load(data);
+
+    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
+    const description = $('meta[property="og:description"]').attr('content') || '';
+    const image = pickPreviewImage($);
+
+    // 🧠 lấy username từ URL
+    const urlMatch = url.match(/threads\.(net|com)\/@([^\/]+)/);
+    const username = urlMatch ? `@${urlMatch[2]}` : '@user';
+
+    // 🧠 parse tên
+    let displayName = 'Threads User';
+
+    const nameMatch = ogTitle.match(/^(.*?)\s*\(@/);
+    if (nameMatch && !nameMatch[1].toLowerCase().includes('threads')) {
+      displayName = nameMatch[1].trim();
+    } else {
+      displayName = username.replace('@', '');
+    }
+
+    const embed = new EmbedBuilder()
+      .setColor(0x000000)
+      .setTitle(`${displayName} (${username}) on Threads`)
+      .setURL(url)
+      .setTimestamp();
+
+    if (description) {
+      embed.setDescription(description.replace(/\n{3,}/g, '\n\n').trim());
+    }
+
+    if (image) {
+      embed.setImage(image);
+    }
+
+    await message.reply({
+      embeds: [embed],
+      allowedMentions: { repliedUser: false }
+    });
+
+  } catch (err) {
+    console.error("❌ Lỗi:", err.message);
+  }
+});
+
 client.login(process.env.TOKEN);
\ No newline at end of file
 
EOF
)
