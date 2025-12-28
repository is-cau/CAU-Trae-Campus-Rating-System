const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 初始化数据库
const db = new Database('contest.db');

// 创建队伍表
db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_name TEXT UNIQUE NOT NULL,
    member1 TEXT NOT NULL,
    member2 TEXT,
    password_hash TEXT NOT NULL,
    group_number INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 创建作品提交表
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER UNIQUE NOT NULL,
    url TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
  )
`);

// 创建评分表
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    scorer_id TEXT NOT NULL,
    scorer_type TEXT NOT NULL CHECK(scorer_type IN ('judge', 'public')),
    topic_novelty INTEGER NOT NULL CHECK(topic_novelty >= 0 AND topic_novelty <= 10),
    visual_creativity INTEGER NOT NULL CHECK(visual_creativity >= 0 AND visual_creativity <= 10),
    interaction_creativity INTEGER NOT NULL CHECK(interaction_creativity >= 0 AND interaction_creativity <= 10),
    completion INTEGER NOT NULL CHECK(completion >= 0 AND completion <= 10),
    narrative_logic INTEGER NOT NULL CHECK(narrative_logic >= 0 AND narrative_logic <= 10),
    experience_fluency INTEGER NOT NULL CHECK(experience_fluency >= 0 AND experience_fluency <= 10),
    total INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, scorer_id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
  )
`);

// 创建大众评分分配表（记录每个选手需要评分的队伍）
db.exec(`
  CREATE TABLE IF NOT EXISTS public_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scorer_team_id INTEGER NOT NULL,
    target_team_id INTEGER NOT NULL,
    UNIQUE(scorer_team_id, target_team_id),
    FOREIGN KEY (scorer_team_id) REFERENCES teams(id),
    FOREIGN KEY (target_team_id) REFERENCES teams(id)
  )
`);

// 获取下一个组号
function getNextGroupNumber() {
  const result = db.prepare('SELECT MAX(group_number) as max_group FROM teams').get();
  return (result.max_group || 0) + 1;
}

// ========== 评分配置 ==========
const SCORE_CONFIG = {
  // 评分维度及满分（每个维度0-10分，共60分）
  dimensions: {
    // 创意与独特性
    topic_novelty: { max: 10, label: '选题新颖' },
    visual_creativity: { max: 10, label: '视觉创意' },
    interaction_creativity: { max: 10, label: '交互创意' },
    // 项目完整度
    completion: { max: 10, label: '作品完成度' },
    narrative_logic: { max: 10, label: '叙述逻辑性' },
    experience_fluency: { max: 10, label: '体验流畅度' }
  },
  // 权重配置
  weights: {
    judge: 0.5,    // 评委权重 50%
    public: 0.5    // 大众权重 50%
  },
  // 评委数量
  judgeCount: 5
};

// ========== 评分工具函数 ==========

/**
 * 提交评分
 * @param {number} teamId - 队伍ID
 * @param {string} scorerId - 评分者ID（评委ID或大众用户标识）
 * @param {string} scorerType - 评分者类型: 'judge' | 'public'
 * @param {object} scores - 各维度分数
 * @returns {object} 结果
 */
function submitScore(teamId, scorerId, scorerType, scores) {
  const { topic_novelty, visual_creativity, interaction_creativity, completion, narrative_logic, experience_fluency } = scores;

  // 验证分数范围（每个维度0-10分）
  if (topic_novelty < 0 || topic_novelty > 10) {
    return { success: false, message: '选题新颖分数必须在0-10之间' };
  }
  if (visual_creativity < 0 || visual_creativity > 10) {
    return { success: false, message: '视觉创意分数必须在0-10之间' };
  }
  if (interaction_creativity < 0 || interaction_creativity > 10) {
    return { success: false, message: '交互创意分数必须在0-10之间' };
  }
  if (completion < 0 || completion > 10) {
    return { success: false, message: '作品完成度分数必须在0-10之间' };
  }
  if (narrative_logic < 0 || narrative_logic > 10) {
    return { success: false, message: '叙述逻辑性分数必须在0-10之间' };
  }
  if (experience_fluency < 0 || experience_fluency > 10) {
    return { success: false, message: '体验流畅度分数必须在0-10之间' };
  }

  const total = topic_novelty + visual_creativity + interaction_creativity + completion + narrative_logic + experience_fluency;

  try {
    const stmt = db.prepare(`
      INSERT INTO scores (team_id, scorer_id, scorer_type, topic_novelty, visual_creativity, interaction_creativity, completion, narrative_logic, experience_fluency, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(team_id, scorer_id) DO UPDATE SET
        topic_novelty = excluded.topic_novelty,
        visual_creativity = excluded.visual_creativity,
        interaction_creativity = excluded.interaction_creativity,
        completion = excluded.completion,
        narrative_logic = excluded.narrative_logic,
        experience_fluency = excluded.experience_fluency,
        total = excluded.total,
        created_at = CURRENT_TIMESTAMP
    `);
    stmt.run(teamId, scorerId, scorerType, topic_novelty, visual_creativity, interaction_creativity, completion, narrative_logic, experience_fluency, total);

    return { success: true, message: '评分成功', total };
  } catch (error) {
    return { success: false, message: '评分失败: ' + error.message };
  }
}

