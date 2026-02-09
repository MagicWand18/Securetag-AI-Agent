import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

const MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", provider: "Anthropic" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", provider: "Anthropic" },
];

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[200px] bg-zinc-800 border-zinc-700 text-white text-sm h-8">
        <SelectValue placeholder="Seleccionar modelo" />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-700">
        {MODELS.map((model) => (
          <SelectItem
            key={model.id}
            value={model.id}
            className="text-white hover:bg-zinc-800 text-sm"
          >
            <span>{model.label}</span>
            <span className="text-zinc-500 text-xs ml-2">{model.provider}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
