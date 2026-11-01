<script setup lang="ts">
import { ref } from 'vue';
const tag=ref('button');
function nextTag() { (window as any).componentTagReads = ((window as any).componentTagReads || 0) + 1; return tag.value; }
</script>
<template>
  <component :is="nextTag()" id="vue-template-dynamic">Dynamic template declaration</component>
</template>