/**
 * 计算队伍最终得分
 * @param {number} teamId - 队伍ID
 * @returns {object} 最终得分详情
 */
function calculateFinalScore(teamId) {
  // 获取评委评分
  const judgeScores = db.prepare(`
    SELECT AVG(topic_novelty) as avg_topic_novelty,
           AVG(visual_creativity) as avg_visual_creativity,
           AVG(interaction_creativity) as avg_interaction_creativity,
           AVG(completion) as avg_completion,
           AVG(narrative_logic) as avg_narrative_logic,
           AVG(experience_fluency) as avg_experience_fluency,
           AVG(total) as avg_total,
           COUNT(*) as count
    FROM scores
    WHERE team_id = ? AND scorer_type = 'judge'
  `).get(teamId);

  // 获取大众评分
  const publicScores = db.prepare(`
    SELECT AVG(topic_novelty) as avg_topic_novelty,
           AVG(visual_creativity) as avg_visual_creativity,
           AVG(interaction_creativity) as avg_interaction_creativity,
           AVG(completion) as avg_completion,
           AVG(narrative_logic) as avg_narrative_logic,
           AVG(experience_fluency) as avg_experience_fluency,
           AVG(total) as avg_total,
           COUNT(*) as count
    FROM scores
    WHERE team_id = ? AND scorer_type = 'public'
  `).get(teamId);

  const judgeAvg = judgeScores.avg_total || 0;
  const publicAvg = publicScores.avg_total || 0;
  const judgeCount = judgeScores.count || 0;
  const publicCount = publicScores.count || 0;

  // 计算加权最终分
  let finalScore = 0;
  if (judgeCount > 0 && publicCount > 0) {
    finalScore = judgeAvg * SCORE_CONFIG.weights.judge + publicAvg * SCORE_CONFIG.weights.public;
  } else if (judgeCount > 0) {
    finalScore = judgeAvg;
  } else if (publicCount > 0) {
    finalScore = publicAvg;
  }

  return {
    finalScore: Math.round(finalScore * 100) / 100,
    judge: {
      average: Math.round((judgeAvg || 0) * 100) / 100,
      count: judgeCount,
      details: judgeScores.count > 0 ? {
        topic_novelty: Math.round((judgeScores.avg_topic_novelty || 0) * 100) / 100,
        visual_creativity: Math.round((judgeScores.avg_visual_creativity || 0) * 100) / 100,
        interaction_creativity: Math.round((judgeScores.avg_interaction_creativity || 0) * 100) / 100,
        completion: Math.round((judgeScores.avg_completion || 0) * 100) / 100,
        narrative_logic: Math.round((judgeScores.avg_narrative_logic || 0) * 100) / 100,
        experience_fluency: Math.round((judgeScores.avg_experience_fluency || 0) * 100) / 100
      } : null
    },
    public: {
      average: Math.round((publicAvg || 0) * 100) / 100,
      count: publicCount,
      details: publicScores.count > 0 ? {
        topic_novelty: Math.round((publicScores.avg_topic_novelty || 0) * 100) / 100,
        visual_creativity: Math.round((publicScores.avg_visual_creativity || 0) * 100) / 100,
        interaction_creativity: Math.round((publicScores.avg_interaction_creativity || 0) * 100) / 100,
        completion: Math.round((publicScores.avg_completion || 0) * 100) / 100,
        narrative_logic: Math.round((publicScores.avg_narrative_logic || 0) * 100) / 100,
        experience_fluency: Math.round((publicScores.avg_experience_fluency || 0) * 100) / 100
      } : null
    }
  };
}

