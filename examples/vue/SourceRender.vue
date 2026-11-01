<script lang="ts">
import { h as node, defineComponent, cloneVNode } from 'vue';
export default defineComponent({ render() {
  const tag='button';
  const props={id:'vue-props-before'};
  const mutable=node('button',props,'Vue original props reference');
  props.id='vue-props-after';
  const cloned=cloneVNode(node('button', null, 'Vue cloned VNode'), {id:'vue-cloned'});
  return node('div', { id:'vue-render-root' }, [
    node('button', { id:'vue-h-props' }, 'Vue h props'),
    node('button', 'Vue h text'),
    node('button', [node('span', 'Vue h array')]),
    node('button', node('span', 'Vue h VNode')),
    node(tag, { id:'vue-h-dynamic' }, 'Vue h dynamic native'),
    mutable,
    cloned,
  ]);
} });
</script>
