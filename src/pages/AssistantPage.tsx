import { Sparkles } from "lucide-react";

const AssistantPage = () => {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
          <Sparkles className="h-8 w-8 text-primary icon-glow" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Ассистент</h1>
        <p className="text-muted-foreground text-sm">Ваш AI-помощник для работы с платформой</p>
      </div>
    </div>
  );
};

export default AssistantPage;