/**
 * 获取所有队伍排名
 * @returns {array} 排名列表
 */
function getRankings() {
  const teams = db.prepare(`
    SELECT t.id, t.team_name, t.group_number, s.url
    FROM teams t
    LEFT JOIN submissions s ON t.id = s.team_id
  `).all();

  const rankings = teams.map(team => {
    const scoreData = calculateFinalScore(team.id);
    return {
      team_id: team.id,
      team_name: team.team_name,
      group_number: team.group_number,
      url: team.url || null,
      ...scoreData
    };
  });

  // 按最终分数降序排列
  rankings.sort((a, b) => b.finalScore - a.finalScore);

  // 添加排名
  rankings.forEach((item, index) => {
    item.rank = index + 1;
  });

  return rankings;
}

// 管理员密码
const ADMIN_PASSWORD = 'Qwenqwenqwen123';

// 评委密码配置
const JUDGE_PASSWORDS = {
  'judge1': 'Qwenqwenqwen1',
  'judge2': 'Qwenqwenqwen2',
  'judge3': 'Qwenqwenqwen3',
  'judge4': 'Qwenqwenqwen4',
  'judge5': 'Qwenqwenqwen5'
};

// 管理员验证中间件
function adminAuth(req, res, next) {
  const password = req.headers['x-admin-password'] || req.query.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({
      success: false,
      message: '管理员密码错误'
    });
  }
  next();
}

// 评委验证中间件
function judgeAuth(req, res, next) {
  const password = req.headers['x-judge-password'] || req.query.password || req.body.password;

  // 查找匹配的评委
  const judgeEntry = Object.entries(JUDGE_PASSWORDS).find(([, pwd]) => pwd === password);
  if (!judgeEntry) {
    return res.status(403).json({
      success: false,
      message: '评委密码错误'
    });
  }

  req.judgeId = judgeEntry[0]; // 设置评委ID
  next();
}

