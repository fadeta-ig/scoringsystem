import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-[#aa1927]",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-[#e5e3dd]",
        outline:
          "border-border bg-background text-foreground hover:border-slate-400 hover:bg-secondary/60",
        dark: "border-transparent bg-[var(--ink)] text-white hover:bg-[#203958]",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-accent/10",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-[#981522]",
        danger:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-[#981522]",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1.5 px-2 text-xs has-[>svg]:px-2",
        sm: "h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        icon: "size-9 p-0",
        lg: "h-11 px-6 text-base has-[>svg]:px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
