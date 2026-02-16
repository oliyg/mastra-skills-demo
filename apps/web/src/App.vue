<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import { Button } from '@/components/ui/button';
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b">
      <div class="container mx-auto px-4 py-4">
        <nav class="flex items-center gap-4">
          <RouterLink to="/" class="text-xl font-bold"> AI Workflow </RouterLink>
          <div class="ml-auto flex gap-2">
            <RouterLink to="/">
              <Button variant="ghost"> 首页 </Button>
            </RouterLink>
            <RouterLink to="/chat">
              <Button variant="ghost"> AI 对话 </Button>
            </RouterLink>
          </div>
        </nav>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>
