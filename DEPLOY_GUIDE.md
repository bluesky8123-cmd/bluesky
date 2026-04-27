# 每日文摘 - 一键部署指南

## 方案一：Vercel 拖拽部署（最简单，30秒完成）

### 步骤：

1. **打开 Vercel**
   访问: https://vercel.com/new

2. **拖拽部署**
   - 找到 "Import Third-Party Git Repository" 或直接拖拽选项
   - 将整个 `daily-digest` 文件夹拖入页面
   - Vercel 会自动识别为静态网站

3. **获取地址**
   等待几秒钟，你会获得一个免费 URL，例如：
   ```
   https://your-project.vercel.app
   ```

4. **绑定自定义域名（可选）**
   - 在 Vercel Dashboard 中点击项目
   - 进入 Settings → Domains
   - 添加你的域名

---

## 方案二：Cloudflare Pages（完全免费，推荐）

### 步骤：

1. **打开 Cloudflare Pages**
   访问: https://pages.cloudflare.com

2. **登录并创建项目**
   - 使用 GitHub 登录
   - 点击 "Create a project"

3. **上传文件**
   - 选择 "Direct upload" 选项
   - 将 `daily-digest` 文件夹拖入

4. **获取地址**
   ```
   https://your-project.pages.dev
   ```

---

## 方案三：GitHub + GitHub Actions（自动化部署）

### 步骤：

1. **创建 GitHub 仓库**
   - 登录 GitHub
   - 点击右上角 "+" → "New repository"
   - 命名为 `daily-digest`
   - 选择 Private（私有）或 Public（公开）

2. **上传代码**
   ```bash
   # 在本地终端执行
   cd /Users/blue/WorkBuddy/20260427115406/daily-digest
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/daily-digest.git
   git push -u origin main
   ```

3. **设置 GitHub Actions 自动部署**
   - 在仓库页面进入 Settings → Secrets
   - 添加 Vercel Token:
     - Name: `VERCEL_TOKEN`
     - Value: 从 https://vercel.com/account/tokens 获取
   - 推送代码后，GitHub Actions 会自动部署

---

## 方案四：Netlify Drop（无需登录）

### 步骤：

1. 访问: https://app.netlify.com/drop
2. 直接将 `daily-digest` 文件夹拖入
3. 获得随机 URL，如：`random-name.netlify.app`

---

## 获取可访问地址

部署完成后，请告诉我你的部署地址，我会帮你：

1. ✅ 确认页面正常显示
2. ✅ 帮你配置自动化采集
3. ✅ 设置定时更新任务

---

## 文件夹结构

```
daily-digest/
├── index.html          # 主页面（已生成）
├── template.html       # 页面模板
├── vercel.json        # Vercel 配置
├── package.json        # Node.js 配置
├── data/
│   └── content.json   # 内容数据
└── scripts/
    ├── fetch-content.js    # 内容采集脚本
    └── generate-page.js    # 页面生成脚本
```
