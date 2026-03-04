import { forwardRef } from "react";
import { useLanguage, Language } from "@/hooks/useLanguage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

const languages: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "uz", label: "O'zbek" },
];

const LanguageSelector = forwardRef<HTMLDivElement>((_, ref) => {
  const { lang, setLang } = useLanguage();

  return (
    <div ref={ref}>
      <Select value={lang} onValueChange={(v) => setLang(v as Language)}>
        <SelectTrigger className="w-[130px] gap-2">
          <Globe className="h-4 w-4 shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languages.map((l) => (
            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

LanguageSelector.displayName = "LanguageSelector";

export default LanguageSelector;
