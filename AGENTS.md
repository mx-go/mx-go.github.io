# 项目协作约定

## 项目概况

这是“彩虹马的博客”的 Hexo 源码仓库，用于编写中文技术文章并发布到 GitHub Pages。

- 根 `package.json` 声明 Hexo `^5.4.0`，并保留 `package-lock.json`；不要顺手升级依赖或重写锁文件。
- `_config.yml` 当前启用 `butterfly`；本地主题位于 `themes/butterfly/`，其 `package.json` 标注版本为 `3.7.6`。
- 站点语言为 `zh-CN`，时区为 `Asia/Shanghai`。
- 永久链接为 `:title/`，`post_asset_folder` 为 `false`。
- 配置中的站点 URL 为 `https://mx-go.github.io`，`source/CNAME` 为 `rainbowhorse.site`。这是现有状态，不能凭推测自动统一域名。
- Git 部署目标为 `mx-go/mx-go.github.io` 的 `master` 分支；源码分支与发布分支不能混为一谈。

以上信息以当前文件为依据；后续工作应重新读取相关配置，避免把本文当成永远不变的事实。

## 目录与修改位置

| 路径 | 用途与约束 |
| --- | --- |
| `source/_posts/` | Markdown 文章，内容修改的主要入口 |
| `source/images/` | 文章图片，沿用现有目录结构 |
| `source/categories/index.md`、`source/tags/index.md` | 分类、标签入口，保留对应的 `type` |
| `source/404.html`、`source/CNAME` | 自定义错误页与域名配置 |
| `scaffolds/` | 新文章、页面、草稿模板 |
| `_config.yml` | Hexo 站点、搜索与部署配置 |
| `themes/butterfly/_config.yml` | 当前主题的显示与功能配置 |
| `themes/butterfly/layout/`、`source/`、`scripts/` | 主题模板、静态资源与脚本；按具体需求修改 |
| `themes/` 下其他主题 | 历史主题，不作为当前页面问题的默认修改目标 |
| `public/` | 生成的站点产物，修复应回到源码，不能直接补丁式修改 HTML |
| `.deploy_git/` | Git 部署工作目录，根仓库中记录为 gitlink；不要把它当普通源码目录编辑或重置 |
| `node_modules/` | 依赖目录，仓库已跟踪其中部分文件；不能批量清理、格式化或重新提交 |
| `mx-go.github.io/` | 现存辅助目录，不替代根目录的 Hexo 项目 |

## 工作方式

- 用中文沟通，先说明目标、依据和可验证的完成标准；需求明确时直接执行，存在影响结果的歧义时再澄清。
- 开始前检查 Git 工作区，区分本次改动与用户已有改动。只修改完成请求所需的文件，不顺手重构、重排配置或清理历史文件。
- 优先使用现有 Hexo、Markdown 和主题能力；避免为简单博客需求增加框架、插件或抽象层。
- 理解符号与调用关系时优先用可用且已建索引的 CodeGraph；文本、配置、文章与文件名检索使用 `rg`。工具不可用时正常回退。
- 日志用英文，键值占位符采用 `key:{}`；注释解释原因，避免重复代码含义。

## 文章与资源约定

- 使用 UTF-8 Markdown 和 YAML front matter，沿用 `scaffolds/post.md` 的 `title`、`date`、`tags` 字段；按内容需要补充 `categories`、`cover` 等现有主题字段。
- 保留历史文章的标题、日期、文件名、`slug`、`permalink` 和分类结构，除非任务明确要求调整。标题或文件名变化可能改变公开 URL，需检查旧链接的兼容方案。
- 新文章优先复用现有标签和分类，避免仅大小写或措辞不同的重复分类。
- 技术结论、命令和代码示例需有依据；涉及版本差异时标明适用版本，不编造运行结果。保留引用与转载来源。
- 代码块标明语言；摘要沿用文章既有的 `<!-- more -->` 风格（如有）。不批量改写旧文章的 Markdown 或内嵌 HTML。
- 新图片放在 `source/images/` 的合适子目录，优先使用 `/images/...` 形式的站点路径。已有相对路径仅在本次需求涉及且确认解析错误时修复。
- 不开启文章资源文件夹来解决单篇文章的图片问题；调整后检查正文图片、封面和移动端展示。

## 本地命令与验证

根 `package.json` 没有 npm scripts，不要假设存在 `npm run build`、`npm test` 或项目级 lint。优先使用现有本地 CLI，避免 `npx` 自动下载其他版本：

```bash
# 查看本地工具与运行环境
node --version
npm --version
./node_modules/.bin/hexo version

# 创建文章或草稿
./node_modules/.bin/hexo new post "文章标题"
./node_modules/.bin/hexo new draft "文章标题"

# 生成站点，不附带部署参数
./node_modules/.bin/hexo generate

# 本地预览
./node_modules/.bin/hexo server --ip 127.0.0.1
```

- 依赖缺失时先核对锁文件、Node/npm 环境及现有依赖状态。当前仓库跟踪部分依赖，安装或 `npm ci` 可能产生大量变动，不作为日常检查步骤自动执行。
- 修改文章、主题或站点配置后运行生成命令，检查退出码与错误日志。构建通过后，按变更范围检查首页、目标文章、分类/标签、搜索、图片及桌面/移动布局。
- 检查输出中的链接、代码高亮和静态资源；涉及域名或模板时，特别检查 canonical、站内链接与 `CNAME`。
- 仅修改本文件等协作文档时，检查内容、路径、命令与差异即可，无需生成整站。
- `hexo clean` 会删除缓存和生成目录；仅在确有缓存问题并确认产物没有手工改动时使用。
- 结束前核对差异，只提交任务相关源码；禁止用 `git add .` 混入已有依赖、主题、部署目录或站点产物的改动。未执行的验证必须明确说明。

## 发布与外部服务

- 本地生成与线上发布是不同操作。仅在用户明确授权发布时运行 `hexo deploy`、`hexo generate --deploy` 或推送发布分支。
- 发布前核对部署仓库、分支、域名与生成结果，保留 `source/CNAME`。不擅自修改 DNS、切换主题、变更永久链接规则或强制推送。
- 搜索配置包含 Algolia，评论相关脚本涉及外部服务；本地内容或样式验证不应顺带上传搜索索引或修改评论数据。
- `del_latest.sh` 包含删除线上评论的操作，只能在明确授权相应删除任务后使用。
- 不将服务密钥、令牌或管理凭据写入新文档、示例、日志、提交说明或构建产物；发现已有敏感配置时只报告字段位置，不复述值，不擅自更换凭据。

## 交付说明

简要说明改了什么、为什么、执行了哪些验证及结果；列出尚未验证或受环境限制的部分。不要把本地生成成功表述成已上线。
