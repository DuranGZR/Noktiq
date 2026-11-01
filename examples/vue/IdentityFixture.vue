<script setup lang="ts">
import { Noktiq } from 'noktiq/vue';
import PaymentForm from './PaymentFormFixture.vue';
const isDev = import.meta.env.DEV;
</script>

<template>
  <main><h1>Identity fixture</h1><PaymentForm/><Noktiq :enabled="isDev"/></main>
</template>
