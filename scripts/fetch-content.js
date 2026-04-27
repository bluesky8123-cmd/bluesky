#!/usr/bin/env node
/**
 * 内容采集脚本
 * 自动从 RSS 源采集内容
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { DOMParser } = require('xmldom');

// RSS 订阅列表 - 优化版
const RSS_SOURCES = {
  gaming: [
    { name: 'Game Developer', url: 'https://www.gamedeveloper.com/rss.xml' },
    { name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml' },
    { name: 'Gamasutra', url: 'https://www.gamedeveloper.com/rss.xml' },
    { name: 'GamesIndustry', url: 'https://www.gamesindustry.biz/feed' },
  ],
  ai: [
    { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/feed/' },
    { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
    { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  ],
  golf: [
    { name: '新浪高尔夫', url: 'https://rss.sina.com.cn/sports/golf.xml' },
    { name: '搜狐高尔夫', url: 'https://rss.sohu.com/golf.xml' },
    { name: '凤凰高尔夫', url: 'https://sports.ifeng.com/golf/rss.xml' },
  ]
};

// 获取随机封面图
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

// 随机选择封面图
function getRandomImage(category) {
  const images = COVER_IMAGES[category];
  return images[Math.floor(Math.random() * images.length)];
}

// 从 RSS 项中提取图片 URL
function extractImage(item) {
  // 尝试多种方式提取图片
  const enclosures = item.getElementsByTagName('enclosure');
  if (enclosures.length > 0) {
    const type = enclosures[0].getAttribute('type') || '';
    if (type.startsWith('image') || type.includes('jpg') || type.includes('png')) {
      return enclosures[0].getAttribute('url');
    }
  }
  
  // 尝试 media:content
  const mediaContent = item.getElementsByTagName('media:content');
  if (mediaContent.length > 0) {
    return mediaContent[0].getAttribute('url');
  }
  
  // 尝试 media:thumbnail
  const mediaThumbnail = item.getElementsByTagName('media:thumbnail');
  if (mediaThumbnail.length > 0) {
    return mediaThumbnail[0].getAttribute('url');
  }
  
  // 从 description 或 content 中提取第一张图片
  const description = item.getElementsByTagName('description');
  const content = item.getElementsByTagName('content:encoded');
  const text = (description.length > 0 ? description[0].textContent : '') + 
               (content.length > 0 ? content[0].textContent : '');
  
  const imgMatch = text.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) {
    return imgMatch[1];
  }
  
  return null; // 无图片
}

// 清理 HTML 标签和特殊字符
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')  // 移除 HTML 标签
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<!\[CDATA\[.*?\]\]>/gs, '')  // 移除 CDATA
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 300);
}

// 解析 RSS XML
function parseRSS(xml, category) {
  const items = [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const entries = doc.getElementsByTagName('item');
    
    // 每个源取 10 条
    for (let i = 0; i < Math.min(entries.length, 10); i++) {
      const entry = entries[i];
      
      const getTagText = (tagName) => {
        const elements = entry.getElementsByTagName(tagName);
        return elements.length > 0 ? elements[0].textContent || '' : '';
      };
      
      const title = cleanText(getTagText('title'));
      const link = getTagText('link');
      const description = cleanText(getTagText('description') || getTagText('content:encoded') || getTagText('summary'));
      const pubDate = getTagText('pubDate');
      
      // 提取图片
      const imageUrl = extractImage(entry);
      
      if (!title || title.length < 5) continue;
      
      items.push({
        title: title,
        source: '',
        url: link || '#',
        excerpt: description || '点击阅读更多...',
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        tags: [category === 'gaming' ? '游戏' : category === 'ai' ? 'AI' : '高尔夫'],
        isFeatured: i === 0,
        image: imageUrl // 使用原文图片，无图则为 null
      });
    }
  } catch (e) {
    // 静默处理解析错误
  }
  
  return items;
}

// 获取 RSS 内容
function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
    }, (res) => {
      let data = '';
      
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : `https://${urlObj.hostname}${res.headers.location}`;
        fetchRSS(redirectUrl).then(resolve).catch(reject);
        return;
      }
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// 主采集函数
async function fetchContent() {
  console.log('🚀 开始采集内容...\n');
  
  const content = { gaming: [], ai: [], golf: [] };
  
  for (const [category, sources] of Object.entries(RSS_SOURCES)) {
    const emoji = category === 'gaming' ? '🎮' : category === 'ai' ? '🤖' : '⛳';
    const name = category === 'gaming' ? '游戏' : category === 'ai' ? 'AI' : '高尔夫';
    console.log(`📥 采集 ${emoji} ${name} 板块...`);
    
    for (const source of sources) {
      try {
        const xml = await fetchRSS(source.url);
        const items = parseRSS(xml, category);
        
        items.forEach(item => item.source = source.name);
        content[category].push(...items);
        
        console.log(`   ✅ ${source.name}: ${items.length} 篇`);
      } catch (e) {
        console.log(`   ⚠️ ${source.name} 失败`);
      }
    }
    
    // 每个板块限制 10 条
    content[category] = content[category].slice(0, 10);
    
    // 确保至少有一条 featured
    if (content[category].length > 0 && !content[category].some(i => i.isFeatured)) {
      content[category][0].isFeatured = true;
    }
    
    console.log('');
  }
  
  return content;
}

// 保存采集结果
async function saveContent(content) {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filePath = path.join(dataDir, 'content.json');
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  console.log(`✅ 内容已保存`);
}

// 主函数
async function main() {
  try {
    const content = await fetchContent();
    await saveContent(content);
    
    const total = content.gaming.length + content.ai.length + content.golf.length;
    console.log(`\n🎉 完成！共 ${total} 篇文章`);
  } catch (error) {
    console.error('❌ 采集失败:', error.message);
    process.exit(1);
  }
}

main();
