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

// 相对时间
function timeAgo(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 172800) return '昨天';
  return Math.floor(diff / 86400) + ' 天前';
}

// 生成文章卡片 HTML
function generateArticleCard(article, category) {
  const colorClass = `source-${category}`;
  const icons = {
    gaming: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 11h2M15 13h2"/></svg>`,
    ai: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
    golf: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
  };
  
  // 图片部分（有图就显示小缩略图在右侧，无图则隐藏）
  const imageHtml = article.image ? `
    <div class="article-thumb">
      <img src="${article.image}" alt="" onerror="this.parentElement.style.display='none'">
    </div>
  ` : '';
  
  // Featured 卡片（第一篇文章，大图）
  if (article.isFeatured) {
    const featuredImage = article.image ? `
      <img src="${article.image}" alt="${article.title}" class="article-image" onerror="this.style.display='none';this.parentElement.classList.remove('has-image')">
    ` : '';
    return `
    <div class="article-card featured ${article.image ? 'has-image' : ''}">
      ${featuredImage}
      <div class="featured-inner">
        <div class="article-content">
          <div class="article-meta">
            <span class="article-source ${colorClass}">${article.source}</span>
            <span class="article-time">${timeAgo(article.publishedAt)}</span>
          </div>
          <h3 class="article-title">${article.title}</h3>
          <p class="article-excerpt">${article.excerpt}</p>
          <div class="article-tags">
            ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
          <a href="${article.url}" target="_blank" class="read-more">
            阅读原文
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </div>`;
  }
  
  // 普通卡片（带右侧小图）
  return `
  <article class="article-card ${article.image ? 'with-thumb' : ''}">
    <div class="article-content">
      <div class="article-meta">
        <span class="article-source ${colorClass}">${article.source}</span>
        <span class="article-time">${timeAgo(article.publishedAt)}</span>
      </div>
      <h3 class="article-title">${article.title}</h3>
      <p class="article-excerpt">${article.excerpt}</p>
      <div class="article-tags">
        ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    </div>
    ${imageHtml}
  </article>`;
}

// 生成板块 HTML
function generateSection(articles, category, title, icon, subtitle) {
  if (articles.length === 0) return '';
  
  const badgeClass = `badge-${category}`;
  const categoryName = category === 'gaming' ? 'Gaming' : category === 'ai' ? 'AI' : 'Golf';
  
  return `
    <section class="content-section">
      <div class="section-badge ${badgeClass}">
        ${icon}
        ${title}
      </div>

      <div class="section-header">
        <h2 class="section-title">${categoryName}</h2>
        <span class="section-subtitle">${subtitle}</span>
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
  
  // 读取模板
  const templatePath = path.join(__dirname, '..', 'template.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  // 生成内容
  const sections = [
    generateSection(content.gaming, 'gaming', '游戏行业', `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 11h2M15 13h2"/></svg>
    `, '游戏开发 · 行业动态'),
    generateSection(content.ai, 'ai', 'AI 科技', `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
    `, '人工智能 · 技术前沿'),
    generateSection(content.golf, 'golf', '高尔夫', `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    `, '技巧教学 · 巡回赛况')
  ];
  
  template = template.replace('{{CONTENT}}', sections.join('\n'));
  
  // 保存生成的页面
  const outputPath = path.join(__dirname, '..', 'index.html');
  fs.writeFileSync(outputPath, template);
  console.log(`页面已生成: ${outputPath}`);
}

generatePage();
