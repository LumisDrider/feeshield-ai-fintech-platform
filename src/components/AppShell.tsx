"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, BookOpen, FileSearch, GitCompareArrows, History, Menu, Settings, ShieldCheck, Upload, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeProvider";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, hint: "Overview & activity" },
  { href: "/analyze", label: "Analyse document", icon: Upload, hint: "Upload or paste" },
  { href: "/compare", label: "Compare contracts", icon: GitCompareArrows, hint: "Side by side" },
  { href: "/history", label: "Analysis history", icon: History, hint: "Saved reports" },
  { href: "/learn", label: "Financial literacy", icon: BookOpen, hint: "Guides & evaluation" },
  { href: "/settings", label: "Settings & privacy", icon: Settings, hint: "Data controls" },
];

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="FeeShield AI home">
      <span className={`grid h-9 w-9 place-items-center rounded-[11px] transition-transform duration-300 group-hover:scale-105 ${dark ? "bg-white/10 text-[#5fd8c2]" : "bg-navy text-[#5fd8c2] dark:bg-brand dark:text-[#06231f]"}`}>
        <ShieldCheck size={20} strokeWidth={2} />
      </span>
      <span className={`text-[16px] font-bold tracking-[-.025em] ${dark ? "text-white" : "text-ink"}`}>
        FeeShield <span className="font-semibold text-brand">AI</span>
      </span>
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => pathname.startsWith(href) || (href === "/history" && pathname.startsWith("/analysis/"));
  const current = nav.find((item) => isActive(item.href));
  const title = pathname.startsWith("/analysis/") ? "Analysis report" : current?.label ?? "Workspace";

  return (
    <div className="min-h-screen bg-paper">
      {open && <button aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-[#04101b]/55 backdrop-blur-[3px] lg:hidden" />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[262px] flex-col border-r border-line bg-surface px-3.5 py-5 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <Logo />
          <button className="btn-ghost !min-h-9 !p-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <div className="mt-7 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-muted">Workspace</div>
        <nav className="mt-2 space-y-0.5" aria-label="Main navigation">
          {nav.map(({ href, label, icon: Icon, hint }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-11 items-center gap-3 rounded-[11px] px-3 text-[12.5px] font-semibold transition-all duration-200 ${active ? "bg-brand-soft text-brand-ink" : "text-ink-soft hover:bg-surface-3 hover:text-ink"}`}>
                {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />}
                <Icon size={17} strokeWidth={active ? 2.3 : 1.8} className={active ? "text-brand" : "text-muted transition-colors group-hover:text-ink-soft"} />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-[14px] border border-line bg-surface-2 p-4">
            <div className="flex items-center gap-2 text-[11.5px] font-bold text-brand-ink"><FileSearch size={15} />Evidence first</div>
            <p className="mt-2 text-[10.5px] leading-[1.6] text-muted">Every extracted cost stays linked to its original clause. Missing values are never invented.</p>
          </div>
          <div className="flex items-center justify-between px-2">
            <span className="flex items-center gap-2 text-[10.5px] text-muted"><span className="h-1.5 w-1.5 rounded-full bg-brand" />Private workspace</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="lg:pl-[262px]">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/88 backdrop-blur-xl">
          <div className="flex h-[66px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button className="btn-ghost !min-h-9 !p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-bold text-ink">{title}</div>
              <div className="hidden text-[10.5px] text-muted sm:block">{current?.hint ?? "Financial document intelligence"}</div>
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <ThemeToggle className="sm:hidden" />
              <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[10.5px] font-medium text-muted xl:flex">
                PDF · DOCX · OCR · Raw text
              </span>
              <Link href="/analyze" className="btn-primary !min-h-9 !px-3.5 !text-[11.5px]"><Upload size={14} />New analysis</Link>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
