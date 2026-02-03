<script setup>
import ChatPage from './components/ChatPage.vue'
</script>

<template>
  <ChatPage />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f0f2f5;
  height: 100%;
  overflow: hidden;
}

#app {
  height: 100%;
}
</style>
