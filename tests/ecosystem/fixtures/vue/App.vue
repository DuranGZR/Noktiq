<script setup>
import { ref, computed, h, defineComponent } from 'vue';
import { Noktiq } from 'noktiq/vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Select from 'primevue/select';
import { VApp, VDialog, VCard, VCardTitle, VCardText, VBtn, VSelect } from 'vuetify/components';
import { RouterView } from 'vue-router';
import { useVirtualizer } from '@tanstack/vue-virtual';
import './style.css';
const prime=ref(false),vuetify=ref(false),selected=ref(null),selectedVuetify=ref(null),parent=ref(null);
const isDev=import.meta.env.DEV;
const records=Array.from({length:20000},(_,index)=>({id:`record-${index}`,name:'Repeated row'}));
const virtual=useVirtualizer(computed(()=>({count:records.length,getScrollElement:()=>parent.value,estimateSize:()=>36,overscan:3,getItemKey:index=>records[index].id})));
</script>
<template>
  <VApp><RouterView v-if="$route.path.startsWith('/router/')"/><main v-else><h1>Vue UI ecosystem</h1>
    <Button id="open-prime" label="Open PrimeVue dialog" @click="prime=true"/><Dialog v-model:visible="prime" modal header="PrimeVue dialog" :style="{width:'500px'}"><button id="prime-target">PrimeVue target</button><button id="close-prime" @click="prime=false">Close PrimeVue</button></Dialog>
    <VBtn id="open-vuetify" @click="vuetify=true">Open Vuetify dialog</VBtn><VDialog v-model="vuetify" max-width="500"><VCard><VCardTitle>Vuetify dialog</VCardTitle><VCardText><button id="vuetify-target">Vuetify target</button><VBtn id="vuetify-generated">Vuetify generated button</VBtn><button id="close-vuetify" @click="vuetify=false">Close Vuetify</button></VCardText></VCard></VDialog>
    <Select id="open-prime-select" v-model="selected" :options="['Alpha','Beta']" placeholder="PrimeVue select"/>
    <VSelect id="open-vuetify-select" v-model="selectedVuetify" :items="['Alpha','Beta']" label="Vuetify select"/>
    <button id="normal-target">Normal target</button>
    <section><h2>Vue virtual rows</h2><div id="virtual-scroll" ref="parent" style="height:260px;overflow:auto"><div :style="{height:virtual.getTotalSize()+'px',position:'relative'}"><div v-for="row in virtual.getVirtualItems()" :key="row.key" :data-row-id="records[row.index].id" :style="{position:'absolute',top:row.start+'px',height:'36px',width:'100%'}"><button data-cell="virtual">{{records[row.index].name}}</button></div></div></div></section>
  </main><Noktiq :enabled="isDev"/></VApp>
</template>
