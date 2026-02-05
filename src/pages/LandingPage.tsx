import { Check, Sparkles, Calendar, Image as ImageIcon, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { PATHS } from '@/core/routes/paths';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const tiers = [
  {
    name: 'Free',
    price: 'Available now',
    description: 'Everything you need to build your first dynamic planner',
    features: [
      'Create 1 planner',
      'Upload your own images',
      'Basic dynamic pages (monthly calendar)',
      'Limited date range generation',
      'Local storage on your device',
    ],
    cta: 'Start for free',
  },
  {
    name: 'Pro Add-ons',
    price: 'Coming soon',
    description: 'Unlock advanced capabilities, only what you need',
    features: [
      'Advanced dynamic pages (weekly, covers, custom layouts)',
      'Extended date ranges',
      'Premium typography packs',
      'Specialized selectors & generators',
    ],
    cta: 'Coming soon',
    highlight: true,
  },
  {
    name: 'Cloud',
    price: 'Coming later',
    description: 'Sync and protect your planners',
    features: [
      'Cloud sync across devices',
      'Backup & restore',
      'Planner sharing',
      'Version history',
    ],
    cta: 'Coming later',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Planner Generator</div>
          <nav className="flex gap-6 text-sm text-neutral-600">
            <a href="#how" className="hover:text-neutral-900">How it works</a>
            <a href="#features" className="hover:text-neutral-900">Features</a>
            <a href="#roadmap" className="hover:text-neutral-900">Roadmap</a>
            <a href="#pricing" className="hover:text-neutral-900">Pricing</a>
          </nav>
          <a href={PATHS.editor} className="px-6 py-3 rounded-2xl bg-black text-white font-medium shadow">
            Start creating
          </a>
        </div>
      </header>

      {/* Hero */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto px-6 py-28 text-center"
      >
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Design once.
          <br />
          Generate planners forever.
        </h1>
        <p className="text-lg md:text-xl text-neutral-600 max-w-3xl mx-auto mb-10">
          Upload your own designs, define dynamic areas, and generate fully-dated planners
          automatically — perfectly aligned, every time.
        </p>
        <div className="flex justify-center gap-4">
          <a href={PATHS.editor} className="px-6 py-3 rounded-2xl bg-black text-white font-medium shadow">
            Start creating
          </a>
          <a className="px-6 py-3 rounded-2xl border border-neutral-300 font-medium">
            See an example
          </a>
        </div>
      </motion.section>

      {/* How it works */}
      <section id="how" className="bg-white py-28">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            className="text-3xl font-semibold mb-20 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            How it works
          </motion.h2>
          <div className="grid md:grid-cols-4 gap-10">
            {[{
              icon: ImageIcon,
              title: 'Upload your design',
              text: 'Start from your own images: covers, monthly or weekly layouts.'
            }, {
              icon: Layers,
              title: 'Define dynamic zones',
              text: 'Select exactly where months, days or years should appear.'
            }, {
              icon: Calendar,
              title: 'Choose a date range',
              text: 'From a few weeks to a full year — you decide.'
            }, {
              icon: Sparkles,
              title: 'Generate automatically',
              text: 'Pages are duplicated, ordered and filled with correct data.'
            }].map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border bg-neutral-50 text-center"
              >
                <step.icon className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-neutral-600 text-sm">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-28 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="max-w-3xl mx-auto text-center mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-3xl font-semibold mb-6">Built for flexible planners</h2>
            <p className="text-neutral-600">
              This tool adapts to your designs instead of forcing you into predefined layouts.
              You stay in control of structure, visuals and logic.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10">
            {[{
              title: 'Design-first',
              text: 'Start from your own visuals. No locked templates, no forced grids.'
            }, {
              title: 'Truly dynamic',
              text: 'Dates, months and days are generated programmatically based on real calendars.'
            }, {
              title: 'Generative by nature',
              text: 'One page design can become dozens of perfectly ordered planner pages.'
            }, {
              title: 'Print-aware',
              text: 'Layouts are built with PDF export and real-world printing in mind.'
            }, {
              title: 'Local-first',
              text: 'Your data stays on your device. No accounts, no uploads required.'
            }, {
              title: 'Expandable',
              text: 'Advanced selectors, typography packs and cloud sync are designed to plug in later.'
            }].map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-2xl bg-white border"
              >
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-neutral-600 text-sm">{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            className="text-3xl font-semibold text-center mb-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            Roadmap
          </motion.h2>

          <div className="relative max-w-4xl mx-auto">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-neutral-300" />

            {[{
              phase: 'Now',
              title: 'Core planner generation',
              items: [
                'Upload custom images',
                'Define dynamic areas',
                'Generate planners by date range',
                'Local-first storage',
                'PDF export',
              ],
            }, {
              phase: 'Next',
              title: 'Advanced generation & customization',
              items: [
                'Weekly and advanced page generators',
                'Extended date logic and rules',
                'Advanced selectors',
                'Typography packs',
              ],
            }, {
              phase: 'Later',
              title: 'Cloud & collaboration',
              items: [
                'Cloud sync across devices',
                'Backup & restore',
                'Planner sharing',
                'Version history',
              ],
            }].map((block, index) => (
              <motion.div
                key={block.phase}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative grid md:grid-cols-2 gap-16 mb-24"
              >
                {/* Left spacer or content */}
                <div className={index % 2 === 0 ? 'md:text-right md:pr-16' : 'hidden md:block'}>
                  {index % 2 === 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">{block.phase}</p>
                      <h3 className="text-xl font-semibold mb-4">{block.title}</h3>
                      <ul className="space-y-2 text-neutral-700 text-sm">
                        {block.items.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Timeline dot */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black top-2" />

                {/* Right spacer or content */}
                <div className={index % 2 === 1 ? 'md:pl-16' : 'md:pl-16'}>
                  {index % 2 === 1 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">{block.phase}</p>
                      <h3 className="text-xl font-semibold mb-4">{block.title}</h3>
                      <ul className="space-y-2 text-neutral-700 text-sm">
                        {block.items.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Pricing (Coming soon) */}
      <section id="pricing" className="py-24 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-center mb-12">Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {tiers.map(tier => (
              <div
                key={tier.name}
                className={`rounded-2xl p-8 border bg-white ${tier.highlight ? 'ring-2 ring-black' : ''}`}
              >
                <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                <p className="text-neutral-600 mb-4">{tier.description}</p>
                <p className="text-sm font-medium mb-6">{tier.price}</p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map(feature => (
                    <li key={feature} className="flex gap-2 items-start text-sm">
                      <Check className="w-4 h-4 mt-1" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 rounded-xl font-medium border bg-neutral-50">
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
          

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-12 items-start">
            {/* Brand */}
            <div>
              <p className="font-semibold text-lg mb-3">Planner Builder</p>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Build fully custom planners using your own designs and dynamic date logic.
                A local‑first tool for creators who care about structure, flexibility and craft.
              </p>
            </div>

            {/* Links */}
            <div className="md:justify-self-center">
              <p className="text-xs uppercase tracking-widest text-neutral-500 mb-4">Product</p>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li><a href="#features" className="hover:underline">Features</a></li>
                <li><a href="#how-it-works" className="hover:underline">How it works</a></li>
                <li><a href="#roadmap" className="hover:underline">Roadmap</a></li>
                <li><a href="#pricing" className="hover:underline">Pricing</a></li>
              </ul>
            </div>

            {/* Status */}
            <div className="md:justify-self-end">
              <p className="text-xs uppercase tracking-widest text-neutral-500 mb-4">Status</p>
              <p className="text-sm text-neutral-700 mb-2">Early access · Local‑first</p>
              <p className="text-xs text-neutral-500">Cloud sync & accounts coming later</p>
            </div>
          </div>

          <div className="mt-16 pt-6 border-t border-neutral-100 flex flex-col md:flex-row gap-4 justify-between items-center text-xs text-neutral-500">
            <p>© {new Date().getFullYear()} Planner Builder. All rights reserved.</p>
            <p>Designed & built with care.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
