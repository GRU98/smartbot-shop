"use client";

import { useMemo, useEffect, useRef } from "react";

export function GlobalLines() {
    const svgRef = useRef<SVGSVGElement>(null);

    const lines = useMemo(
        () =>
            Array.from({ length: 20 }, (_, i) => {
                const pos = i < 10 ? 1 : -1;
                const idx = i % 10;
                const spread = idx * 14;
                const d = `M${-spread * pos} ${-158}C${-spread * pos} ${-158} ${80 * pos} ${-50 + spread * 0.5} ${160 * pos} ${spread}C${240 * pos} ${50 + spread * 1.5} ${300 * pos} ${158 + spread} ${300 * pos} ${158 + spread}`;
                return {
                    id: i,
                    d,
                    width: 0.4 + idx * 0.04,
                    opacity: 0.05 + idx * 0.01,
                    dashLength: 500 + idx * 80,
                    duration: 18 + idx * 3,
                };
            }),
        []
    );

    useEffect(() => {
        const el = svgRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry) return;
                el.style.visibility = entry.isIntersecting ? "visible" : "hidden";
            },
            { threshold: 0 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0" style={{ contain: "strict" }}>
            <svg
                ref={svgRef}
                className="w-full h-full"
                viewBox="-348 -158 696 316"
                fill="none"
                preserveAspectRatio="xMidYMid slice"
                style={{ willChange: "auto" }}
            >
                <title>Background</title>
                {lines.map((line) => (
                    <path
                        key={line.id}
                        d={line.d}
                        stroke="rgb(100,100,100)"
                        strokeWidth={line.width}
                        strokeOpacity={line.opacity}
                        strokeDasharray={`${line.dashLength} ${line.dashLength}`}
                        className="animate-line-flow"
                        style={{
                            animationDuration: `${line.duration}s`,
                            animationDelay: `${line.id * -2}s`,
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

export function BackgroundPaths({
    title = "NEXUS TECH",
    subtitle = "Технології нового покоління — у твоїх руках",
}: {
    title?: string;
    subtitle?: string;
}) {
    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden pt-16">
            <div className="relative z-10 text-center animate-fade-in">
                <h1 className="text-6xl sm:text-8xl md:text-9xl font-bold mb-6 text-white uppercase leading-[0.85] tracking-tighter">
                    {title}
                </h1>
                <p className="text-base sm:text-lg text-neutral-400 max-w-lg mx-auto font-light mb-10">
                    {subtitle}
                </p>
                <a
                    href="/catalog"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
                >
                    Перейти до каталогу
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                    </svg>
                </a>
            </div>
        </div>
    );
}
