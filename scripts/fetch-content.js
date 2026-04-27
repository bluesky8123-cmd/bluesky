#!/usr/bin/env node
/**
 * 内容采集脚本
 * 自动从 RSS 源采集内容
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { DOMParser } = require('xmldom'); // 内置解析器

// RSS 订阅列表
const RSS_SOURCES = {
  gaming: [
    { name: 'Game Developer', url: 'https://www.gamedeveloper.com/rss.xml' },
    { name: 'Kotaku', url: 'https://kotaku.com/rss' },
  ],
  ai: [
    { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml' },
    { name: 'AI Weekly', url: 'https://aiweekly.co/issues.rss' },
  ],
  golf: [
    { name: 'Golf Digest', url: 'https://www.golfdigest.com/rss/index' },
    { name: 'Golf Channel', url: 'https://www.golfchannel.com/feed/' },
  ]
};

// 获取随机封面图
const COVER_IMAGES = {
  gaming: [
    'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&q=80',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80'
  ],
  ai: [
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
    'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800&q=80'
  ],
  golf: [
    'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80',
    'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80',
    'https://images.unsplash.com/photo-1595962135319-0f7ac4f8b9ab?w=800&q=80'
  ]
};

// 随机选择封面图
function getRandomImage(category) {
  const images = COVER_IMAGES[category];
  return images[Math.floor(Math.random() * images.length)];
}

// 解析 RSS XML
function parseRSS(xml, category) {
  const items = [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const entries = doc.getElementsByTagName('item');
    
    for (let i = 0; i < Math.min(entries.length, 5); i++) {
      const entry = entries[i];
      const getTextContent = (tagName) => {
        const elements = entry.getElementsByTagName(tagName);
        return elements.length > 0 ? elements[0].textContent.trim() : '';
      };
      
      const title = getTextContent('title');
      const link = getTextContent('link');
      const description = getTextContent('description');
      const pubDate = getTextContent('pubDate');
      
      // 清理 HTML 标签
      const cleanText = (text) => {
        if (!text) return '';
        return text.replace(/<[^>]*>/g, '').substring(0, 200);
      };
      
      if (title) {
        items.push({
          title: cleanText(title),
          source: category === 'gaming' ? 'Game News' : 
                 category === 'ai' ? 'AI News' : 'Golf News',
          url: link || '#',
          excerpt: cleanText(description) || '点击阅读更多...',
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          tags: [category === 'gaming' ? '游戏' : category === 'ai' ? 'AI' : '高尔夫'],
          isFeatured: i === 0,
          image: getRandomImage(category)
        });
      }
    }
  } catch (e) {
    console.error(`解析 ${category} RSS 失败:`, e.message);
  }
  
  return items;
}

// 获取 RSS 内容
function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// 主采集函数
async function fetchContent() {
  console.log('🚀 开始采集内容...');
  
  const content = { gaming: [], ai: [], golf: [] };
  
  for (const [category, sources] of Object.entries(RSS_SOURCES)) {
    console.log(`📥 采集 ${category} 板块...`);
    
    for (const source of sources) {
      try {
        console.log(`   → ${source.name}`);
        const xml = await fetchRSS(source.url);
        const items = parseRSS(xml, category);
        
        // 添加来源信息
        items.forEach(item => item.source = source.name);
        content[category].push(...items);
      } catch (e) {
        console.log(`   ⚠️ ${source.name} 采集失败`);
      }
    }
    
    // 每个板块最多 3 篇
    content[category] = content[category].slice(0, 3);
    
    // 确保至少有一篇精选
    if (content[category].length > 0 && !content[category].some(i => i.isFeatured)) {
      content[category][0].isFeatured = true;
    }
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
  console.log(`✅ 内容已保存到 ${filePath}`);
  
  return filePath;
}

async function main() {
  try {
    const content = await fetchContent();
    await saveContent(content);
    console.log('🎉 内容采集完成!');
  } catch (error) {
    console.error('❌ 采集失败:', error);
    process.exit(1);
  }
}

main();
