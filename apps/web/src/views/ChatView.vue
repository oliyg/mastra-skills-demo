<script setup lang="ts">
import { useChat } from '@ai-sdk/vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
});
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <h1 class="text-3xl font-bold">AI 对话</h1>

    <Card>
      <CardHeader>
        <CardTitle>与 DeepSeek 对话</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-4 max-h-96 overflow-y-auto">
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="[
              'p-3 rounded-lg max-w-[80%]',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground ml-auto'
                : 'bg-muted mr-auto',
            ]"
          >
            <p class="text-sm font-medium mb-1">
              {{ message.role === 'user' ? '你' : 'AI' }}
            </p>
            <p>{{ message.content }}</p>
          </div>
        </div>

        <form class="flex gap-2" @submit.prevent="handleSubmit">
          <Input v-model="input" placeholder="输入消息..." :disabled="isLoading" class="flex-1" />
          <Button type="submit" :disabled="isLoading">
            {{ isLoading ? '发送中...' : '发送' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
