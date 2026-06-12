import { SectionHeading } from '@/components/ui/SectionHeading.jsx'
import { FAQSection } from '@/components/home/FAQSection.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { APP } from '@/utils/constants.js'

export function FAQPage() {
  usePageSeo({ title: 'FAQ', description: `Frequently asked questions about ${APP.name}.` })
  return (
    <div className="relative">
      <section className="relative overflow-hidden border-b border-[rgb(var(--border))] py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-hero-mesh opacity-50" />
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-25" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading align="left" eyebrow="Support" title="Frequently asked questions" description="Common queries from teams, partners, and sponsors. Can't find your answer? Reach out via the contact page." />
        </div>
      </section>
      <FAQSection />
    </div>
  )
}
