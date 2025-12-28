import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000
})

// 选手接口
export const team = {
  register: (data) => api.post('/register', data),
  submit: (data) => api.post('/post', data)
}

// 评委接口
export const judge = {
  getTeams: (password) => api.get('/judge/teams', { params: { password } }),
  score: (data) => api.post('/judge/score', data),
  getScores: (password) => api.get('/judge/scores', { params: { password } })
}

// 大众评分接口
export const publicScore = {
  getTeams: (team_name, password) => api.get('/public/teams', { params: { team_name, password } }),
  score: (data) => api.post('/public/score', data),
  getScores: (team_name, password) => api.get('/public/scores', { params: { team_name, password } })
}

// 管理员接口
export const admin = {
  getTeams: (password) => api.get('/admin/teams', { params: { password } }),
  getSubmissions: (password) => api.get('/admin/submissions', { params: { password } }),
  deleteTeam: (team_name, password) => api.delete(`/admin/teams/${encodeURIComponent(team_name)}`, { params: { password } }),
  getRankings: (password) => api.get('/admin/rankings', { params: { password } }),
  reset: (password, confirm_password) => api.post('/admin/reset', { password, confirm_password })
}

// 排行榜接口
export const rankings = {
  get: () => api.get('/rankings')
}

export default api
