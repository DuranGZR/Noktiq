<script setup>
import ChildCard from './SourceKebabButton.vue';
import RouterLink from './SourceKebabButton.vue';
</script>

<template>
  <section id="vue-kebab-source"><child-card /></section>
  <section id="vue-capital-source"><ChildCard /></section>
  <section id="vue-kebab-router"><router-link /></section>
</template>
