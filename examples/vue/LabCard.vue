<script setup lang="ts">
defineProps<{ name: string }>();
defineEmits<{ action: [] }>();
</script>
<template>
  <article :data-testid="`card-${name}`"><p>{{ name }}</p><button data-testid="repeated-action" @click="$emit('action')"><span>Kaydet</span></button></article>
</template>
