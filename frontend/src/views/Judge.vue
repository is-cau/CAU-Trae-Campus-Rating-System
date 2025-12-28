<script setup>
import { ref, computed } from 'vue'
import { judge } from '../api'

const password = ref('')
const loggedIn = ref(false)
const judgeId = ref('')
const teams = ref([])
const progress = ref('')
const loading = ref(false)
const message = ref({ type: '', text: '' })

// 当前评分的队伍
const scoringTeam = ref(null)
const scoreForm = ref({
  topic_novelty: 5,        // 选题新颖
  visual_creativity: 5,    // 视觉创意
  interaction_creativity: 5, // 交互创意
  completion: 5,           // 作品完成度
  narrative_logic: 5,      // 叙述逻辑性
  experience_fluency: 5    // 体验流畅度
})

const totalScore = computed(() => {
  return scoreForm.value.topic_novelty + scoreForm.value.visual_creativity +
         scoreForm.value.interaction_creativity + scoreForm.value.completion +
         scoreForm.value.narrative_logic + scoreForm.value.experience_fluency
})

const showMessage = (type, text) => {
  message.value = { type, text }
  setTimeout(() => message.value = { type: '', text: '' }, 5000)
}

const login = async () => {
  if (!password.value) return
  loading.value = true
  try {
    const res = await judge.getTeams(password.value)
    teams.value = res.data.data
    progress.value = res.data.progress
    judgeId.value = res.data.judge_id
    loggedIn.value = true
  } catch (err) {
    showMessage('error', err.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}

const refreshTeams = async () => {
  try {
    const res = await judge.getTeams(password.value)
    teams.value = res.data.data
    progress.value = res.data.progress
  } catch (err) {
    console.error(err)
  }
}

const startScoring = (team) => {
  scoringTeam.value = team
  scoreForm.value = {
    topic_novelty: 5,
    visual_creativity: 5,
    interaction_creativity: 5,
    completion: 5,
    narrative_logic: 5,
    experience_fluency: 5
  }
}

const cancelScoring = () => {
  scoringTeam.value = null
}

const submitScore = async () => {
  loading.value = true
  try {
    await judge.score({
      password: password.value,
      team_id: scoringTeam.value.id,
      ...scoreForm.value
    })
    showMessage('success', `已为 "${scoringTeam.value.team_name}" 评分，总分: ${totalScore.value}`)
    scoringTeam.value = null
    await refreshTeams()
  } catch (err) {
    showMessage('error', err.response?.data?.message || '评分失败')
  } finally {
    loading.value = false
  }
}

const logout = () => {
  loggedIn.value = false
  password.value = ''
  teams.value = []
}
</script>

<template>
  <div class="container">
    <h1 class="page-title">评委评分</h1>

    <div v-if="message.text" :class="['message', `message-${message.type}`]">
      {{ message.text }}
    </div>

    <!-- 登录 -->
    <div v-if="!loggedIn" class="card login-card fade-in">
      <h3 class="section-title">评委登录</h3>
      <form @submit.prevent="login">
        <div class="input-group">
          <label>评委密码</label>
          <input v-model="password" type="password" class="input" placeholder="输入评委密码" />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="loading" style="width: 100%;">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>

    <!-- 评分界面 -->
    <div v-else>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <div>
          <span class="badge badge-success">{{ judgeId }}</span>
          <span class="progress-text" style="margin-left: 1rem;">评分进度: {{ progress }}</span>
        </div>
        <button class="btn btn-secondary" @click="logout">退出</button>
      </div>

      <!-- 评分弹窗 -->
      <div v-if="scoringTeam" class="card fade-in" style="margin-bottom: 2rem;">
        <h3 class="section-title">为 "{{ scoringTeam.team_name }}" 评分</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
          作品链接: <a :href="scoringTeam.url" target="_blank" style="color: var(--accent);">{{ scoringTeam.url }}</a>
        </p>

        <h4 style="color: var(--accent); margin: 1rem 0 0.5rem;">创意与独特性</h4>

        <div class="score-input">
          <label>选题新颖 (0-10)</label>
          <input type="range" v-model.number="scoreForm.topic_novelty" min="0" max="10" />
          <span class="score-value">{{ scoreForm.topic_novelty }}</span>
        </div>

        <div class="score-input">
          <label>视觉创意 (0-10)</label>
          <input type="range" v-model.number="scoreForm.visual_creativity" min="0" max="10" />
          <span class="score-value">{{ scoreForm.visual_creativity }}</span>
        </div>

        <div class="score-input">
          <label>交互创意 (0-10)</label>
          <input type="range" v-model.number="scoreForm.interaction_creativity" min="0" max="10" />
          <span class="score-value">{{ scoreForm.interaction_creativity }}</span>
        </div>

        <h4 style="color: var(--accent); margin: 1rem 0 0.5rem;">项目完整度</h4>

        <div class="score-input">
          <label>作品完成度 (0-10)</label>
          <input type="range" v-model.number="scoreForm.completion" min="0" max="10" />
          <span class="score-value">{{ scoreForm.completion }}</span>
        </div>

        <div class="score-input">
          <label>叙述逻辑性 (0-10)</label>
          <input type="range" v-model.number="scoreForm.narrative_logic" min="0" max="10" />
          <span class="score-value">{{ scoreForm.narrative_logic }}</span>
        </div>

        <div class="score-input">
          <label>体验流畅度 (0-10)</label>
          <input type="range" v-model.number="scoreForm.experience_fluency" min="0" max="10" />
          <span class="score-value">{{ scoreForm.experience_fluency }}</span>
        </div>

        <div style="text-align: center; margin: 1.5rem 0;">
          <span style="font-size: 1.5rem; color: var(--text-secondary);">总分: </span>
          <span style="font-size: 2.5rem; font-weight: 700; color: var(--accent);">{{ totalScore }}</span>
        </div>

        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-secondary" @click="cancelScoring" style="flex: 1;">取消</button>
          <button class="btn btn-primary" @click="submitScore" :disabled="loading" style="flex: 1;">
            {{ loading ? '提交中...' : '提交评分' }}
          </button>
        </div>
      </div>

      <!-- 队伍列表 -->
      <div v-if="teams.length === 0" class="empty-state">
        <h3>暂无待评分队伍</h3>
        <p>等待选手提交作品</p>
      </div>

      <div v-else>
        <div v-for="team in teams" :key="team.id"
             class="team-card" :class="{ scored: team.scored }">
          <div class="team-info">
            <h4>{{ team.team_name }}</h4>
            <p>组号: {{ team.group_number }} ·
              <a :href="team.url" target="_blank">查看作品</a>
            </p>
          </div>
          <div>
            <span v-if="team.scored" class="badge badge-success">已评分</span>
            <button v-else class="btn btn-primary" @click="startScoring(team)">
              评分
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
