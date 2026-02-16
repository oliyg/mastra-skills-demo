import { cva, type VariantProps } from 'class-variance-authority';
import { defineComponent, type PropType, h } from 'vue';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

export const Button = defineComponent({
  name: 'Button',
  props: {
    variant: {
      type: String as PropType<ButtonVariants['variant']>,
      default: 'default',
    },
    size: {
      type: String as PropType<ButtonVariants['size']>,
      default: 'default',
    },
    as: {
      type: String,
      default: 'button',
    },
    class: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String as PropType<'button' | 'submit' | 'reset'>,
      default: 'button',
    },
    onClick: {
      type: Function as PropType<(event: MouseEvent) => void>,
      default: undefined,
    },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const Tag = props.as as any;
      return h(
        Tag,
        {
          class: cn(buttonVariants({ variant: props.variant, size: props.size }), props.class),
          disabled: props.disabled,
          type: props.type,
          onClick: props.onClick,
          ...attrs,
        },
        slots.default?.()
      );
    };
  },
});

export { buttonVariants };
