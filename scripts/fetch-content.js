#!/usr/bin/env node
/**
 * 内容采集脚本 v2
 * 从真实 RSS 源采集最新内容（1-2天内），每板块5篇
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ============ RSS 源配置（已验证可访问） ============
const RSS_SOURCES = {
  gaming: [
    // 中文游戏媒体，直接可用，无需翻译（经验证可访问）
    { name: '机核', url: 'https://www.gcores.com/rss', lang: 'zh' },
    { name: '触乐网', url: 'https://www.chuapp.com/feed', lang: 'zh' },
    // 英文游戏媒体（经验证，用 Atom 格式或 RSS）
    { name: 'The Verge 游戏', url: 'https://www.theverge.com/rss/games/index.xml', lang: 'en', format: 'atom' },
    { name: 'Game Developer', url: 'https://www.gamedeveloper.com/rss.xml', lang: 'en' },
  ],
  ai: [
    // Atom 格式（使用 <entry> 标签，已验证）
    { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', lang: 'en', format: 'atom' },
    // RSS 格式（已验证）
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', lang: 'en' },
    { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', lang: 'en' },
    { name: 'Ars Technica AI', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', lang: 'en' },
  ],
  golf: [
    // 高尔夫英文源（均已验证可访问）
    { name: 'ESPN 高尔夫', url: 'https://www.espn.com/espn/rss/golf/news', lang: 'en' },
    { name: 'Golf.com', url: 'https://golf.com/feed/', lang: 'en' },
  ]
};

// ============ 封面图库（Unsplash） ============
const COVER_IMAGES = {
  gaming: [
    'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&q=80',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
    'https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=800&q=80',
  ],
  ai: [
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
    'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800&q=80',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
  ],
  golf: [
    'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80',
    'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80',
    'https://images.unsplash.com/photo-1595962135319-0f7ac4f8b9ab?w=800&q=80',
    'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80',
  ]
};

function getRandomImage(category) {
  const images = COVER_IMAGES[category];
  return images[Math.floor(Math.random() * images.length)];
}

// ============ 翻译功能（仅英文内容） ============
function translateToChinese(text) {
  return new Promise((resolve) => {
    if (!text || text.length < 3) { resolve(text); return; }
    if (/[\u4e00-\u9fa5]/.test(text)) { resolve(text); return; }

    try {
      const maxLen = 400;
      const textToTranslate = text.length > maxLen ? text.substring(0, maxLen) : text;
      const encoded = encodeURIComponent(textToTranslate);
      const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|zh-CN`;
      const urlObj = new URL(url);

      const req = https.get(urlObj, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.responseStatus === 200 && json.responseData?.translatedText) {
              const translated = json.responseData.translatedText;
              // 检查翻译质量（避免返回原文或乱码）
              if (translated && translated !== textToTranslate && /[\u4e00-\u9fa5]/.test(translated)) {
                resolve(translated);
              } else {
                resolve(text);
              }
            } else {
              resolve(text);
            }
          } catch (e) { resolve(text); }
        });
      });
      req.on('error', () => resolve(text));
      req.setTimeout(8000, () => { req.destroy(); resolve(text); });
    } catch (e) { resolve(text); }
  });
}

async function translateItems(items) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const item = { ...items[i] };

    // 翻译标题
    if (!/[\u4e00-\u9fa5]/.test(item.title)) {
      console.log(`   翻译: ${item.title.substring(0, 50)}...`);
      item.title = await translateToChinese(item.title);
      await new Promise(r => setTimeout(r, 600));
    }

    // 翻译摘要
    if (item.excerpt && !/[\u4e00-\u9fa5]/.test(item.excerpt)) {
      item.excerpt = await translateToChinese(item.excerpt);
      await new Promise(r => setTimeout(r, 600));
    }

    results.push(item);
  }
  return results;
}

// ============ HTTP 请求 ============
function fetchURL(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 3) { reject(new Error('Too many redirects')); return; }

    let urlObj;
    try { urlObj = new URL(url); } catch (e) { reject(e); return; }

    const lib = urlObj.protocol === 'https:' ? https : http;

    const req = lib.get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      port: urlObj.port || undefined,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      }
    }, (res) => {
      // 跟随重定向
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${urlObj.protocol}//${urlObj.hostname}${res.headers.location}`;
        res.resume();
        fetchURL(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ============ XML 解析工具 ============
function getTagContent(xml, tagName) {
  // 支持 CDATA
  const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
  const normalRegex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');

  let m = xml.match(cdataRegex);
  if (m) return m[1].trim();
  m = xml.match(normalRegex);
  if (m) return m[1].trim();
  return '';
}

function getAttr(xml, tagName, attr) {
  const regex = new RegExp(`<${tagName}[^>]*${attr}=["']([^"']*)["'][^>]*>`, 'i');
  const m = xml.match(regex);
  return m ? m[1] : '';
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 250);
}

// 提取图片URL
function extractImageUrl(itemXml) {
  // media:content url=
  let m = itemXml.match(/<media:content[^>]*url=["']([^"']+)["']/i);
  if (m) return m[1];

  // media:thumbnail url=
  m = itemXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
  if (m) return m[1];

  // enclosure type="image/..."
  m = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image[^"']*["']/i);
  if (m) return m[1];
  m = itemXml.match(/<enclosure[^>]*type=["']image[^"']*["'][^>]*url=["']([^"']+)["']/i);
  if (m) return m[1];

  // og:image or first <img> in content
  m = itemXml.match(/<img[^>]+src=["'](https?:[^"']+)["']/i);
  if (m) return m[1];

  return null;
}

// ============ RSS 解析（<item> 格式） ============
function parseRSSFeed(xml, sourceName, category) {
  const items = [];

  // 分割 <item> 块
  const itemBlocks = xml.split(/<item[\s>]/i).slice(1);

  for (const block of itemBlocks.slice(0, 8)) {
    const title = cleanText(getTagContent(block, 'title'));
    if (!title || title.length < 4) continue;

    // link: 先尝试 <link>，再尝试 <guid>
    let link = getTagContent(block, 'link').trim();
    if (!link || !link.startsWith('http')) {
      link = getTagContent(block, 'guid').trim();
    }
    if (!link || !link.startsWith('http')) continue; // 无有效链接跳过

    const description = getTagContent(block, 'description') || getTagContent(block, 'content:encoded') || '';
    const excerpt = cleanText(description) || '点击阅读原文...';
    const pubDate = getTagContent(block, 'pubDate') || getTagContent(block, 'dc:date') || '';
    const imageUrl = extractImageUrl(block);

    let publishedAt;
    try {
      publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
    } catch (e) {
      publishedAt = new Date().toISOString();
    }

    items.push({
      title,
      source: sourceName,
      url: link,
      excerpt,
      publishedAt,
      tags: [category === 'gaming' ? '游戏' : category === 'ai' ? 'AI' : '高尔夫'],
      isFeatured: false,
      image: imageUrl
    });
  }

  return items;
}

// ============ Atom 解析（<entry> 格式，如 The Verge） ============
function parseAtomFeed(xml, sourceName, category) {
  const items = [];

  const entryBlocks = xml.split(/<entry[\s>]/i).slice(1);

  for (const block of entryBlocks.slice(0, 8)) {
    const title = cleanText(getTagContent(block, 'title'));
    if (!title || title.length < 4) continue;

    // Atom 用 <link rel="alternate" href="...">
    let link = getAttr(block, 'link', 'href');
    if (!link || !link.startsWith('http')) continue;

    const summary = getTagContent(block, 'summary') || getTagContent(block, 'content') || '';
    const excerpt = cleanText(summary) || '点击阅读原文...';
    const pubDate = getTagContent(block, 'published') || getTagContent(block, 'updated') || '';
    const imageUrl = extractImageUrl(block);

    let publishedAt;
    try {
      publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
    } catch (e) {
      publishedAt = new Date().toISOString();
    }

    items.push({
      title,
      source: sourceName,
      url: link,
      excerpt,
      publishedAt,
      tags: [category === 'gaming' ? '游戏' : category === 'ai' ? 'AI' : '高尔夫'],
      isFeatured: false,
      image: imageUrl
    });
  }

  return items;
}

// ============ 解析入口 ============
function parseFeed(xml, source, category) {
  const isAtom = source.format === 'atom' || xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');
  if (isAtom) {
    return parseAtomFeed(xml, source.name, category);
  }
  return parseRSSFeed(xml, source.name, category);
}

// ============ 过滤近2天内容 ============
function filterRecent(items, maxAgeDays = 2) {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  return items.filter(item => {
    try {
      return new Date(item.publishedAt) >= cutoff;
    } catch (e) {
      return true; // 日期解析失败就保留
    }
  });
}

// ============ 主采集函数 ============
async function fetchContent() {
  console.log('🚀 开始采集最新内容...\n');

  const content = { gaming: [], ai: [], golf: [] };

  for (const [category, sources] of Object.entries(RSS_SOURCES)) {
    const emoji = category === 'gaming' ? '🎮' : category === 'ai' ? '🤖' : '⛳';
    const name = category === 'gaming' ? '游戏' : category === 'ai' ? 'AI' : '高尔夫';
    console.log(`📥 采集 ${emoji} ${name} 板块...`);

    const allItems = [];

    for (const source of sources) {
      try {
        console.log(`   获取 ${source.name}...`);
        const xml = await fetchURL(source.url);
        const items = parseFeed(xml, source, category);
        
        // 优先取近2天内容
        const recentItems = filterRecent(items, 2);
        const useItems = recentItems.length >= 2 ? recentItems : items; // 不足则放宽限制
        
        allItems.push(...useItems.slice(0, 4));
        console.log(`   ✅ ${source.name}: ${useItems.slice(0, 4).length} 篇 (总解析 ${items.length} 篇)`);
      } catch (e) {
        console.log(`   ⚠️  ${source.name} 失败: ${e.message}`);
      }
    }

    // 按发布时间排序（最新在前）
    allItems.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // 取前5篇（目标数量）
    const selected = allItems.slice(0, 5);
    
    // 标记第一篇为 featured
    if (selected.length > 0) {
      selected[0].isFeatured = true;
    }

    // 为无图的文章添加分类默认图
    for (const item of selected) {
      if (!item.image) {
        item.image = getRandomImage(category);
      }
    }

    content[category] = selected;
    console.log(`   📊 ${name} 最终: ${selected.length} 篇\n`);
  }

  // ============ 翻译 AI 和游戏英文内容 ============
  console.log('🌐 翻译英文内容...\n');

  // 游戏：只翻译英文文章
  const gamingEn = content.gaming.filter(item => !/[\u4e00-\u9fa5]/.test(item.title));
  const gamingZh = content.gaming.filter(item => /[\u4e00-\u9fa5]/.test(item.title));
  if (gamingEn.length > 0) {
    console.log(`🎮 翻译游戏英文内容 (${gamingEn.length} 篇)...`);
    const translated = await translateItems(gamingEn);
    content.gaming = [...gamingZh, ...translated].slice(0, 5);
    // 重新排序
    content.gaming.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }

  // AI：全部翻译
  if (content.ai.length > 0) {
    console.log(`🤖 翻译 AI 内容 (${content.ai.length} 篇)...`);
    content.ai = await translateItems(content.ai);
  }

  // 高尔夫：全部翻译
  if (content.golf.length > 0) {
    console.log(`⛳ 翻译高尔夫内容 (${content.golf.length} 篇)...`);
    content.golf = await translateItems(content.golf);
  }

  // 确保 featured 标记正确
  for (const category of ['gaming', 'ai', 'golf']) {
    if (content[category].length > 0) {
      content[category].forEach(item => { item.isFeatured = false; });
      content[category][0].isFeatured = true;
    }
  }

  console.log('\n✅ 采集翻译完成');
  return content;
}

// ============ 保存结果 ============
async function saveContent(content) {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filePath = path.join(dataDir, 'content.json');
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  console.log(`✅ 已保存到 ${filePath}`);
}

// ============ 主函数 ============
async function main() {
  try {
    const content = await fetchContent();
    await saveContent(content);

    const g = content.gaming.length;
    const a = content.ai.length;
    const gf = content.golf.length;
    console.log(`\n🎉 完成！游戏 ${g} 篇 | AI ${a} 篇 | 高尔夫 ${gf} 篇（共 ${g + a + gf} 篇）`);

    // 打印文章列表
    for (const [cat, items] of Object.entries(content)) {
      const name = cat === 'gaming' ? '🎮 游戏' : cat === 'ai' ? '🤖 AI' : '⛳ 高尔夫';
      console.log(`\n${name}:`);
      items.forEach((item, i) => {
        console.log(`  ${i + 1}. [${item.source}] ${item.title.substring(0, 60)}`);
      });
    }
  } catch (error) {
    console.error('❌ 采集失败:', error.message);
    process.exit(1);
  }
}

main();
