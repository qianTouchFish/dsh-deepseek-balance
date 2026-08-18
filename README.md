# dsh-deepseek-balance

> 仓库名、npm 包名、插件 id 统一为 `dsh-deepseek-balance`。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/qianTouchFish/dsh-deepseek-balance)](https://github.com/qianTouchFish/dsh-deepseek-balance/releases)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) **Web 界面**插件:在侧边栏"**设置**"按钮正上方**常显** DeepSeek API 用量条(余额 / 消费金额 / API 请求 / Tokens),点击展开完整卡片——按模型、按时间维度查看消费,官方累计消费,模型选择器旁实时显示**高峰/空闲**计费时段徽标,支持浅色/深色主题,每分钟自动刷新。

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) **web GUI** plugin: an always-visible DeepSeek API usage strip **above the Settings button** in the sidebar (balance / spent / requests / tokens), expanding into a full card — per-model and per-period usage, official cumulative spend, a live peak/off-peak pricing window badge beside the model selector, light/dark theme support, auto-refresh every minute.

![布局示意: 侧边栏底部为用量条,卡片锚定在条的右方](docs/layout.svg)

## Features / 功能特性

- 侧边栏"设置"上方**常显用量条**:余额 / 消费金额 / 请求次数 / Tokens,每分钟自动刷新,低余额变黄;
- 点击展开**用量卡片**:按模型、按时间维度(今天 / 昨天 / 近7天 / 近30天 / 本月 / 上月)查看消费,含迷你柱状图;
- **官方累计消费**:来自平台控制台数据(需平台令牌;未配置时自动回退为余额差值估算);
- **高峰/空闲时段徽标**:模型选择器旁实时显示当前计费时段——北京时间 09:00–12:00 / 14:00–18:00 为高峰,其余为空闲;
- **令牌一键获取**:卡片内【自动获取】从本机 Chrome / Edge / Chromium 提取平台令牌(Windows / macOS / Linux);
- 浅色 / 深色主题自适应;时间维度 / API Key / 模型选择自动持久化。

## 安装前提 / Prerequisites

- **DeepSeek Harness (DSH)** 已安装并可使用 Web 界面;需要 **DSH CLI** 与 [pnpm](https://pnpm.io/installation);
- **DeepSeek API Key**(`DEEPSEEK_API_KEY`,必需):余额实时查询,与 harness 模型同源;在「设置 → 模型」页面填写,存于 `~/.dsh/.credentials.yaml`;
- **平台令牌**(`DEEPSEEK_PLATFORM_TOKEN`,可选):解锁官方 Tokens / 请求次数 / 按模型分类 / 官方累计消费;可安装后在卡片内点【自动获取】一键提取;
- **自动获取令牌**:需本机已登录 https://platform.deepseek.com 的 **Chrome / Edge / Chromium**(Windows / macOS / Linux 均可,不支持隐身模式)。

## 安装 / Install

```sh
# 方式一:从 GitHub 安装(推荐)
dsh plugin --profile web add github:qianTouchFish/dsh-deepseek-balance

# 方式二:完整 git URL
dsh plugin --profile web add git+https://github.com/qianTouchFish/dsh-deepseek-balance.git

# 方式三:本地目录(开发调试)
cd dsh-deepseek-balance && dsh plugin --profile web add .
```

安装后:

1. 重启 Web 应用(桌面图标 / `dsh web`)并刷新页面;
2. 侧边栏底部、**设置按钮上方**即出现用量条;
3. 首次使用:若未配置 API Key,到「设置 → 模型」填写 `DEEPSEEK_API_KEY`;需要官方用量数据时,打开卡片 → 底部【自动获取】提取平台令牌(凭据服务热加载,无需重启)。

## FAQ / 常见问题

**点击【自动获取】提示"未找到 userToken"怎么办?**

请依次检查:① 本机安装的是 Chrome / Edge / Chromium 且**已登录** https://platform.deepseek.com;② **未使用隐身 / 无痕模式**;③ 登录所用的浏览器配置为默认配置(`Default`)或 `Profile N`。仍失败可手动获取:浏览器登录平台 → `F12` → Console 执行 `JSON.parse(localStorage.getItem('userToken')).value`,把输出追加到 `~/.dsh/.credentials.yaml`:

```yaml
DEEPSEEK_PLATFORM_TOKEN: <那串令牌>
```

## License

[MIT](LICENSE)
