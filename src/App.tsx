import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import Workspace from "@/pages/Workspace";
import Storage from "@/pages/Storage";
import SettingsPage from "@/pages/SettingsPage";
import Tariffs from "@/pages/Tariffs";
import { GoogleOAuthProvider } from '@react-oauth/google';

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import { Provider } from "react-redux";
import { store } from "./lib/store/store";
import PrivateRoute from "./lib/kernel/PrivateRoute";

const queryClient = new QueryClient();

const App = () => (
  <Provider store={store}>
    <GoogleOAuthProvider clientId="420790984156-v8tud6r46hr8gbevmb9qm6tjsp6svoam.apps.googleusercontent.com">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/workspace" element={<PrivateRoute component={Workspace} />} />
                  <Route path="/storage" element={<Storage />} />
                  <Route path="/tariffs" element={<Tariffs />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </Provider>
);

export default App;
