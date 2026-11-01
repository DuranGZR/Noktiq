<script lang="ts">
import { h, defineComponent, ref, withDirectives } from 'vue';
export default defineComponent({ setup() {
  const active=ref(false);
  return () => {
    const vnode=h('button',{id:'vue-conditional-directive',onClick:()=>{active.value=!active.value}},active.value?'Directive on':'Directive off');
    return active.value?withDirectives(vnode,[[{}]]):vnode;
  };
} });
</script>
