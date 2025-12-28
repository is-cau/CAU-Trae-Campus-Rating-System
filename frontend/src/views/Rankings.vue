<script setup>
import { ref, onMounted } from 'vue'
import { rankings as rankingsApi } from '../api'

const rankings = ref([])
const loading = ref(true)

const loadRankings = async () => {
  loading.value = true
  try {
    const res = await rankingsApi.get()
    rankings.value = res.data.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const getRankClass = (rank) => {
  if (rank === 1) return 'rank-1'
  if (rank === 2) return 'rank-2'
  if (rank === 3) return 'rank-3'
  return 'rank-other'
}

onMounted(loadRankings)
</script>

<template>
  <div class="container">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
      <h1 class="page-title" style="margin-bottom: 0;">排行榜</h1>
      <button class="btn btn-secondary" @click="loadRankings" :disabled="loading">
        {{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <div v-if="loading" class="empty-state">
      <p>加载中...</p>
    </div>

    <div v-else-if="rankings.length === 0" class="empty-state">
      <h3>暂无排名数据</h3>
      <p>等待评分完成</p>
    </div>

    <div v-else class="card fade-in">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">排名</th>
              <th>队伍</th>
              <th style="text-align: center;">作品</th>
              <th style="text-align: center;">评委评分</th>
              <th style="text-align: center;">大众评分</th>
              <th style="text-align: right;">最终得分</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="team in rankings" :key="team.team_id" class="fade-in">
              <td>
                <div class="rank-badge" :class="getRankClass(team.rank)">
                  {{ team.rank }}
                </div>
              </td>
              <td>
                <div>
                  <strong>{{ team.team_name }}</strong>
                  <span style="color: var(--text-secondary); margin-left: 0.5rem;">#{{ team.group_number }}</span>
                </div>
              </td>
              <td style="text-align: center;">
                <a v-if="team.url" :href="team.url" target="_blank" class="btn btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">
                  查看作品
                </a>
                <span v-else style="color: var(--text-secondary);">-</span>
              </td>
              <td style="text-align: center;">
                <div v-if="team.judge.count > 0">
                  <span style="font-weight: 600;">{{ team.judge.average }}</span>
                  <span style="color: var(--text-secondary); font-size: 0.75rem;"> ({{ team.judge.count }}人)</span>
                </div>
                <span v-else style="color: var(--text-secondary);">-</span>
              </td>
              <td style="text-align: center;">
                <div v-if="team.public.count > 0">
                  <span style="font-weight: 600;">{{ team.public.average }}</span>
                  <span style="color: var(--text-secondary); font-size: 0.75rem;"> ({{ team.public.count }}人)</span>
                </div>
                <span v-else style="color: var(--text-secondary);">-</span>
              </td>
              <td style="text-align: right;">
                <span style="font-size: 1.5rem; font-weight: 700; color: var(--accent);">
                  {{ team.finalScore }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card fade-in" style="margin-top: 2rem;">
      <h3 class="section-title">计分规则</h3>
      <ul style="color: var(--text-secondary); line-height: 2;">
        <li>评委评分占比 <strong style="color: var(--accent);">50%</strong></li>
        <li>大众评分占比 <strong style="color: var(--accent);">50%</strong></li>
        <li>最终得分 = 评委平均分 × 50% + 大众平均分 × 50%</li>
        <li>如果只有一方评分，则该方评分即为最终得分</li>
      </ul>
    </div>
  </div>
</template>
