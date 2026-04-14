import LandingHero from "@/components/landing/LandingHero";
import LandingBenefits from "@/components/landing/LandingBenefits";
import LandingAITools from "@/components/landing/LandingAITools";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingFooter from "@/components/landing/LandingFooter";
import { useAuth } from "@/contexts/AuthContext";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHero />
      <LandingBenefits />
      <LandingAITools />
      <LandingHowItWorks />
      <LandingPricing />
      <LandingFooter />
    </div>
  );
};

export default Landing;
