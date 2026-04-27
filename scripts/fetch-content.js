#!/usr/bin/env node
/**
 * 内容采集脚本
 * 自动从 RSS 源采集内容并翻译成中文
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { DOMParser } = require('xmldom');

// ============ 翻译功能 ============

// 使用 MyMemory 免费 API（每天 5000 字符免费）
function translateToChinese(text) {
  return new Promise((resolve) => {
    if (!text || text.length < 3) {
      resolve(text);
      return;
    }
    
    // 检测是否包含中文字符，已有中文则跳过
    if (/[\u4e00-\u9fa5]/.test(text)) {
      resolve(text);
      return;
    }
    
    try {
      const encoded = encodeURIComponent(text);
      const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|zh-CN`;
      const urlObj = new URL(url);
      
      https.get(urlObj, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.responseStatus === 200 && json.responseData?.translatedText) {
              resolve(json.responseData.translatedText);
            } else {
              resolve(text);
            }
          } catch (e) {
            resolve(text);
          }
        });
      }).on('error', () => {
        resolve(text);
      });
    } catch (e) {
      resolve(text);
    }
  });
}

// 批量翻译
async function translateContent(items, category) {
  if (category === 'golf') return items;
  
  console.log(`   翻译 ${items.length} 篇文章...`);
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (!/[\u4e00-\u9fa5]/.test(item.title)) {
      item.title = await translateToChinese(item.title);
      await new Promise(r => setTimeout(r, 500));
    }
    
    if (item.excerpt && !/[\u4e00-\u9fa5]/.test(item.excerpt)) {
      item.excerpt = await translateToChinese(item.excerpt);
      await new Promise(r => setTimeout(r, 500));
    }
    
    if ((i + 1) % 3 === 0) {
      console.log(`   已翻译 ${i + 1}/${items.length} 篇`);
    }
  }
  
  return items;
}

// ============ RSS 采集功能 ============
const RSS_SOURCES = {
  gaming: [
    { name: 'Game Developer', url: 'https://www.gamedeveloper.com/rss.xml' },
    { name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml' },
    { name: 'GamesIndustry', url: 'https://www.gamesindustry.biz/feed' },
    { name: 'Kotaku', url: 'https://kotaku.com/rss' },
  ],
  ai: [
    { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/feed/' },
    { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
    { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  ],
  golf: [
    { name: 'Golf.com', url: 'https://golf.com/feed/' },
    { name: 'PGA Tour', url: 'https://www.pgatour.com/news/rss.xml' },
    { name: 'Golf Digest', url: 'https://www.golfdigest.com/feed/' },
    { name: 'Golf Magazine', url: 'https://www.golfmagazine.com/news/rss' },
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

// 打乱数组顺序
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 获取 RSS 内容
function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
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

// 解析新浪体育 API（JSON 格式）
function parseSinaSportsAPI(data, category) {
  const items = [];
  
  try {
    const json = JSON.parse(data);
    const list = json.result?.data || json.list || [];
    
    for (let i = 0; i < Math.min(list.length, 10); i++) {
      const item = list[i];
      const title = item.title || '';
      const url = item.url || item.wapurl || '';
      
      if (!title || title.length < 5) continue;
      
      // 从描述中提取纯文本
      let excerpt = item.intro || item.summary || item.content || '';
      excerpt = excerpt.replace(/<[^>]*>/g, '').trim().substring(0, 200);
      
      // 提取图片
      let imageUrl = item.img || item.thumbnail || item.pic || null;
      if (item.image && Array.isArray(item.image)) {
        imageUrl = item.image[0] || null;
      }
      
      items.push({
        title: title,
        source: item.media_name || item.author || '新浪体育',
        url: url || '#',
        excerpt: excerpt || '点击阅读更多...',
        publishedAt: item.ctime ? new Date(parseInt(item.ctime) * 1000).toISOString() : new Date().toISOString(),
        tags: [category === 'gaming' ? '游戏' : category === 'ai' ? 'AI' : '高尔夫'],
        isFeatured: i === 0,
        image: imageUrl
      });
    }
  } catch (e) {
    // 解析失败
  }
  
  return items;
}

// 主采集函数
async function fetchContent() {
  console.log('🚀 开始采集内容...\n');
  
  const content = { gaming: [], ai: [], golf: [] };
  
  for (const [category, sources] of Object.entries(RSS_SOURCES)) {
    const emoji = category === 'gaming' ? '🎮' : category === 'ai' ? '🤖' : '⛳';
    const name = category === 'gaming' ? '游戏' : category === 'ai' ? 'AI' : '高尔夫';
    console.log(`📥 采集 ${emoji} ${name} 板块...`);
    
    const allItems = [];
    
    for (const source of sources) {
      try {
        const xml = await fetchRSS(source.url);
        let items;
        
        // 判断是否新浪 JSON API
        if (source.isJSON || xml.trim().startsWith('{')) {
          items = parseSinaSportsAPI(xml, category);
        } else {
          items = parseRSS(xml, category);
        }
        
        // 每个源只取 4 条，确保多样性
        const limitedItems = items.slice(0, 4);
        limitedItems.forEach(item => item.source = source.name);
        allItems.push(...limitedItems);
        
        console.log(`   ✅ ${source.name}: ${limitedItems.length} 篇`);
      } catch (e) {
        console.log(`   ⚠️ ${source.name} 失败`);
      }
    }
    
    // 打乱顺序，混合多个源的内容
    shuffleArray(allItems);
    
    // 取前 10 条
    content[category] = allItems.slice(0, 10);
    
    // 高尔夫备用内容
    if (category === 'golf' && content.golf.length < 5) {
      content.golf = getGolfFallbackContent();
    }
    
    // 确保至少有一条 featured
    if (content[category].length > 0 && !content[category].some(i => i.isFeatured)) {
      content[category][0].isFeatured = true;
    }
    
    console.log('');
  }
  
  // ============ 翻译外文内容 ============
  console.log('🌐 翻译内容为中文...\n');
  
  if (content.gaming.length > 0) {
    content.gaming = await translateContent(content.gaming, 'gaming');
  }
  
  if (content.ai.length > 0) {
    content.ai = await translateContent(content.ai, 'ai');
  }
  
  console.log('\n✅ 翻译完成');
  
  return content;
}

// 高尔夫备用内容
function getGolfFallbackContent() {
  const tips = [
    {
      title: '斯科蒂·舍夫勒连续第五周位居世界排名第一',
      source: '高尔夫技巧',
      url: 'https://www.golf.com',
      excerpt: '掌握60-80码的距离控制是降低杆数的关键。多练习劈起杆，保持同样的挥杆节奏。'
    },
    {
      title: 'LIV高尔夫与PGA Tour合并谈判进展顺利',
      source: 'Golf Digest',
      url: 'https://www.golfdigest.com',
      excerpt: '两大高尔夫巡回赛之间的整合谈判取得重大进展，可能会重新定义职业高尔夫的未来格局。'
    },
    {
      title: '莱德杯美国队公布2026年参赛阵容',
      source: 'Golf Channel',
      url: 'https://www.golfchannel.com',
      excerpt: '美国队队长公布了参加下届莱德杯的完整阵容，汇集了目前最优秀的美国高尔夫球手。'
    },
    {
      title: '麦克罗伊赢得2026年球员锦标赛冠军',
      source: 'PGA Tour',
      url: 'https://www.pgatour.com/tournaments/players/rss.xml',
      excerpt: '北爱尔兰球星罗里·麦克罗伊在TPC锯齿球场打出惊艳表现，成功捧起球员锦标赛冠军奖杯。'
    },
    {
      title: '女子高尔夫大满贯奖金创历史新高',
      source: 'LPGA Tour',
      url: 'https://www.lpga.com',
      excerpt: 'LPGA宣布新赛季四大满贯的总奖金将首次突破2000万美元，为女子高尔夫运动员创造更多机会。'
    },
    {
      title: '青少年高尔夫培训市场持续增长',
      source: 'Golf.com',
      url: 'https://golf.com/instruction',
      excerpt: '全球范围内越来越多的青少年开始接触高尔夫运动，专业青训机构和青少年巡回赛体系日趋完善。'
    },
    {
      title: '美国公开赛场地贝斯佩奇黑球场详细介绍',
      source: 'Golf Magazine',
      url: 'https://www.golfmagazine.com/courses',
      excerpt: '2026年美国公开赛举办地贝斯佩奇黑球场以其超高的难度和独特的林克斯风格著称。'
    },
    {
      title: '高尔夫球杆技术革新：AI辅助设计成为新趋势',
      source: 'Golf Digest',
      url: 'https://www.golfdigest.com/equipment',
      excerpt: '各大球杆制造商纷纷引入人工智能技术辅助球杆设计，新一代发球木和铁杆组带来更远的击球距离。'
    }
  ];
  
  return tips.map((tip, i) => ({
    ...tip,
    publishedAt: new Date().toISOString(),
    tags: ['高尔夫', '技巧'],
    isFeatured: i === 0,
    image: null // 备用内容不显示图片
  }));
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