// 注册接口
app.post('/register', (req, res) => {
  const { team_name, member1, member2, password } = req.body;

  // 参数验证
  if (!team_name || !member1 || !password) {
    return res.status(400).json({
      success: false,
      message: '队名、队员1和密码为必填项'
    });
  }

  // 检查队名是否已存在
  const existing = db.prepare('SELECT id FROM teams WHERE team_name = ?').get(team_name);
  if (existing) {
    return res.status(409).json({
      success: false,
      message: '队名已存在，请选择其他队名'
    });
  }

  // 加密密码
  const passwordHash = bcrypt.hashSync(password, 10);

  // 分配组号并插入数据
  const groupNumber = getNextGroupNumber();

  try {
    const stmt = db.prepare(`
      INSERT INTO teams (team_name, member1, member2, password_hash, group_number)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(team_name, member1, member2 || null, passwordHash, groupNumber);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        team_id: result.lastInsertRowid,
        team_name,
        group_number: groupNumber
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '注册失败: ' + error.message
    });
  }
});

// 提交作品接口
app.post('/post', (req, res) => {
  const { team_name, password, url } = req.body;

  // 参数验证
  if (!team_name || !password || !url) {
    return res.status(400).json({
      success: false,
      message: '队名、密码和作品URL为必填项'
    });
  }

  // 查找队伍
  const team = db.prepare('SELECT id, password_hash FROM teams WHERE team_name = ?').get(team_name);
  if (!team) {
    return res.status(401).json({
      success: false,
      message: '队名不存在'
    });
  }

  // 验证密码
  if (!bcrypt.compareSync(password, team.password_hash)) {
    return res.status(401).json({
      success: false,
      message: '密码错误'
    });
  }

  try {
    // 检查是否是更新（已有提交）
    const existingSubmission = db.prepare('SELECT url FROM submissions WHERE team_id = ?').get(team.id);
    const isUpdate = existingSubmission && existingSubmission.url !== url;

    // 使用 INSERT OR REPLACE 实现覆盖提交
    const stmt = db.prepare(`
      INSERT INTO submissions (team_id, url, submitted_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(team_id) DO UPDATE SET
        url = excluded.url,
        submitted_at = CURRENT_TIMESTAMP
    `);
    stmt.run(team.id, url);

    // 如果是更新URL，删除该队伍的所有评委评分
    if (isUpdate) {
      db.prepare('DELETE FROM scores WHERE team_id = ? AND scorer_type = ?').run(team.id, 'judge');
    }

    res.json({
      success: true,
      message: isUpdate ? '作品已更新，评委评分已重置' : '作品提交成功',
      data: {
        team_name,
        url,
        scores_reset: isUpdate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '提交失败: ' + error.message
    });
  }
});

// ========== 管理员接口 ==========

// 查看所有队伍
app.get('/admin/teams', adminAuth, (req, res) => {
  const teams = db.prepare(`
    SELECT id, team_name, member1, member2, group_number, created_at
    FROM teams
    ORDER BY group_number
  `).all();

  res.json({
    success: true,
    data: teams
  });
});

// 查看所有提交
app.get('/admin/submissions', adminAuth, (req, res) => {
  const submissions = db.prepare(`
    SELECT t.team_name, t.group_number, s.url, s.submitted_at
    FROM submissions s
    JOIN teams t ON s.team_id = t.id
    ORDER BY s.submitted_at DESC
  `).all();

  res.json({
    success: true,
    data: submissions
  });
});

// 删除队伍
app.delete('/admin/teams/:team_name', adminAuth, (req, res) => {
  const { team_name } = req.params;

  const team = db.prepare('SELECT id FROM teams WHERE team_name = ?').get(team_name);
  if (!team) {
    return res.status(404).json({
      success: false,
      message: '队伍不存在'
    });
  }

  // 先删除该队伍的提交，再删除队伍
  db.prepare('DELETE FROM submissions WHERE team_id = ?').run(team.id);
  db.prepare('DELETE FROM teams WHERE id = ?').run(team.id);

  res.json({
    success: true,
    message: `队伍 "${team_name}" 已删除`
  });
});

// ========== 评委接口 ==========

// 评委查看待评分队伍列表
app.get('/judge/teams', judgeAuth, (req, res) => {
  const judgeId = req.judgeId;

  // 获取所有已提交作品的队伍
  const teams = db.prepare(`
    SELECT t.id, t.team_name, t.group_number, s.url, s.submitted_at
    FROM teams t
    JOIN submissions s ON t.id = s.team_id
    ORDER BY t.group_number
  `).all();

  // 获取该评委已评分的队伍
  const scoredTeamIds = db.prepare(`
    SELECT team_id FROM scores WHERE scorer_id = ? AND scorer_type = 'judge'
  `).all(judgeId).map(row => row.team_id);

  // 标记评分状态
  const result = teams.map(team => ({
    ...team,
    scored: scoredTeamIds.includes(team.id)
  }));

  const scoredCount = result.filter(t => t.scored).length;
  const totalCount = result.length;

  res.json({
    success: true,
    judge_id: judgeId,
    progress: `${scoredCount}/${totalCount}`,
    data: result
  });
});

// 评委提交评分
app.post('/judge/score', judgeAuth, (req, res) => {
  const judgeId = req.judgeId;
  const { team_id, topic_novelty, visual_creativity, interaction_creativity, completion, narrative_logic, experience_fluency } = req.body;

  // 参数验证
  if (!team_id) {
    return res.status(400).json({
      success: false,
      message: '缺少 team_id'
    });
  }

  // 检查队伍是否存在且已提交作品
  const submission = db.prepare(`
    SELECT t.team_name FROM teams t
    JOIN submissions s ON t.id = s.team_id
    WHERE t.id = ?
  `).get(team_id);

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: '队伍不存在或未提交作品'
    });
  }

  // 提交评分
  const result = submitScore(team_id, judgeId, 'judge', {
    topic_novelty: Number(topic_novelty) || 0,
    visual_creativity: Number(visual_creativity) || 0,
    interaction_creativity: Number(interaction_creativity) || 0,
    completion: Number(completion) || 0,
    narrative_logic: Number(narrative_logic) || 0,
    experience_fluency: Number(experience_fluency) || 0
  });

  if (result.success) {
    res.json({
      success: true,
      message: `已为 "${submission.team_name}" 评分`,
      data: {
        team_name: submission.team_name,
        judge_id: judgeId,
        total: result.total
      }
    });
  } else {
    res.status(400).json(result);
  }
});

// 评委查看自己的评分记录
app.get('/judge/scores', judgeAuth, (req, res) => {
  const judgeId = req.judgeId;

  const scores = db.prepare(`
    SELECT t.team_name, t.group_number,
           sc.topic_novelty, sc.visual_creativity, sc.interaction_creativity,
           sc.completion, sc.narrative_logic, sc.experience_fluency, sc.total,
           sc.created_at
    FROM scores sc
    JOIN teams t ON sc.team_id = t.id
    WHERE sc.scorer_id = ? AND sc.scorer_type = 'judge'
    ORDER BY t.group_number
  `).all(judgeId);

  res.json({
    success: true,
    judge_id: judgeId,
    count: scores.length,
    data: scores
  });
});

// ========== 大众评分接口 ==========

// 大众评分配置
const PUBLIC_SCORE_COUNT = 8; // 每人评分数量

/**
 * 为选手分配评分任务（均衡分配算法）
 * 确保每个队伍被评分的次数尽可能均匀
 * @param {number} teamId - 选手队伍ID
 * @returns {array} 分配的队伍ID列表
 */
function assignPublicTargets(teamId) {
  // 检查是否已分配
  const existing = db.prepare('SELECT target_team_id FROM public_assignments WHERE scorer_team_id = ?').all(teamId);
  if (existing.length > 0) {
    return existing.map(row => row.target_team_id);
  }

  // 获取所有已提交作品的队伍（排除自己），并统计每个队伍已被分配的次数
  const candidates = db.prepare(`
    SELECT t.id,
           COALESCE(assign_count.cnt, 0) as assigned_count
    FROM teams t
    JOIN submissions s ON t.id = s.team_id
    LEFT JOIN (
      SELECT target_team_id, COUNT(*) as cnt
      FROM public_assignments
      GROUP BY target_team_id
    ) assign_count ON t.id = assign_count.target_team_id
    WHERE t.id != ?
    ORDER BY assigned_count ASC, RANDOM()
  `).all(teamId);

  // 优先选择被分配次数少的队伍，确保均衡
  const selected = candidates.slice(0, Math.min(PUBLIC_SCORE_COUNT, candidates.length)).map(row => row.id);

  // 保存分配
  const insertStmt = db.prepare('INSERT INTO public_assignments (scorer_team_id, target_team_id) VALUES (?, ?)');
  selected.forEach(targetId => {
    insertStmt.run(teamId, targetId);
  });

  return selected;
}

// 选手验证中间件
function teamAuth(req, res, next) {
  // 从 body 或 query 获取凭据
  const team_name = req.body?.team_name || req.query?.team_name;
  const password = req.body?.password || req.query?.password;

  if (!team_name || !password) {
    return res.status(400).json({
      success: false,
      message: '需要队名和密码'
    });
  }

  const team = db.prepare('SELECT id, team_name, password_hash FROM teams WHERE team_name = ?').get(team_name);
  if (!team) {
    return res.status(401).json({
      success: false,
      message: '队伍不存在'
    });
  }

  if (!bcrypt.compareSync(password, team.password_hash)) {
    return res.status(401).json({
      success: false,
      message: '密码错误'
    });
  }

  req.team = team;
  next();
}

// 选手查看待评分队伍
app.get('/public/teams', teamAuth, (req, res) => {
  const team = req.team;

  // 检查自己是否已提交作品
  const mySubmission = db.prepare('SELECT id FROM submissions WHERE team_id = ?').get(team.id);
  if (!mySubmission) {
    return res.status(403).json({
      success: false,
      message: '请先提交作品后再参与评分'
    });
  }

  // 获取或分配评分任务
  const targetIds = assignPublicTargets(team.id);

  if (targetIds.length === 0) {
    return res.json({
      success: true,
      message: '暂无可评分的队伍',
      data: []
    });
  }

  // 获取队伍详情
  const teams = db.prepare(`
    SELECT t.id, t.team_name, t.group_number, s.url, s.submitted_at
    FROM teams t
    JOIN submissions s ON t.id = s.team_id
    WHERE t.id IN (${targetIds.join(',')})
    ORDER BY t.group_number
  `).all();

  // 获取已评分的队伍
  const scorerId = `team_${team.id}`;
  const scoredIds = db.prepare(`
    SELECT team_id FROM scores WHERE scorer_id = ? AND scorer_type = 'public'
  `).all(scorerId).map(row => row.team_id);

  const result = teams.map(t => ({
    ...t,
    scored: scoredIds.includes(t.id)
  }));

  const scoredCount = result.filter(t => t.scored).length;

  res.json({
    success: true,
    team_name: team.team_name,
    progress: `${scoredCount}/${result.length}`,
    data: result
  });
});

// 选手提交评分
app.post('/public/score', teamAuth, (req, res) => {
  const team = req.team;
  const { target_team_id, topic_novelty, visual_creativity, interaction_creativity, completion, narrative_logic, experience_fluency } = req.body;

  // 检查自己是否已提交作品
  const mySubmission = db.prepare('SELECT id FROM submissions WHERE team_id = ?').get(team.id);
  if (!mySubmission) {
    return res.status(403).json({
      success: false,
      message: '请先提交作品后再参与评分'
    });
  }

  // 检查是否有权评这个队伍
  const assignment = db.prepare(`
    SELECT id FROM public_assignments WHERE scorer_team_id = ? AND target_team_id = ?
  `).get(team.id, target_team_id);

  if (!assignment) {
    return res.status(403).json({
      success: false,
      message: '你没有权限评价该队伍'
    });
  }

  // 获取目标队伍信息
  const targetTeam = db.prepare('SELECT team_name FROM teams WHERE id = ?').get(target_team_id);
  if (!targetTeam) {
    return res.status(404).json({
      success: false,
      message: '目标队伍不存在'
    });
  }

  // 提交评分
  const scorerId = `team_${team.id}`;
  const result = submitScore(target_team_id, scorerId, 'public', {
    topic_novelty: Number(topic_novelty) || 0,
    visual_creativity: Number(visual_creativity) || 0,
    interaction_creativity: Number(interaction_creativity) || 0,
    completion: Number(completion) || 0,
    narrative_logic: Number(narrative_logic) || 0,
    experience_fluency: Number(experience_fluency) || 0
  });

  if (result.success) {
    res.json({
      success: true,
      message: `已为 "${targetTeam.team_name}" 评分`,
      data: {
        target_team: targetTeam.team_name,
        scorer_team: team.team_name,
        total: result.total
      }
    });
  } else {
    res.status(400).json(result);
  }
});

// 选手查看自己的评分记录
app.get('/public/scores', teamAuth, (req, res) => {
  const team = req.team;
  const scorerId = `team_${team.id}`;

  const scores = db.prepare(`
    SELECT t.team_name, t.group_number,
           sc.topic_novelty, sc.visual_creativity, sc.interaction_creativity,
           sc.completion, sc.narrative_logic, sc.experience_fluency, sc.total,
           sc.created_at
    FROM scores sc
    JOIN teams t ON sc.team_id = t.id
    WHERE sc.scorer_id = ? AND sc.scorer_type = 'public'
    ORDER BY t.group_number
  `).all(scorerId);

  res.json({
    success: true,
    team_name: team.team_name,
    count: scores.length,
    data: scores
  });
});

// ========== 排行榜接口 ==========

// 获取排行榜（公开）
app.get('/rankings', (req, res) => {
  const rankings = getRankings();
  res.json({
    success: true,
    data: rankings
  });
});

// 管理员查看排行榜（带详细信息）
app.get('/admin/rankings', adminAuth, (req, res) => {
  const rankings = getRankings();
  res.json({
    success: true,
    data: rankings
  });
});

// 管理员初始化数据库（危险操作，需二次验证密码）
app.post('/admin/reset', (req, res) => {
  const { password, confirm_password } = req.body;

  // 验证两次密码
  if (!password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: '请输入密码和确认密码'
    });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({
      success: false,
      message: '管理员密码错误'
    });
  }

  if (password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: '两次密码不一致'
    });
  }

  try {
    // 清空所有表数据
    db.exec('DELETE FROM scores');
    db.exec('DELETE FROM public_assignments');
    db.exec('DELETE FROM submissions');
    db.exec('DELETE FROM teams');

    res.json({
      success: true,
      message: '数据库已初始化，所有数据已清空'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '初始化失败: ' + error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
