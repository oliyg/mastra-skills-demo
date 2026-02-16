import { defineComponent, h, type PropType } from 'vue';
import { cn } from '@/lib/utils';

export const Input = defineComponent({
  name: 'Input',
  props: {
    value: {
      type: String,
      default: '',
    },
    class: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'text',
    },
    onInput: {
      type: Function as PropType<(e: Event) => void>,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    return () =>
      h('input', {
        type: props.type,
        class: cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          props.class
        ),
        value: props.value,
        placeholder: props.placeholder,
        disabled: props.disabled,
        onInput: props.onInput,
        ...attrs,
      });
  },
});
