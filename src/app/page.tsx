"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Camera,
  Sparkles,
  Zap,
  Frame,
  QrCode,
  ArrowRight,
  Smartphone,
  Wand2,
} from "lucide-react";
import { AmbientBackground } from "@/components/motion/ambient";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { SamplePoster } from "@/components/landing/sample-poster";

const ease = [0.16, 1, 0.3, 1] as const;

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <AmbientBackground />

      {/* top bar */}
      <header className="relative z-30 flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo className="h-9 w-auto" />
        <div className="flex items-center gap-3">
          <Link href="/receive" className="btn-ghost hidden h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold sm:inline-flex">
            <Smartphone className="h-4 w-4" /> Receive photo
          </Link>
          <Link href="/capture" className="btn-prime hidden h-10 items-center gap-2 rounded-full px-5 text-sm font-bold sm:inline-flex">
            <Camera className="h-4 w-4" /> Start
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 px-6 pb-24 pt-10 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Sunstone Freshers · 2026
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.1, ease }}
            className="font-display text-balance text-5xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
          >
            Create your
            <br />
            <span className="gradient-text">Freshers memory</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted"
          >
            Step in front of the lens. Frame your moment in seconds. Then beam
            the finished photo straight to your phone — using only light.
            No internet. No Bluetooth. No Wi-Fi. Pure magic.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45, ease }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link href="/capture">
              <Button size="lg" className="gap-3">
                <Camera className="h-5 w-5" />
                Create Your Freshers Memory
              </Button>
            </Link>
            <Link href="/receive">
              <Button variant="ghost" size="lg" className="gap-2">
                <QrCode className="h-5 w-5" /> Scan & receive
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted"
          >
            {[
              { icon: Zap, label: "Zero internet" },
              { icon: Wand2, label: "One-tap styling" },
              { icon: Frame, label: "20+ premium frames" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4 text-accent" /> {label}
              </span>
            ))}
          </motion.div>
        </div>

        {/* floating sample poster */}
        <div className="relative mx-auto w-full max-w-[380px]">
          <motion.div
            initial={{ opacity: 0, y: 60, rotate: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.35, ease }}
            className="relative"
          >
            <div className="absolute -inset-8 rounded-[3rem] bg-accent/10 blur-3xl" />
            <Card strong className="relative overflow-hidden rounded-[2rem] p-3 shadow-brand">
              <SamplePoster className="h-auto w-full rounded-[1.4rem]" />
            </Card>
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="glass-strong absolute -right-6 top-8 hidden items-center gap-2 rounded-2xl px-4 py-3 sm:flex"
            >
              <span className="text-lg">📡</span>
              <div>
                <p className="text-xs font-bold text-foreground">Sending via light…</p>
                <p className="text-[10px] text-muted">0% internet used</p>
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
              className="glass-strong absolute -left-6 bottom-10 hidden items-center gap-2 rounded-2xl px-4 py-3 sm:flex"
            >
              <span className="text-lg">✨</span>
              <div>
                <p className="text-xs font-bold text-foreground">Frame applied</p>
                <p className="text-[10px] text-muted">Class of 2026</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* how it works */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-28 lg:px-10">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-accent">How it works</p>
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Three steps. Zero cables.
          </h2>
        </Reveal>

        <Stagger className="grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Camera,
              step: "01",
              title: "Capture",
              body: "A cinematic countdown, auto-framing guidance and smart filters make every selfie look studio-ready.",
            },
            {
              icon: Frame,
              step: "02",
              title: "Frame it",
              body: "Drag your name onto a premium Sunstone frame. Pick your course, batch and a theme that fits your vibe.",
            },
            {
              icon: QrCode,
              step: "03",
              title: "Beam to your phone",
              body: "Animated QR light streams your high-res photo to your phone. No internet, no apps — just point and watch.",
            },
          ].map(({ icon: Icon, step, title, body }) => (
            <StaggerItem key={step}>
              <Card className="glass-hover h-full rounded-3xl p-7">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-primary/60 to-primary/20">
                  <Icon className="h-5 w-5 text-accent-soft" />
                </div>
                <p className="mb-1 font-display text-xs font-bold tracking-[0.2em] text-muted">{step}</p>
                <h3 className="font-display mb-2 text-xl font-bold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted">{body}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* CTA band */}
      <section className="relative z-10 px-6 pb-28">
        <Reveal className="glass-strong mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] p-10 text-center sm:p-16">
          <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
          <h2 className="font-display text-balance text-3xl font-bold text-foreground sm:text-5xl">
            Your first memory at Sunstone
            <br />
            <span className="gradient-gold">starts right now.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Walk up, smile, and walk away with a framed keepsake living in your camera roll.
          </p>
          <Link href="/capture" className="mt-8 inline-block">
            <Button size="lg" className="gap-3">
              Begin <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-line px-6 py-8 text-center text-xs text-muted">
        <p>Sunstone Freshers Experience 2026 · crafted with zero cloud, all magic.</p>
      </footer>
    </main>
  );
}
