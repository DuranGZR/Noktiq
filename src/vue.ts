import { defineComponent, onMounted, onBeforeUnmount, watch, type PropType } from 'vue';
import { mountNoktiq } from './index.js';
import type { NoktiqOptions } from './options.js';

export const Noktiq = defineComponent({
  name: 'Noktiq',
  props: {
    enabled: { type: Boolean, default: false },
    useHashLocation: { type: Boolean, default: true },
    enableKeyboardShortcuts: { type: Boolean, default: true },
    outputDetail: { type: String as PropType<NoktiqOptions['outputDetail']>, default: 'standard' },
    copyFormat: { type: String as PropType<NoktiqOptions['copyFormat']>, default: 'markdown' },
    openInEditor: { type: Function as PropType<NoktiqOptions['openInEditor']>, default: undefined },
    portalContainer: { type: [Object, Function] as PropType<NoktiqOptions['portalContainer']>, default: null },
  },
  setup(props) {
    let dispose: (() => void) | undefined;
    const sync = () => { dispose?.(); dispose = props.enabled ? mountNoktiq({ ...props, portalContainer: () => {
      const target = props.portalContainer; return typeof target === 'function' ? target() : target;
    }, openInEditor: props.openInEditor ? location => props.openInEditor?.(location) : undefined }) : undefined; };
    onMounted(sync);
    watch(() => [props.enabled, props.useHashLocation, props.enableKeyboardShortcuts, props.outputDetail, props.copyFormat, !!props.openInEditor], sync);
    onBeforeUnmount(() => dispose?.());
    return () => null;
  },
});
