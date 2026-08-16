# dsh-deepseek-balance

> 仓库名、npm 包名、插件 id 统一为 `dsh-deepseek-balance`。

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) **Web 界面**插件:在侧边栏"**设置**"按钮正上方**常显** DeepSeek API 用量条(余额 / 消费金额 / API 请求 / Tokens),点击展开完整卡片——按模型、按时间维度查看消费,官方累计消费,支持浅色/深色主题,每分钟自动刷新。

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) **web GUI** plugin: an always-visible DeepSeek API usage strip **above the Settings button** in the sidebar (balance / spent / requests / tokens), expanding into a full card — per-model and per-period usage, official cumulative spend, light/dark theme support, auto-refresh every minute.

![布局示意: 侧边栏底部为用量条,卡片锚定在条的右方](docs/layout.svg)

## Features / 功能

- 侧边栏"设置"上方**常显用量条**:`余额 0.74 · 消费 11.99 · 请求 1.1k · Tkn 302M`(横向排列,窄条自动换行),每分钟自动刷新,低余额变黄;
- 点击展开**参考风格用量卡片**(260px,锚定在条**右方** 14px,不遮挡侧边栏;打开时不压暗背景);
- **模型选择器**:列出平台用量中的模型分类(`deepseek-v4-pro` / `deepseek-v4-flash` / `deepseek-chat & deepseek-reasoner`,无平台令牌时回退到 harness 模型目录)——选中后**消费金额 / API 请求 / Tokens 与迷你柱状图都切换为该模型的数据**;
- **时间维度**:今天 / 昨天 / 近7天 / 近30天 / 本月 / 上月(选择同步到条的右端金额);
- **API Key 选择器**:列出已配置的 DeepSeek 密钥(掩码显示),可切换查询的 key;
- **充值余额 / 累计消费**:累计消费为**官方数据**(平台 `get_user_summary` 的 total_costs),无平台令牌时回退到余额差值估算(显示 `≈`);
- **令牌管理**:卡片底部【手动输入】【自动获取】——自动获取直接从浏览器配置(Chrome/Edge)提取平台令牌并自动保存;手动输入可粘贴保存;操作提示 5 秒后自动消失;
- **选择持久化**:时间维度 / API Key / 模型选择存于 localStorage,刷新页面不丢失;
- **下拉交互**:点击任意空白处关闭下拉;选项点击正常选中;
- **浅色 / 深色主题自适应**(完整双调色板,监听主题切换实时更新);
- API Key 不出本机:浏览器只访问本地路由,密钥在服务端按需解析。

## Install / 安装入口

需要 DSH CLI 与 [pnpm](https://pnpm.io/installation)。

```sh
# 方式一:从 GitHub 安装(推荐)
dsh plugin --profile web add github:qianTouchFish/dsh-deepseek-balance

# 方式二:完整 git URL
dsh plugin --profile web add git+https://github.com/qianTouchFish/dsh-deepseek-balance.git

# 方式三:本地目录(开发调试)
cd dsh-deepseek-balance && dsh plugin --profile web add .
```

包声明了 `dsh.bundle`,`dsh plugin` 会自动把它加入 profile 的 bundle 层。然后:

1. 重启 Web 应用(桌面图标 / `dsh web`),刷新页面;
2. 侧边栏底部、**设置按钮上方**即出现用量条。

> 手动安装(不用 `dsh plugin`):把包放进 profile 的 `node_modules`,并在 `~/.dsh/profiles/web/cordis.patch.yml` 追加:
>
> ```yaml
> - insert:
>     - id: dsh-deepseek-balance
>       name: dsh-deepseek-balance
> ```

## Configuration / 配置

插件通过 harness 的凭据服务读取两个引用:

| 凭据 | 必需 | 作用 |
|---|---|---|
| `DEEPSEEK_API_KEY` | ✅ 必需 | 余额实时查询(与 harness 模型同源;可在 **设置 → 模型** 页面填写,存于 `~/.dsh/.credentials.yaml`) |
| `DEEPSEEK_PLATFORM_TOKEN` | ⭕ 可选 | 解锁官方 **Tokens / 请求次数 / 按模型分类 / 官方累计消费**(否则这些显示 "—" 或 "≈") |

### 获取 DEEPSEEK_PLATFORM_TOKEN

DeepSeek API 不公开用量查询接口;官方数据来自平台控制台所用会话令牌。两种方式:

1. **自动(卡片内一键)**:打开卡片 → 底部【自动获取】→ 插件自动扫描你的 Chrome/Edge 浏览器配置,提取 `userToken` 并保存;
2. **手动**:浏览器登录 https://platform.deepseek.com → F12 → Console 执行:
   ```js
   JSON.parse(localStorage.getItem('userToken')).value
   ```
   把输出追加到 `~/.dsh/.credentials.yaml`:
   ```yaml
   DEEPSEEK_PLATFORM_TOKEN: <那串令牌>
   ```

凭据服务会自动热加载,无需重启即可识别(插件 bundle 更新仍需重启)。

## Data sources / 数据来源

| 数据 | 来源 | 说明 |
|---|---|---|
| 余额 / 可用状态 / 充值余额 | `api.deepseek.com/user/balance` | 官方实时 |
| **累计消费** | `platform.deepseek.com/api/v0/users/get_user_summary`(`total_costs`) | 官方累计;无平台令牌时回退余额差值**估算**(`$DSH_HOME/storages/dsh-deepseek-balance.json`,充值自动校正,显示 `≈`) |
| 各时间维度消费 / Tokens / 请求次数 / **按模型分类** | `platform.deepseek.com/api/v0/usage/amount` + `/usage/cost`(当前月 + 上月) | 官方平台数据(与控制台一致),需 `DEEPSEEK_PLATFORM_TOKEN` |

## How it works / 工作原理

| 部分 | 文件 | 作用 |
|---|---|---|
| 宿主侧 | `lib/index.js` | Cordis 插件(`inject: credentials, webServer, llm`),注册 `GET /api/deepseek-status` 与 `POST /api/deepseek-token`(保存 / 自动获取平台令牌) |
| 状态采集 | `lib/status.js` | 余额拉取、凭据枚举(maskKey / collectKeys)、模型目录枚举(collectModels)、差值跟踪兜底 |
| 平台用量 | `lib/platform.js` | usage/amount + usage/cost + get_user_summary 解析;账户级 + 按模型的六个时间切片 |
| 令牌自动提取 | `lib/token.js` | 无头 Chrome/Edge + DevTools 协议从浏览器配置读取 `userToken` |
| 浏览器侧 | `lib/client.js` | `dsh.client` web bundle:侧边栏用量条 + 自绘卡片(模型/时间/Key 选择、迷你图表、令牌管理),60 秒轮询,主题自适应,localStorage 持久化 |
| 组合层 | `cordis.patch.yml` | `dsh.bundle` 补丁,插入加载项 |

## Development / 开发

```sh
# 本地安装(link 到源码目录,改完重启即生效,无需重装)
dsh plugin --profile web add .

# 冒烟测试(无需 harness)
node test-status.mjs   # 服务端逻辑(真实 key / 平台解析 / 差值跟踪 / 官方累计消费)
node test-client.cjs   # 客户端 bundle 加载与注册
```

修改 `lib/client.js` 后需重启 `dsh web` 并强制刷新页面(Ctrl+Shift+R)。

## Uninstall / 卸载

```sh
dsh plugin --profile web remove dsh-deepseek-balance
```

## License

[MIT](LICENSE)
