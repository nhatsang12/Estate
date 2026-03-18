import { useEffect } from 'react';

/**
 * useScrollReveal
 *
 * Thêm class `e-visible` vào các element .e-reveal / .e-stagger
 * khi chúng xuất hiện trong viewport.
 *
 * Cách dùng:
 *   // 1. Page-level (hero, stats, footer) — observe 1 lần lúc mount
 *   useScrollReveal();
 *
 *   // 2. Sau mỗi lần search/sort/page — truyền listingKey để re-observe
 *   useScrollReveal([listingKey]);
 */
export function useScrollReveal(deps: unknown[] = []) {
    useEffect(() => {
        let observer: IntersectionObserver | null = null;
        let rafId: number;

        // requestAnimationFrame đảm bảo React đã commit DOM mới
        // trước khi chúng ta querySelectorAll
        rafId = requestAnimationFrame(() => {
            observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('e-visible');
                            observer?.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
            );

            document
                .querySelectorAll<Element>(
                    '.e-reveal, .e-reveal-left, .e-reveal-right, .e-stagger'
                )
                .forEach((el) => observer!.observe(el));
        });

        return () => {
            cancelAnimationFrame(rafId);
            observer?.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}