# Obsidian AMaps

使用 [高德地图](https://lbs.amap.com/) API 为 [Obsidian](https://obsidian.md) Bases 提供地图视图的插件。

![Obsidian AMaps](images/map-view.png)

## 功能特性

- 将笔记以交互式标记显示在地图上
- 针对中国大陆用户优化，加载速度快
- 支持通过属性设置自定义标记图标和颜色
- 内置标准地图、卫星地图和混合地图类型
- 右键点击地图可在指定位置创建笔记

## 二次开发说明

本项目是从 Obsidian 官方 [obsidian-maps](https://github.com/obsidianmd/obsidian-maps) 分支出来的二次开发项目。

### 主要改动

- 使用高德地图 JS API 2.0 替代 MapLibre GL JS
- 为中国大陆用户提供国内地图数据，访问更快速
- 新增高德地图 API Key 和安全密钥配置
- 统一使用 GCJ-02 火星坐标系（高德地图坐标格式）
- 移除了多瓦片提供商支持（仅保留高德地图）

## 系统要求

- Obsidian 1.10 或更高版本
- 高德地图 API Key 和安全密钥

## 安装方法

### 方法一：从 GitHub 下载

1. 从 GitHub Releases 下载最新版本
2. 解压到你的 Vault 目录下的 `.obsidian/plugins/obsidian-amaps/` 文件夹
3. 在 Obsidian 设置 → 社区插件 中启用插件
4. 在插件设置中配置你的高德地图 API Key 和安全密钥

### 方法二：手动安装

```bash
# 克隆仓库
git clone https://github.com/easman/obsidian-amaps.git
cd obsidian-amaps

# 安装依赖
npm install

# 构建
npm run build

# 将 main.js、manifest.json、styles.css 复制到你的 Vault
```

## 申请高德地图 API Key

1. 访问 [高德地图开发者控制台](https://lbs.amap.com/dev/key)
2. 注册并登录开发者账号
3. 创建新应用，选择"Web 端 (JS API)"平台
4. 获取 Key 和 **安全密钥**（2021年12月后申请的 Key 需要安全密钥）
5. 在插件设置中填入这两个值

> **注意**：安全密钥是必需配置项，不配置会导致 API 无法正常加载。

## 使用方法

### 基础用法

1. 创建一个 Base，并为笔记添加 GCJ-02 坐标属性：
   ```yaml
   ---
   coordinates:
     - "116.4074"   # 经度
     - "39.9042"    # 纬度
   ---
   ```

2. 在 Base 中切换到"地图"视图

3. 标记将自动显示在地图上

### 高级配置

#### 自定义标记图标

使用 `icon` 属性设置标记图标（使用 Obsidian 的 Lucide 图标）：
```yaml
---
coordinates: ["39.9042", "116.4074"]
icon: "map-pin"
---
```

#### 自定义标记颜色

使用 `color` 属性设置标记颜色：
```yaml
---
coordinates: ["39.9042", "116.4074"]
color: "#ff0000"
---
```

#### 地图视图选项

在地图视图的配置中可以设置：

- **中心坐标 (Center coordinates)**：地图默认中心点
- **默认缩放 (Default zoom)**：初始缩放级别 (1-18)
- **最小/最大缩放**：限制缩放范围
- **标记坐标属性**：指定哪个属性包含坐标
- **标记图标属性**：指定哪个属性定义图标
- **标记颜色属性**：指定哪个属性定义颜色

### 右键菜单功能

在地图上右键点击可以：
- **新建笔记**：在点击位置创建带有坐标的新笔记
- **复制坐标**：复制当前位置的经纬度
- **设置默认中心点**：将当前位置设为默认中心
- **设置默认缩放**：将当前缩放级别设为默认

### 地图类型切换

使用地图右上角的图层切换按钮，可以在：
- **标准地图**：默认街道地图
- **卫星地图**：卫星影像
- **混合地图**：卫星影像 + 街道标注

## 坐标格式

支持以下坐标格式：

```yaml
# 数组格式（GCJ-02 火星坐标系：[经度, 纬度]）
coordinates: ["116.4074", "39.9042"]
coordinates: [116.4074, 39.9042]

# 列表格式（GCJ-02 火星坐标系：[经度, 纬度]）
coordinates:
  - "116.4074"  # 经度
  - "39.9042"   # 纬度

# 字符串格式
coordinates: "116.4074, 39.9042"
```

**注意**：本插件只支持 GCJ-02 坐标系（火星坐标系），即高德地图使用的坐标格式。请确保输入的坐标是 GCJ-02 格式 `[经度, 纬度]`。可从高德地图坐标拾取器获取：https://lbs.amap.com/tools/picker

## 示例

### 基础用法

在笔记中添加坐标：

```yaml
---
coordinates:
  - "116.3972"  # 经度
  - "39.9163"   # 纬度
---
```

在 Base 中创建地图视图：

```yaml
views:
  - type: map
    name: 地图
    coordinates: note.coordinates
```

### 可选：自定义标记

```yaml
---
coordinates:
  - "116.3972"
  - "39.9163"
icon: "landmark"     # 可选：自定义图标
color: "#c41e3a"     # 可选：自定义颜色
---
```

查看 `examples/` 目录中的完整示例。

## 常见问题

### Q: 地图无法加载，显示空白？

A: 请检查：
1. 是否正确配置了 API Key 和安全密钥
2. 网络连接是否正常
3. 查看控制台是否有错误信息（Ctrl+Shift+I 打开开发者工具）


### Q: 支持哪些图标？

A: 支持 Obsidian 使用的所有 Lucide 图标。可以在 [Lucide 图标库](https://lucide.dev/icons/) 中查找图标名称。

### Q: 有使用次数限制吗？

A: 高德地图免费版有每日调用配额限制。如果用量较大，可能需要升级开发者账号。

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 生产构建
npm run build

# 生成测试数据
python tests/generate_test_files.py 50
```

## 开源许可

Copyright (c) 2025 Obsidian. 原项目使用 MIT 许可证。
Copyright (c) 2025 Easman. 修改部分使用 MIT 许可证。

详见 [LICENSE](./LICENSE) 和 [NOTICE](./NOTICE)。

## 致谢

感谢 Obsidian 团队开发的原版 Maps 插件，为本项目提供了优秀的基础架构。
