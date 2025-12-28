<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <nav class="nav">
    <RouterLink to="/" class="nav-brand">比赛评分系统</RouterLink>
    <div class="nav-links">
      <RouterLink to="/" class="nav-link">首页</RouterLink>
      <RouterLink to="/register" class="nav-link">注册队伍</RouterLink>
      <RouterLink to="/submit" class="nav-link">提交作品</RouterLink>
    </div>
  </nav>
  <RouterView />
</template>
