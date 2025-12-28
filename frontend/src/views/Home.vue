<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="container">
    <div class="hero fade-in">
      <h1>比赛评分系统</h1>
      <p>公平、透明、专业的作品评审平台</p>
      <RouterLink to="/team" class="btn btn-primary">选手入口</RouterLink>
    </div>

    <div class="feature-grid">
      <div class="card feature-card fade-in" style="animation-delay: 0.1s">
        <div class="icon">🎯</div>
        <h3>选手注册</h3>
        <p>快速注册队伍，提交作品链接</p>
      </div>
      <div class="card feature-card fade-in" style="animation-delay: 0.2s">
        <div class="icon">⭐</div>
        <h3>专业评委</h3>
        <p>5位评委多维度专业评分</p>
      </div>
      <div class="card feature-card fade-in" style="animation-delay: 0.3s">
        <div class="icon">👥</div>
        <h3>大众评分</h3>
        <p>选手互评，公平公正</p>
      </div>
      <div class="card feature-card fade-in" style="animation-delay: 0.4s">
        <div class="icon">📊</div>
        <h3>实时排名</h3>
        <p>评委50% + 大众50%</p>
      </div>
    </div>

    <div class="card fade-in" style="margin-top: 3rem; animation-delay: 0.5s">
      <h3 class="section-title">评分维度</h3>
      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th>满分</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>完成度</td>
            <td><span class="badge badge-success">5分</span></td>
            <td>项目完成情况，无致命bug</td>
          </tr>
          <tr>
            <td>静态设计</td>
            <td><span class="badge badge-success">5分</span></td>
            <td>页面美观，布局合理</td>
          </tr>
          <tr>
            <td>动态效果</td>
            <td><span class="badge badge-success">5分</span></td>
            <td>动画效果美观有趣</td>
          </tr>
          <tr>
            <td>创新性</td>
            <td><span class="badge badge-success">5分</span></td>
            <td>创意新颖，有亮点</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
