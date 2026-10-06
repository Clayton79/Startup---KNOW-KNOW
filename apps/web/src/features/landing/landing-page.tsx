import { PageMeta } from '@/components/seo/page-meta';
import { CategoriesSection } from './categories-section';
import { CreditsSection } from './credits-section';
import { FinalCta } from './final-cta';
import { Hero } from './hero';
import { HowItWorksSection } from './how-it-works-section';
import { TrustSection } from './trust-section';

export function LandingPage() {
  return (
    <>
      <PageMeta
        title="KNOW-KNOW"
        description="Na KNOW-KNOW, seu conhecimento tem valor. Ensine o que você sabe, ganhe créditos e use-os para aprender com outras pessoas."
      />
      <Hero />
      <HowItWorksSection />
      <CategoriesSection />
      <CreditsSection />
      <TrustSection />
      <FinalCta />
    </>
  );
}
