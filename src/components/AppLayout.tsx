import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AssistantPanel from "@/components/AssistantPanel";

const AppLayout = () => {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const navigate = useNavigate();

  const handleQuickAction = (action: string) => {
    if (action === "video") {
      navigate("/workspace?tab=video");
    }
    // settings handled within workspace
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onAssistantToggle={() => setAssistantOpen(true)} />
      <main className="pt-14">
        <Outlet />
      </main>
      <AssistantPanel
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onQuickAction={handleQuickAction}
      />
    </div>
  );
};

export default AppLayout;
