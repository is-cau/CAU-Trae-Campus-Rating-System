<script setup>
import { ref } from 'vue'
import { team } from '../api'

const loading = ref(false)
const message = ref({ type: '', text: '' })

const form = ref({
  team_name: '',
  password: '',
  url: ''
})

const showMessage = (type, text) => {
  message.value = { type, text }
  setTimeout(() => message.value = { type: '', text: '' }, 5000)
}

const handleSubmit = async () => {
  if (!form.value.team_name || !form.value.password || !form.value.url) {
    showMessage('error', '请填写所有字段')
    return
  }

  loading.value = true
  try {
    const res = await team.submit(form.value)
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
    <h1 class="page-title">提交作品</h1>

    <div v-if="message.text" :class="['message', `message-${message.type}`]">
      {{ message.text }}
    </div>

    <div class="card fade-in" style="max-width: 500px;">
      <form @submit.prevent="handleSubmit">
        <div class="input-group">
          <label>队伍名称</label>
          <input v-model="form.team_name" class="input" placeholder="输入队伍名称" />
        </div>
        <div class="input-group">
          <label>密码</label>
          <input v-model="form.password" type="password" class="input" placeholder="队伍密码" />
        </div>
        <div class="input-group">
          <label>作品链接</label>
          <input v-model="form.url" class="input" placeholder="https://github.com/..." />
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
