import { toast } from "vue3-toastify";

type ToastType = "success" | "error" | "info";

export const useToast = async (type: ToastType, message: string) => {
  if (process.server) return;
  if (!message) return;

  toast[type](message, {
    //@ts-ignore
    position: "top-center",
    //@ts-ignore
    autoClose: 2000
  });
};
