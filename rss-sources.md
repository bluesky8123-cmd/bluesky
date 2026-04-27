# RSS 订阅源配置

## 游戏行业 (Gaming)

| 来源 | RSS 地址 | 分类 | 优先级 |
|------|---------|------|--------|
| Game Developer | https://www.gamedeveloper.com/rss.xml | 行业资讯 | ⭐⭐⭐ |
| Kotaku | https://kotaku.com/rss | 游戏新闻 | ⭐⭐⭐ |
| Gamasutra | https://www.gamasutra.com/rss/news.xml | 开发技术 | ⭐⭐ |
| IGN | https://feeds.feedburner.com/ign/all | 游戏新闻 | ⭐⭐ |
| Polygon | https://www.polygon.com/rss/index.xml | 游戏新闻 | ⭐⭐ |

### 游戏大佬 Twitter/X 关注列表
```
@tyler《三之三》 (游戏制作人)
@Greg_Kesden (Bethesda)
@PKeenGamer (独立游戏)
@GameDevDan (游戏开发)
```

---

## AI 科技 (Artificial Intelligence)

| 来源 | RSS 地址 | 分类 | 优先级 |
|------|---------|------|--------|
| Hugging Face | https://huggingface.co/blog/feed.xml | AI 研究 | ⭐⭐⭐ |
| AI Weekly | https://aiweekly.co/issues.rss | AI 周刊 | ⭐⭐⭐ |
| MIT Tech Review | https://www.technologyreview.com/feed/ | 科技评论 | ⭐⭐ |
| ArXiv cs.AI | https://arxiv.org/rss/cs.AI | 学术论文 | ⭐⭐⭐ |
| ArXiv cs.LG | https://arxiv.org/rss/cs.LG | 机器学习 | ⭐⭐⭐ |

### AI 大佬关注
```
@ylecun (Yann LeCun)
@AndrewYNg (吴恩达)
@goodfellow_ian (Ian Goodfellow)
@demaboris (Demis Hassabis)
@JeffDean (Google)
```

---

## 高尔夫 (Golf)

| 来源 | RSS 地址 | 分类 | 优先级 |
|------|---------|------|--------|
| PGA Tour | https://www.pgatour.com/news/rss.xml | 巡回赛 | ⭐⭐⭐ |
| Golf Digest | https://www.golfdigest.com/rss/index | 技巧教学 | ⭐⭐⭐ |
| Golf Channel | https://www.golfchannel.com/rss | 新闻 | ⭐⭐ |
| Golf Week | https://golfweek.com/rss/ | 评论 | ⭐ |

### 高尔夫教学频道
```
YouTube: Scratch Golf Academy
YouTube: Rick Shiels Golf
YouTube: GOLFTEC
小红书: 高尔夫教学
```

---

## 添加新的订阅源

1. 找到目标网站的 RSS 地址（通常是 `/feed.xml`、`/rss`、或 `/atom.xml`）
2. 在 `n8n-workflow.json` 中添加新的 HTTP Request 节点
3. 设置定时器触发每天更新
4. 配置 Notion 数据库字段映射

## RSS 检测工具

验证 RSS 是否有效：
- https://validator.w3.org/feed/
- https://feedburner.google.com/
