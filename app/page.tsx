"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import PageLayout from "@/components/layout/page-layout"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function HomePage() {
  const router = useRouter()
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "sent">("idle")

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormStatus("sending")
    setTimeout(() => {
      setFormStatus("sent")
      setTimeout(() => setFormStatus("idle"), 3000)
    }, 1000)
  }
  
  return (
    <PageLayout title="" actions={<ThemeToggle />} fullWidth={true}>
      {/* Hero Section */}
      <div className="py-20 px-4 text-center bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-background">
        <div className="max-w-6xl mx-auto">
          <span className="inline-block text-sm font-semibold tracking-wider uppercase text-primary mb-4">
            LLM Evaluation Builder
          </span>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground leading-tight">
            Turn model outputs into defensible decisions with structured human review.
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Upload your outputs, invite reviewers, score with rubrics, and export results. The missing layer for professional AI evaluation cycles.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <button
              onClick={() => router.push("/data-scientist")}
              className="inline-flex items-center px-6 py-3 text-base font-semibold rounded-lg shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Start an evaluation
            </button>
            <a
              href="#contact"
              className="inline-flex items-center px-6 py-3 text-base font-semibold rounded-lg border border-input bg-background hover:bg-muted/50 transition-all"
            >
              Request a demo
            </a>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Works with your stack: Bring outputs from any model, vendor, or pipeline—no integration required.</span>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="py-16 px-4 bg-muted/50 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
              <p className="italic text-foreground mb-4">
                "We finally have a consistent way to measure model performance across our different product teams. The audit trail is essential for our compliance needs."
              </p>
              <p className="text-sm font-medium text-muted-foreground">Applied ML Lead, Enterprise Fintech</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
              <p className="italic text-foreground mb-4">
                "The side-by-side comparison feature cut our prompt iteration cycles in half. We stopped guessing and started measuring."
              </p>
              <p className="text-sm font-medium text-muted-foreground">Data Scientist, E-commerce Giant</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
              <p className="italic text-foreground mb-4">
                "Setting up a human-in-the-loop workflow used to take weeks of custom engineering. Now we can launch a new evaluation in minutes."
              </p>
              <p className="text-sm font-medium text-muted-foreground">AI Platform Engineer, HealthTech</p>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div id="how-it-works" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-foreground">How it works</h2>
          <p className="text-xl text-muted-foreground text-center mb-12 max-w-3xl mx-auto">
            A streamlined workflow designed for technical teams who need reliable data, not more infrastructure.
          </p>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                num: 1,
                title: "Upload dataset",
                desc: "Import your model outputs as CSV or XLSX. Support for single outputs or multi-column comparisons.",
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                ),
              },
              {
                num: 2,
                title: "Configure rubric",
                desc: "Define custom criteria: Likert scales, binary checks, or free-text justification fields.",
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                ),
              },
              {
                num: 3,
                title: "Invite reviewers",
                desc: "Onboard internal SMEs or external contractors. Track progress and completion in real-time.",
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                ),
              },
              {
                num: 4,
                title: "Export results",
                desc: "Download structured judgments as CSV for downstream analysis and model fine-tuning.",
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                ),
              },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{step.num}. {step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-20 px-4 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-foreground">What you get</h2>
          <p className="text-xl text-muted-foreground text-center mb-12 max-w-3xl mx-auto">
            Everything you need to manage the human evaluation layer at scale.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Reviewer Tracking", desc: "Manage multiple reviewers, assign specific data slices, and monitor individual progress through completion dashboards." },
              { title: "Blind Comparison", desc: "Support for side-by-side (A/B) testing with randomized positioning to eliminate reviewer bias in model bake-offs." },
              { title: "Custom Rubrics", desc: "Build complex evaluation forms with ratings, multi-select, and required text justifications for every judgment." },
              { title: "Audit Trail", desc: "Full accountability with timestamps and reviewer IDs for every single judgment, ensuring data integrity for enterprise use." },
              { title: "RBAC", desc: "Role-based access control for Admins, Owners, and Reviewers to keep your evaluation projects secure and organized." },
              { title: "AI Drafting", desc: "Optionally use AI to help draft initial rubrics based on your dataset, which you can then refine and lock for reviewers.", optional: true },
            ].map((feature, idx) => (
              <div key={idx} className="bg-card p-6 rounded-lg border border-border hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center gap-2">
                  {feature.title}
                  {feature.optional && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full uppercase font-bold">
                      Optional
                    </span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Anti-Features */}
      <div className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-4">What we don't do (by design)</h2>
              <p className="text-xl text-slate-400">
                We focus exclusively on the human evaluation layer. We don't compete with your model hosting or monitoring stack.
              </p>
            </div>
            <div className="space-y-8">
              {[
                { title: "No Model Execution", desc: "We don't run your models, manage endpoints, or select model versions. You bring the outputs; we provide the review environment." },
                { title: "No Automated Regression", desc: "We don't claim to automatically detect regressions. We provide the structured human data you need to verify them yourself." },
                { title: "No Black Boxes", desc: "We don't use proprietary \"evaluator models\" to grade your data. The judgments come from your experts, on your terms." },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 text-red-500">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">{item.title}</h4>
                    <p className="text-slate-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-foreground">Tailored for Data Science Teams</h2>
          <p className="text-xl text-muted-foreground text-center mb-12">
            Common scenarios where structured human evaluation is the only path to a confident release.
          </p>
          <div className="space-y-4">
            {[
              { title: "Model & Vendor Bake-offs", desc: "Compare outputs from GPT-4, Claude, and your fine-tuned Llama models side-by-side to choose the best engine for your use case." },
              { title: "Prompt Iteration Reviews", desc: "Quantify the impact of prompt changes by having SMEs review old vs. new outputs across a representative dataset." },
              { title: "SME vs Model Comparison", desc: "Establish a \"Gold Standard\" by having experts provide reference answers and then grading model outputs against them." },
              { title: "Safety & Appropriateness Checks", desc: "Run rigorous human red-teaming cycles to ensure model outputs meet your brand's safety and tone guidelines." },
              { title: "Release Readiness Reviews", desc: "Create a defensible \"Go/No-Go\" report based on structured human feedback before deploying a new model to production." },
            ].map((useCase, idx) => (
              <div key={idx} className="p-6 border-l-4 border-primary bg-muted/30 rounded-r-lg">
                <h4 className="text-lg font-semibold mb-1 text-foreground">{useCase.title}</h4>
                <p className="text-muted-foreground text-sm">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Teaser */}
      <div className="py-20 px-4 bg-muted/50">
        <div className="max-w-3xl mx-auto text-center bg-card p-12 rounded-2xl border border-border shadow-xl">
          <h2 className="text-3xl font-bold mb-4 text-foreground">Simple team-based pricing</h2>
          <p className="text-muted-foreground mb-8">
            No per-reviewer seats. No hidden fees. Just clear, predictable pricing for your whole team.
          </p>
          <div className="text-xl font-semibold mb-8 text-foreground">Start with a pilot project today.</div>
          <a href="#contact" className="inline-flex items-center px-8 py-3 text-base font-semibold rounded-lg shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
            Talk to sales
          </a>
        </div>
      </div>

      {/* Final CTA & Form */}
      <div id="contact" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-4xl font-bold mb-6 text-foreground">Ready to build better models?</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join the leading AI teams using HumanEval to bring rigor to their development process.
              </p>
              <div className="space-y-4">
                {[
                  "Setup in under 5 minutes",
                  "No complex integrations required",
                  "Export-ready data from day one",
                ].map((text, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <span className="text-foreground font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted/30 p-8 rounded-2xl border border-border">
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Full Name</label>
                  <input type="text" className="w-full p-3 rounded-lg border border-input bg-background text-foreground" placeholder="Jane Doe" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Work Email</label>
                  <input type="email" className="w-full p-3 rounded-lg border border-input bg-background text-foreground" placeholder="jane@company.ai" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Team Size</label>
                  <select className="w-full p-3 rounded-lg border border-input bg-background text-foreground">
                    <option>1-10 people</option>
                    <option>11-50 people</option>
                    <option>51-200 people</option>
                    <option>201+ people</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">How can we help?</label>
                  <textarea className="w-full p-3 rounded-lg border border-input bg-background text-foreground" rows={4} placeholder="Tell us about your evaluation needs..."></textarea>
                </div>
                <button 
                  type="submit" 
                  disabled={formStatus !== "idle"}
                  className="w-full py-3 px-6 text-base font-semibold rounded-lg shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {formStatus === "idle" ? "Request a demo" : formStatus === "sending" ? "Sending..." : "Sent!"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-16 px-4 bg-muted/50 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 font-bold text-xl mb-4 text-foreground">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                HumanEval
              </div>
              <p className="text-sm text-muted-foreground">
                The standard for structured human evaluation of LLM outputs.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-primary">How it works</a></li>
                <li><a href="#" className="hover:text-primary">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">About</a></li>
                <li><a href="#" className="hover:text-primary">Contact</a></li>
                <li><a href="#" className="hover:text-primary">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Privacy</a></li>
                <li><a href="#" className="hover:text-primary">Terms</a></li>
                <li><a href="#" className="hover:text-primary">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; 2026 Human Evaluation Builder. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Data stays yours. We do not use your data to train models.</span>
            </div>
          </div>
        </div>
      </footer>
    </PageLayout>
  )
}
