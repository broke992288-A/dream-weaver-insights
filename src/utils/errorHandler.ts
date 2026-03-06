import { toast } from "@/hooks/use-toast";

const ERROR_MESSAGES: Record<string, string> = {
  "JWT expired": "Сессия муддати тугади. Қайта киринг.",
  "Invalid login credentials": "Логин ёки парол нотўғри.",
  "Email not confirmed": "Email тасдиқланмаган. Почтангизни текширинг.",
  "User already registered": "Бу email аллақачон рўйхатдан ўтган.",
  "duplicate key": "Бу маълумот аллақачон мавжуд.",
  "violates row-level security": "Сизда бу амални бажариш учун рухсат йўқ.",
  "Failed to fetch": "Интернет алоқаси йўқ. Қайта уриниб кўринг.",
  "NetworkError": "Тармоқ хатоси. Интернет алоқасини текширинг.",
};

export function getReadableError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  
  for (const [key, readable] of Object.entries(ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return readable;
    }
  }

  if (message.length > 200) {
    return "Кутилмаган хатолик юз берди. Қайта уриниб кўринг.";
  }

  return message || "Номаълум хатолик юз берди.";
}

export function handleError(error: unknown, context?: string) {
  const readable = getReadableError(error);
  
  console.error(`[${context ?? "App"}] Error:`, error);

  toast({
    title: "Хатолик",
    description: readable,
    variant: "destructive",
  });

  return readable;
}
