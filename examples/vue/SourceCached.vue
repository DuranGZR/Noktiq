<script lang="ts">
import { h, defineComponent, ref, type VNode } from 'vue';
export default defineComponent({ setup() {
  const active=ref(false);let cached:VNode;
  return () => {
    const state=active.value;
    if(!cached) cached=h('button',{id:'vue-cached-source',onClick:()=>{active.value=!active.value}},'Cached Vue VNode');
    else if(state) h('button',null,'Unused render candidate');
    return cached;
  };
} });
</script>
