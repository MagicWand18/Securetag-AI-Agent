import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { KeyRound } from "lucide-react";

interface ApiKeyPromptProps {
  open: boolean;
  onSave: (key: string) => void;
}

export function ApiKeyPrompt({ open, onSave }: ApiKeyPromptProps) {
  const [key, setKey] = useState("");

  const handleSave = () => {
    const trimmed = key.trim();
    if (trimmed) {
      onSave(trimmed);
      setKey("");
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <KeyRound className="h-5 w-5 text-blue-400" />
            API Key Required
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Ingresa tu API key de SecureTag para usar AI Shield Chat.
            Puedes crear una en{" "}
            <a href="/account" className="text-blue-400 underline hover:text-blue-300">
              tu cuenta
            </a>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="api-key" className="text-zinc-300">
            SecureTag API Key
          </Label>
          <Input
            id="api-key"
            type="password"
            placeholder="st_live_..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 font-mono text-sm"
          />
          <p className="text-xs text-zinc-500">
            La key se guarda localmente en tu navegador.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={!key.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Guardar y continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
