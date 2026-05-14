# 本地预览 family-budget-app-v2 指南

## 前置要求

在本地电脑上运行该项目，您需要安装以下工具：

1. **Node.js** (v18+)
   - 下载地址：https://nodejs.org/
   - 验证安装：`node --version` 和 `npm --version`

2. **pnpm** (包管理器)
   - 安装命令：`npm install -g pnpm`
   - 验证安装：`pnpm --version`

3. **Git**
   - 下载地址：https://git-scm.com/
   - 验证安装：`git --version`

## 步骤 1：克隆项目

```bash
git clone https://github.com/x1Anyuxd/family-budget-app-v2.git
cd family-budget-app-v2
```

## 步骤 2：安装依赖

```bash
pnpm install
```

这个命令会安装项目所需的所有依赖包。

## 步骤 3：启动开发服务器

有两种方式启动项目：

### 方式 A：同时启动 Web 和后端服务器（推荐）

```bash
pnpm dev
```

这个命令会：
- 启动后端服务器（Express）在 `http://localhost:3000`
- 启动前端开发服务器（Metro）在 `http://localhost:8081`

### 方式 B：仅启动前端开发服务器

```bash
pnpm dev:metro
```

## 步骤 4：在浏览器中打开

打开您的浏览器，访问以下地址之一：

- **Web 版本**：http://localhost:8081
- **后端 API**：http://localhost:3000

## 实时预览和热更新

项目已配置热模块替换（HMR），当您修改代码时：

1. 修改任何 `.tsx`、`.ts` 或 `.css` 文件
2. 保存文件
3. 浏览器会自动刷新显示最新的更改

## 常见问题

### 问题 1：端口已被占用

如果看到 `EADDRINUSE` 错误，说明端口已被占用。

**解决方案**：
```bash
# 杀死占用端口 8081 的进程
# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8081
kill -9 <PID>
```

### 问题 2：依赖安装失败

**解决方案**：
```bash
# 清除缓存并重新安装
pnpm store prune
pnpm install
```

### 问题 3：看不到数据

项目使用本地存储（AsyncStorage）保存数据。数据存储在浏览器的本地存储中。

- 在 Chrome DevTools 中查看：F12 → Application → Local Storage
- 清除数据：在开发者工具中清除本地存储

## 构建生产版本

```bash
pnpm build
```

这会生成优化后的生产版本。

## 其他有用的命令

```bash
# 代码检查
pnpm check

# 代码格式化
pnpm format

# 运行测试
pnpm test

# 生成 QR 码（用于移动设备扫描）
pnpm qr
```

## 项目结构

```
family-budget-app-v2/
├── app/                    # 应用页面和路由
│   ├── (tabs)/            # 标签页面（记录、统计、设置）
│   └── components/        # 页面级组件
├── components/            # 可复用组件
├── lib/                   # 工具函数和上下文
├── hooks/                 # 自定义 React hooks
├── constants/             # 常量定义
├── server/                # 后端代码（如果需要）
├── package.json           # 项目配置
└── README.md              # 项目说明
```

## 开发工作流

1. 创建新分支：`git checkout -b feature/your-feature`
2. 修改代码并测试
3. 提交更改：`git add . && git commit -m "描述"`
4. 推送到 GitHub：`git push origin feature/your-feature`
5. 创建 Pull Request

## 获取帮助

如有问题，请：
1. 检查浏览器控制台是否有错误（F12）
2. 查看终端输出是否有错误信息
3. 查看项目的 GitHub Issues
4. 查看 README.md 文件

---

**祝您开发愉快！** 🚀
