import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      expand={false}
      visibleToasts={1}
      offset={16}
      richColors
      toastOptions={{
        duration: 2500,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/90 group-[.toaster]:text-foreground group-[.toaster]:border-border/30 group-[.toaster]:shadow-2xl group-[.toaster]:backdrop-blur-2xl group-[.toaster]:rounded-2xl group-[.toaster]:px-4 group-[.toaster]:py-3",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          title: "group-[.toast]:text-sm group-[.toast]:font-semibold",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:text-xs",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:text-xs",
          success: "group-[.toaster]:!bg-primary/15 group-[.toaster]:!border-primary/25 group-[.toaster]:!text-foreground",
          error: "group-[.toaster]:!bg-destructive/15 group-[.toaster]:!border-destructive/25 group-[.toaster]:!text-foreground",
          info: "group-[.toaster]:!bg-blue-500/15 group-[.toaster]:!border-blue-500/25 group-[.toaster]:!text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
