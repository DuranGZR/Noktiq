import { createApp, h, defineComponent, onMounted } from 'vue';
import { createRouter, createWebHistory, useRoute, useRouter } from 'vue-router';
import PrimeVue from 'primevue/config';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import App from './App.vue';
const Page=defineComponent({setup(){const route=useRoute(),router=useRouter();onMounted(()=>{(window as any).ecosystemNavigate=(to:string)=>router.push(to)});return()=>h('main',[h('h1','Vue Router'),h('button',{id:'route-target'},`Route ${route.params.slug}`)])}});
const router=createRouter({history:createWebHistory(),routes:[{path:'/router/:slug',component:Page},{path:'/:pathMatch(.*)*',component:{render:()=>null}}]});
createApp(App).use(router).use(PrimeVue,{unstyled:true}).use(createVuetify()).mount('#root');
