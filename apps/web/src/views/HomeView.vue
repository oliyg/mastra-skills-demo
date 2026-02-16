<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCounterStore } from '@/stores';

const counter = useCounterStore();
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-4xl font-bold">欢迎来到 AI Workflow</h1>
    <p class="text-muted-foreground">这是一个基于 Vue 3 + Mastra + DeepSeek 的全栈 AI 应用</p>

    <Card class="max-w-md">
      <CardHeader>
        <CardTitle>Pinia 状态管理示例</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <p class="text-2xl font-bold">计数: {{ counter.count }}</p>
        <div class="flex gap-2">
          <Button @click="counter.decrement()"> - </Button>
          <Button @click="counter.increment()"> + </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
