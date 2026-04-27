#!/usr/bin/env node
/**
 * 页面生成脚本
 * 根据采集的内容生成 HTML 页面
 */

const fs = require('fs');
const path = require('path');

// 读取采集的内容
function loadContent() {
  const filePath = path.join(__dirname, '..', 'data', 'content.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return null;
}

// 格式化日期
function formatDate(date) {
  const d = new Date(date);
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  };
  return d.toLocaleDateString('zh-CN', options);
}

// 相对时间
function timeAgo(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return '昨天';
}

// 生成文章卡片 HTML
function generateArticleCard(article, category) {
  const colorMap = {
    gaming: { accent: '#d85a30', tag: 'badge-gaming' },
    ai: { accent: '#378add', tag: 'badge-ai' },
    golf: { accent: '#1d9e75', tag: 'badge-golf' }
  };
  const colors = colorMap[category];
  
  let html = '';
  
  if (article.isFeatured) {
    html += `
    <article class="article-card featured">
      ${article.image ? `<img src="${article.image}" alt="${article.title}" class="article-image">` : ''}
      <div class="article-content">
        <div class="article-meta">
          <span class="article-source" style="color: ${colors.accent}">${article.source}</span>
          <span class="article-time">${timeAgo(article.publishedAt)}</span>
        </div>
        <h3 class="article-title">${article.title}</h3>
        <p class="article-excerpt">${article.excerpt}</p>
        <div class="article-tags">
          ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <a href="${article.url}" target="_blank" class="read-more">阅读原文 →</a>
      </div>
    </article>`;
  } else {
    html += `
    <article class="article-card">
      <div class="article-content">
        <div class="article-meta">
          <span class="article-source" style="color: ${colors.accent}">${article.source}</span>
          <span class="article-time">${timeAgo(article.publishedAt)}</span>
        </div>
        <h3 class="article-title">${article.title}</h3>
        <p class="article-excerpt">${article.excerpt}</p>
        <div class="article-tags">
          ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
    </article>`;
  }
  
  return html;
}

// 生成板块 HTML
function generateSection(articles, category, title, icon) {
  const badgeClass = `badge-${category}`;
  
  return `
    <section class="content-section">
      <div class="section-badge ${badgeClass}">
        ${icon}
        ${title}
      </div>

      <div class="section-header">
        <h2 class="section-title">${category === 'gaming' ? 'Gaming' : category === 'ai' ? 'Artificial Intelligence' : 'Golf'}</h2>
        <div class="section-line"></div>
      </div>

      <div class="articles-grid">
        ${articles.map(a => generateArticleCard(a, category)).join('')}
      </div>
    </section>`;
}

// 主函数
function generatePage() {
  const content = loadContent();
  
  if (!content) {
    console.log('没有内容，跳过页面生成');
    return;
  }
  
  const today = formatDate(new Date());
  
  // 读取模板
  const templatePath = path.join(__dirname, '..', 'template.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  // 替换内容占位符
  template = template.replace('{{DATE}}', today);
  template = template.replace('{{GAMING_CONTENT}}', generateSection(content.gaming, 'gaming', '游戏行业', `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <path d="M6 12h4M8 10v4M15 11h2M15 13h2"/>
    </svg>
  `));
  template = template.replace('{{AI_CONTENT}}', generateSection(content.ai, 'ai', 'AI 科技', `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  `));
  template = template.replace('{{GOLF_CONTENT}}', generateSection(content.golf, 'golf', '高尔夫', `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  `));
  
  // 保存生成的页面
  const outputPath = path.join(__dirname, '..', 'index.html');
  fs.writeFileSync(outputPath, template);
  console.log(`页面已生成: ${outputPath}`);
}

generatePage();
