# 比赛评分系统

一个用于比赛作品提交和评分的 Web 应用，支持选手注册、作品提交、评委评分、大众互评等功能。

## 技术栈

- **后端**: Express.js + SQLite (better-sqlite3)
- **前端**: Vue 3 + Vite + Vue Router
- **密码加密**: bcryptjs

## 项目结构

```
score/
├── app.js              # 后端主文件
├── data.db             # SQLite 数据库
├── frontend/           # Vue 前端项目
│   ├── src/
│   │   ├── views/      # 页面组件
│   │   ├── api/        # API 接口封装
│   │   └── router/     # 路由配置
│   └── ...
└── README.md
```

## 快速启动

```bash
# 启动后端 (端口 3000)
node app.js

# 启动前端 (端口 5173)
cd frontend
npm install
npm run dev
```

## 评分规则

| 维度 | 满分 | 说明 |
|------|------|------|
| 完成度 | 50分 | 项目完成情况，无致命bug |
| 静态设计 | 20分 | 页面美观，布局合理 |
| 动态效果 | 20分 | 动画效果美观有趣 |
| 创新性 | 10分 | 创意新颖，有亮点 |

**总分计算**: 评委评分 × 50% + 大众评分 × 50%

---

## API 接口文档

### 选手接口

#### POST /register - 注册队伍

```json
// 请求
{
  "team_name": "队伍名称",
  "member1": "队员1姓名",
  "member2": "队员2姓名（可选）",
  "password": "队伍密码"
}

// 响应
{
  "success": true,
  "data": { "group_number": 1 }
}
```

#### POST /post - 提交作品

```json
// 请求
{
  "team_name": "队伍名称",
  "password": "队伍密码",
  "url": "https://github.com/..."
}

// 响应
{
  "success": true,
  "message": "提交成功"
}
```

> 注意：重复提交会覆盖之前的作品，且评委评分会被重置

---

### 评委接口

评委密码：`Qwenqwenqwen1` 至 `Qwenqwenqwen5`（共5位评委）

#### GET /judge/teams - 获取待评分队伍列表

```
GET /judge/teams?password=Qwenqwenqwen1
```

#### POST /judge/score - 提交评分

```json
// 请求
{
  "password": "Qwenqwenqwen1",
  "team_name": "队伍名称",
  "completion": 45,
  "static_design": 18,
  "dynamic_design": 16,
  "innovation": 8
}
```

#### GET /judge/scores - 获取评分记录

```
GET /judge/scores?password=Qwenqwenqwen1
```

---

### 大众评分接口

选手使用队伍名和密码登录，随机分配8个其他队伍进行互评

#### GET /public/teams - 获取待评分队伍

```
GET /public/teams?team_name=我的队伍&password=队伍密码
```

#### POST /public/score - 提交评分

```json
// 请求
{
  "team_name": "评分者队伍",
  "password": "队伍密码",
  "target_team": "被评分队伍",
  "completion": 45,
  "static_design": 18,
  "dynamic_design": 16,
  "innovation": 8
}
```

#### GET /public/scores - 获取已评分记录

```
GET /public/scores?team_name=我的队伍&password=队伍密码
```

---

### 管理员接口

管理员密码：`Qwenqwenqwen123`

#### GET /admin/teams - 获取所有队伍

```
GET /admin/teams?password=Qwenqwenqwen123
```

#### GET /admin/submissions - 获取所有提交

```
GET /admin/submissions?password=Qwenqwenqwen123
```

#### DELETE /admin/teams/:team_name - 删除队伍

```
DELETE /admin/teams/队伍名称?password=Qwenqwenqwen123
```

#### GET /admin/rankings - 获取排名（含详细分数）

```
GET /admin/rankings?password=Qwenqwenqwen123
```

#### POST /admin/reset - 初始化数据库（清空所有数据）

```json
// 请求
{
  "password": "Qwenqwenqwen123",
  "confirm_password": "Qwenqwenqwen123"
}
```

> 危险操作：此操作将清空所有队伍、提交、评分记录，不可恢复

---

### 排行榜接口

#### GET /rankings - 获取公开排行榜

```json
// 响应
{
  "success": true,
  "data": [
    {
      "group_number": 1,
      "team_name": "队伍A",
      "final_score": 85.5,
      "rank": 1
    }
  ]
}
```

---

## 前端页面

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 项目介绍和入口 |
| `/register` | 注册队伍 | 选手注册 |
| `/submit` | 提交作品 | 提交作品链接 |
| `/judge` | 评委评分 | 评委登录和评分（隐藏） |
| `/public` | 大众评分 | 选手互评（隐藏） |
| `/admin` | 管理后台 | 管理员功能（隐藏） |
| `/rankings` | 排行榜 | 查看排名（隐藏） |

> 隐藏页面不在导航栏显示，需直接访问 URL

---

## 数据库表结构

### teams - 队伍表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| group_number | INTEGER | 组号（自动分配） |
| team_name | TEXT | 队伍名称（唯一） |
| member1 | TEXT | 队员1 |
| member2 | TEXT | 队员2（可选） |
| password_hash | TEXT | 密码哈希 |
| created_at | DATETIME | 注册时间 |

### submissions - 提交表
| 字段 | 类型 | 说明 |
|------|------|------|
| team_name | TEXT | 队伍名称（主键） |
| url | TEXT | 作品链接 |
| submitted_at | DATETIME | 提交时间 |

### scores - 评分表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| team_name | TEXT | 被评分队伍 |
| judge_id | TEXT | 评委ID / 评分者队伍名 |
| score_type | TEXT | judge / public |
| completion | INTEGER | 完成度分数 |
| static_design | INTEGER | 静态设计分数 |
| dynamic_design | INTEGER | 动态效果分数 |
| innovation | INTEGER | 创新性分数 |
| created_at | DATETIME | 评分时间 |

### public_assignments - 大众评分分配表
| 字段 | 类型 | 说明 |
|------|------|------|
| voter_team | TEXT | 评分者队伍 |
| target_team | TEXT | 被评分队伍 |
