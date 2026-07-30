import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="sonner-toaster"
      toastOptions={{
        classNames: {
          toast: "toast",
          description: "description",
          actionButton: "action-button",
          cancelButton: "cancel-button",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
