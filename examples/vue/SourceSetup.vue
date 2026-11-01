<script lang="ts">
import { h, defineComponent } from 'vue';
export default defineComponent({ setup(props, {expose}) {
  expose({sourceSetup:true});
  return () => h('button',{id:'vue-setup-context'},'Vue setup context');
} });
</script>
