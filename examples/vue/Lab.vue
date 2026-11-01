<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Noktiq } from 'noktiq/vue';
import LabCard from './LabCard.vue';
import { mountLabBoundaries } from '../lab-elements';
const names = ref(['alpha', 'beta']), clicks = ref(0);
const boundary = ref<HTMLDivElement>(), modal = ref<HTMLDialogElement>();
let cleanup: (() => void) | undefined;
onMounted(() => { cleanup = mountLabBoundaries(boundary.value!); });
onBeforeUnmount(() => cleanup?.());
const enabled = import.meta.env.DEV;
</script>
<template>
  <main><header class="lab-heading"><div><p class="eyebrow">NOKTIQ / VUE TEST LAB</p><h1>Doğru yeri bulabiliyor muyuz?</h1><p>Benzer öğeler, değişen sıralar, uzun listeler ve belge sınırları.</p></div><a href="/">Demoya dön ↗</a></header>
    <div class="lab-grid">
      <section class="lab-card"><h2>Benzer kartlar</h2><p>Aynı yazı, aynı bileşen ve aynı kaynak satırı. Kart kimliği farkı belirlemeli.</p><button id="lab-reorder" @click="names.reverse()">Sırayı değiştir</button><div class="lab-items"><LabCard v-for="name in names" :key="name" :name="name" @action="clicks++"/></div><p id="lab-live-status">Uygulama işlemleri: {{ clicks }}</p></section>
      <section class="lab-card"><h2>Çok satırlı yazı</h2><p id="lab-text">İlk satır.<br/><strong>İkinci satır.</strong><br/>Son kelimeler.</p><p id="lab-mixed">Görünür metin <span data-noktiq-private>GİZLİ-LAB-DEĞERİ</span> ve devamı.</p></section>
      <section class="lab-card"><h2>Kayan liste · 40 satır</h2><div class="lab-scroll" id="lab-scroll"><article v-for="n in 40" :key="n" class="lab-row" :data-testid="`row-${n - 1}`"><span>Satır {{ n }}</span><button @click="clicks++">Düzenle</button></article></div></section>
      <section class="lab-card"><h2>Shadow DOM ve iframe</h2><p>İki aynı Shadow düğmesi ile ayrı bir iframe içindeki hedef.</p><div ref="boundary"/></section>
      <section class="lab-card"><h2>Native modal</h2><button id="lab-open-modal" @click="modal?.showModal()">Pencereyi aç</button><dialog class="lab-modal" ref="modal"><h2>Modal içindeki hedef</h2><button id="lab-modal-target">Bu düğmeyi değiştir</button><form method="dialog"><button>Kapat</button></form></dialog></section>
    </div><Noktiq :enabled="enabled"/></main>
</template>
