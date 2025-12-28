<script setup>
import { ref } from 'vue'
import { admin } from '../api'

const password = ref('')
const loggedIn = ref(false)
const activeTab = ref('teams')
const teams = ref([])
const submissions = ref([])
const loading = ref(false)
const message = ref({ type: '', text: '' })

// 初始化弹窗
const showResetModal = ref(false)
const resetPassword = ref('')
const resetConfirmPassword = ref('')
const resetLoading = ref(false)

const showMessage = (type, text) => {
  message.value = { type, text }
  setTimeout(() => message.value = { type: '', text: '' }, 5000)
}

const login = async () => {
  if (!password.value) return
  loading.value = true
  try {
    const res = await admin.getTeams(password.value)
    teams.value = res.data.data
    loggedIn.value = true
    await loadSubmissions()
  } catch (err) {
    showMessage('error', err.response?.data?.message || '密码错误')
  } finally {
    loading.value = false
  }
}

const loadTeams = async () => {
  try {
    const res = await admin.getTeams(password.value)
    teams.value = res.data.data
  } catch (err) {
    console.error(err)
  }
}

const loadSubmissions = async () => {
  try {
    const res = await admin.getSubmissions(password.value)
    submissions.value = res.data.data
  } catch (err) {
    console.error(err)
  }
}

const deleteTeam = async (teamName) => {
  if (!confirm(`确定要删除队伍 "${teamName}" 吗？此操作不可恢复！`)) return

  try {
    await admin.deleteTeam(teamName, password.value)
    showMessage('success', `队伍 "${teamName}" 已删除`)
    await loadTeams()
    await loadSubmissions()
  } catch (err) {
    showMessage('error', err.response?.data?.message || '删除失败')
  }
}

const logout = () => {
  loggedIn.value = false
  password.value = ''
  teams.value = []
  submissions.value = []
}

const switchTab = async (tab) => {
  activeTab.value = tab
  if (tab === 'teams') await loadTeams()
  if (tab === 'submissions') await loadSubmissions()
}

// 打开初始化弹窗
const openResetModal = () => {
  resetPassword.value = ''
  resetConfirmPassword.value = ''
  showResetModal.value = true
}

// 关闭初始化弹窗
const closeResetModal = () => {
  showResetModal.value = false
  resetPassword.value = ''
  resetConfirmPassword.value = ''
}

// 执行初始化
const handleReset = async () => {
  if (!resetPassword.value || !resetConfirmPassword.value) {
    showMessage('error', '请输入密码和确认密码')
    return
  }

  if (resetPassword.value !== resetConfirmPassword.value) {
    showMessage('error', '两次密码不一致')
    return
  }

  resetLoading.value = true
  try {
    await admin.reset(resetPassword.value, resetConfirmPassword.value)
    showMessage('success', '数据库已初始化，所有数据已清空')
    closeResetModal()
    teams.value = []
    submissions.value = []
  } catch (err) {
    showMessage('error', err.response?.data?.message || '初始化失败')
  } finally {
    resetLoading.value = false
  }
}
</script>

<template>
  <div class="container">
    <h1 class="page-title">管理后台</h1>

    <div v-if="message.text" :class="['message', `message-${message.type}`]">
      {{ message.text }}
    </div>

    <!-- 登录 -->
    <div v-if="!loggedIn" class="card login-card fade-in">
      <h3 class="section-title">管理员登录</h3>
      <form @submit.prevent="login">
        <div class="input-group">
          <label>管理员密码</label>
          <input v-model="password" type="password" class="input" placeholder="输入管理员密码" />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="loading" style="width: 100%;">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>

    <!-- 管理界面 -->
    <div v-else>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <div class="tabs" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">
          <button class="tab" :class="{ active: activeTab === 'teams' }" @click="switchTab('teams')">
            队伍管理
          </button>
          <button class="tab" :class="{ active: activeTab === 'submissions' }" @click="switchTab('submissions')">
            作品提交
          </button>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-danger" @click="openResetModal">初始化数据库</button>
          <button class="btn btn-secondary" @click="logout">退出</button>
        </div>
      </div>

      <!-- 队伍列表 -->
      <div v-if="activeTab === 'teams'" class="card fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 class="section-title" style="margin-bottom: 0;">所有队伍 ({{ teams.length }})</h3>
          <button class="btn btn-secondary" @click="loadTeams">刷新</button>
        </div>

        <div v-if="teams.length === 0" class="empty-state">
          <h3>暂无队伍</h3>
        </div>

        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>组号</th>
                <th>队伍名称</th>
                <th>队员1</th>
                <th>队员2</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="team in teams" :key="team.id">
                <td><span class="badge badge-success">#{{ team.group_number }}</span></td>
                <td>{{ team.team_name }}</td>
                <td>{{ team.member1 }}</td>
                <td>{{ team.member2 || '-' }}</td>
                <td>{{ team.created_at }}</td>
                <td>
                  <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.875rem;"
                          @click="deleteTeam(team.team_name)">
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 提交列表 -->
      <div v-if="activeTab === 'submissions'" class="card fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 class="section-title" style="margin-bottom: 0;">作品提交 ({{ submissions.length }})</h3>
          <button class="btn btn-secondary" @click="loadSubmissions">刷新</button>
        </div>

        <div v-if="submissions.length === 0" class="empty-state">
          <h3>暂无提交</h3>
        </div>

        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>组号</th>
                <th>队伍名称</th>
                <th>作品链接</th>
                <th>提交时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in submissions" :key="sub.team_name">
                <td><span class="badge badge-success">#{{ sub.group_number }}</span></td>
                <td>{{ sub.team_name }}</td>
                <td>
                  <a :href="sub.url" target="_blank" style="color: var(--accent);">
                    {{ sub.url.length > 50 ? sub.url.slice(0, 50) + '...' : sub.url }}
                  </a>
                </td>
                <td>{{ sub.submitted_at }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 初始化确认弹窗 -->
    <div v-if="showResetModal" class="modal-overlay" @click.self="closeResetModal">
      <div class="card modal-content fade-in" style="max-width: 400px;">
        <h3 class="section-title" style="color: var(--error);">危险操作</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
          此操作将清空所有数据，包括队伍、提交、评分记录。此操作不可恢复！
        </p>
        <div class="input-group">
          <label>输入管理员密码</label>
          <input v-model="resetPassword" type="password" class="input" placeholder="管理员密码" />
        </div>
        <div class="input-group">
          <label>再次输入密码确认</label>
          <input v-model="resetConfirmPassword" type="password" class="input" placeholder="确认密码" />
        </div>
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-secondary" @click="closeResetModal" style="flex: 1;">取消</button>
          <button class="btn btn-danger" @click="handleReset" :disabled="resetLoading" style="flex: 1;">
            {{ resetLoading ? '执行中...' : '确认初始化' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  margin: 1rem;
}
</style>
