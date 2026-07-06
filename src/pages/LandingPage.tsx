import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsStrip } from '@/components/landing/StatsStrip';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';

import { CtaSection } from '@/components/landing/CtaSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <LandingNav />
      <HeroSection />
      <StatsStrip />
      <FeaturesSection />
      <HowItWorksSection />
      
      <CtaSection />
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
