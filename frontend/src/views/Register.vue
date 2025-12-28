<script setup>
import { ref } from 'vue'
import { team } from '../api'

const loading = ref(false)
const message = ref({ type: '', text: '' })

const form = ref({
  team_name: '',
  member1: '',
  member2: '',
  password: ''
})

const showMessage = (type, text) => {
  message.value = { type, text }
  setTimeout(() => message.value = { type: '', text: '' }, 5000)
}

const handleSubmit = async () => {
  if (!form.value.team_name || !form.value.member1 || !form.value.password) {
    showMessage('error', '请填写必填项')
    return
  }

  loading.value = true
  try {
    const res = await team.register(form.value)
    showMessage('success', `注册成功！队伍编号: ${res.data.data.group_number}`)
    form.value = { team_name: '', member1: '', member2: '', password: '' }
  } catch (err) {
    showMessage('error', err.response?.data?.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container">
    <h1 class="page-title">注册队伍</h1>

    <div v-if="message.text" :class="['message', `message-${message.type}`]">
      {{ message.text }}
    </div>

    <div class="card fade-in" style="max-width: 500px;">
      <form @submit.prevent="handleSubmit">
        <div class="input-group">
          <label>队伍名称 *</label>
          <input v-model="form.team_name" class="input" placeholder="输入队伍名称" />
        </div>
        <div class="input-group">
          <label>队员1 *</label>
          <input v-model="form.member1" class="input" placeholder="队员1姓名" />
        </div>
        <div class="input-group">
          <label>队员2（可选）</label>
          <input v-model="form.member2" class="input" placeholder="队员2姓名" />
        </div>
        <div class="input-group">
          <label>密码 *</label>
          <input v-model="form.password" type="password" class="input" placeholder="设置登录密码" />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="loading" style="width: 100%;">
          {{ loading ? '注册中...' : '注册队伍' }}
        </button>
      </form>
    </div>
  </div>
</template>
