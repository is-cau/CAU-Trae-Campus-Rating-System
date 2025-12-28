<script setup>
import { ref } from 'vue'
import { team } from '../api'

const activeTab = ref('register')
const loading = ref(false)
const message = ref({ type: '', text: '' })

// 注册表单
const registerForm = ref({
  team_name: '',
  member1: '',
  member2: '',
  password: ''
})

// 提交表单
const submitForm = ref({
  team_name: '',
  password: '',
  url: ''
})

const showMessage = (type, text) => {
  message.value = { type, text }
  setTimeout(() => message.value = { type: '', text: '' }, 5000)
}

const handleRegister = async () => {
  if (!registerForm.value.team_name || !registerForm.value.member1 || !registerForm.value.password) {
    showMessage('error', '请填写必填项')
    return
  }

  loading.value = true
  try {
    const res = await team.register(registerForm.value)
    showMessage('success', `注册成功！队伍编号: ${res.data.data.group_number}`)
    registerForm.value = { team_name: '', member1: '', member2: '', password: '' }
  } catch (err) {
    showMessage('error', err.response?.data?.message || '注册失败')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!submitForm.value.team_name || !submitForm.value.password || !submitForm.value.url) {
    showMessage('error', '请填写所有字段')
    return
  }

  loading.value = true
  try {
    const res = await team.submit(submitForm.value)
    showMessage('success', res.data.message)
  } catch (err) {
    showMessage('error', err.response?.data?.message || '提交失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container">
    <h1 class="page-title">选手中心</h1>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'register' }" @click="activeTab = 'register'">
        注册队伍
      </button>
      <button class="tab" :class="{ active: activeTab === 'submit' }" @click="activeTab = 'submit'">
        提交作品
      </button>
    </div>

    <div v-if="message.text" :class="['message', `message-${message.type}`]">
      {{ message.text }}
    </div>

    <!-- 注册表单 -->
    <div v-if="activeTab === 'register'" class="card fade-in" style="max-width: 500px;">
      <h3 class="section-title">队伍注册</h3>
      <form @submit.prevent="handleRegister">
        <div class="input-group">
          <label>队伍名称 *</label>
          <input v-model="registerForm.team_name" class="input" placeholder="输入队伍名称" />
        </div>
        <div class="input-group">
          <label>队员1 *</label>
          <input v-model="registerForm.member1" class="input" placeholder="队员1姓名" />
        </div>
        <div class="input-group">
          <label>队员2（可选）</label>
          <input v-model="registerForm.member2" class="input" placeholder="队员2姓名" />
        </div>
        <div class="input-group">
          <label>密码 *</label>
          <input v-model="registerForm.password" type="password" class="input" placeholder="设置登录密码" />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="loading" style="width: 100%;">
          {{ loading ? '注册中...' : '注册队伍' }}
        </button>
      </form>
    </div>

    <!-- 提交作品表单 -->
    <div v-if="activeTab === 'submit'" class="card fade-in" style="max-width: 500px;">
      <h3 class="section-title">提交作品</h3>
      <form @submit.prevent="handleSubmit">
        <div class="input-group">
          <label>队伍名称</label>
          <input v-model="submitForm.team_name" class="input" placeholder="输入队伍名称" />
        </div>
        <div class="input-group">
          <label>密码</label>
          <input v-model="submitForm.password" type="password" class="input" placeholder="队伍密码" />
        </div>
        <div class="input-group">
          <label>作品链接</label>
          <input v-model="submitForm.url" class="input" placeholder="https://github.com/..." />
        </div>
        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
          提示：重复提交会覆盖之前的作品，且评委评分会被重置
        </p>
        <button type="submit" class="btn btn-primary" :disabled="loading" style="width: 100%;">
          {{ loading ? '提交中...' : '提交作品' }}
        </button>
      </form>
    </div>
  </div>
</template>
