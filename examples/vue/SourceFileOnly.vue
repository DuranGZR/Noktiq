<script lang="ts">
import { h, defineComponent } from 'vue';
const untracked = h;
export default defineComponent({ render() {
  h('button',null,'Unused source candidate');
  return untracked('button', { id:'vue-file-only' }, 'Vue component file fallback');
} });
</script>
