import type { GetServerSideProps } from 'next';
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ApiError } from '@/services/apiClient';
import { propertyService } from '@/services/propertyService';
import type { Property, PropertyFilters, PropertyType } from '@/types/property';

import LuxuryNavbar from '@/components/LuxuryNavbar';
import HeroSection from '@/components/HeroSection';
import MarqueeStrip from '@/components/MarqueeStrip';
import SearchSection from '@/components/SearchSection';
import type { SearchParams } from '@/components/SearchSection';
import FeaturedSection from '@/components/FeaturedSection';
import LuxuryListingCard from '@/components/LuxuryListingCard';
import VisionSection from '@/components/VisionSection';
import StatsSection from '@/components/StatsSection';
import GallerySection from '@/components/GallerySection';
import LuxuryFooter from '@/components/LuxuryFooter';

/* ─────────────────────────────────────────────
   PRICE HELPERS
───────────────────────────────────────────── */
function priceToVND(val: number): number {
  return val * 1_000_000_000;
}

interface HomePageProps {
  initialProperties: Property[];
  initialError: string | null;
  initialTotal: number;
  initialTotalPages: number;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof ApiError || e instanceof Error) return e.message;
  return 'Không thể tải danh sách hiện tại.';
}

export default function HomePage({
  initialProperties,
  initialError,
  initialTotal,
  initialTotalPages,
}: HomePageProps) {
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [searchError, setSearchError] = useState<string | null>(initialError);
  const [searchLoading, setSearchLoading] = useState(false);
  const [listingKey, setListingKey] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<PropertyFilters>({});

  // FIX: sort state now accepts price-asc / price-desc from SearchSection
  const [sortOrder, setSortOrder] = useState<'newest' | 'price-asc' | 'price-desc' | 'area'>('newest');

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialTotal);

  // FIX: initialTotalPages guaranteed ≥ 1 so pagination always renders
  const [totalPages, setTotalPages] = useState(Math.max(initialTotalPages, 1));

  const PER_PAGE = 6;

  useScrollReveal();
  useScrollReveal([listingKey]);

  const featuredProperties = useMemo(() => properties.slice(0, 3), [properties]);

  const hasActiveFilters = useMemo(
    () => Object.entries(appliedFilters).some(([k, v]) => k !== 'status' && v !== undefined && v !== ''),
    [appliedFilters]
  );

  function handlePostClick() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('estate_manager_token') : null;
    router.push(token ? '/provider/properties/create' : '/auth/login?redirect=/provider/properties/create');
  }

  const getSortParam = (o: typeof sortOrder) => ({
    'price-asc': 'price',
    'price-desc': '-price',
    'area': '-area',
    'newest': '-createdAt',
  }[o]);

  const fetchProperties = async (
    filters: PropertyFilters = {},
    sort: typeof sortOrder = sortOrder,
    page = 1,
  ) => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await propertyService.getAllProperties({
        ...filters,
        sort: getSortParam(sort),
        limit: PER_PAGE,
        page,
      });
      setProperties(res.data.properties);
      const total = res.total ?? res.results ?? res.data.properties.length;
      const pages = Math.max(res.totalPages ?? Math.ceil(total / PER_PAGE), 1);
      setTotalCount(total);
      setTotalPages(pages);
    } catch (err) {
      setSearchError(getErrorMessage(err));
      setProperties([]);
    } finally {
      setSearchLoading(false);
      setListingKey(k => k + 1);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchProperties(appliedFilters, sortOrder, page);
    document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  async function handleSearch(params: SearchParams) {
    const filters: PropertyFilters = { status: 'approved' };

    const loc = params.location?.trim() || '';
    if (loc) { filters.search = loc; filters.locationText = loc; }
    if (params.types?.length > 0) filters.types = params.types as PropertyType[];

    const PRICE_MAX_RAW = 50;
    if (params.priceMin > 0) filters.priceMin = priceToVND(params.priceMin);
    if (params.priceMax < PRICE_MAX_RAW) filters.priceMax = priceToVND(params.priceMax);

    if (params.areaMin > 0) filters.areaMin = params.areaMin;
    if (params.areaMax < 500) filters.areaMax = params.areaMax;

    if (params.bedrooms?.length > 0) {
      const nums = params.bedrooms.map(b => parseInt(b, 10)).filter(n => !isNaN(n));
      if (nums.length > 0) filters.bedroomsGte = Math.min(...nums);
    }
    if (params.bathrooms?.length > 0) {
      const nums = params.bathrooms.map(b => parseInt(b, 10)).filter(n => !isNaN(n));
      if (nums.length > 0) filters.bathroomsGte = Math.min(...nums);
    }

    // FIX: map priceSortOrder from SearchSection → internal sortOrder
    let newSort: typeof sortOrder = 'newest';
    if (params.priceSortOrder === 'desc') newSort = 'price-desc';
    else if (params.priceSortOrder === 'asc') newSort = 'price-asc';

    setAppliedFilters(filters);
    setSortOrder(newSort);
    setCurrentPage(1);

    await fetchProperties(filters, newSort, 1);

    setTimeout(() => {
      document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  return (
    <>
      <Head>
        <title>Estoria — Bất Động Sản Cao Cấp Việt Nam</title>
        <meta name="description" content="Khám phá hàng nghìn bất động sản cao cấp được tuyển chọn kỹ lưỡng tại Việt Nam." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        /* ═══════════════════════════════════════
           LISTINGS SECTION
        ═══════════════════════════════════════ */
        .ls-root {
            background: #F2F5F8;
            padding: clamp(4rem, 7vw, 8rem) clamp(1.5rem, 6vw, 6rem);
            font-family: var(--e-sans);
        }
        .ls-header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            margin-bottom: clamp(2.5rem, 4vw, 4rem);
            flex-wrap: wrap;
            gap: 1.5rem;
        }
        .ls-header-left { display: flex; flex-direction: column; gap: 0.55rem; }
        .ls-eyebrow {
            display: flex;
            align-items: center;
            gap: 0.7rem;
            font-size: 0.68rem;
            font-weight: 600;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--e-gold);
        }
        .ls-eyebrow-line { width: 32px; height: 1px; background: var(--e-gold); flex-shrink: 0; }
        .ls-title {
            font-family: var(--e-serif);
            font-size: clamp(2rem, 4vw, 3.2rem);
            font-weight: 400;
            color: var(--e-charcoal);
            letter-spacing: -0.025em;
            line-height: 1.08;
            margin: 0;
        }
        .ls-title em { font-style: italic; color: var(--e-gold-lt, #c8a96e); }
        .ls-count {
            font-size: 0.76rem;
            color: var(--e-muted);
            margin-top: 0.3rem;
            font-family: var(--e-sans);
        }

        /* Card enter animation — CSS only, no IntersectionObserver dependency */
        @keyframes lsCardIn {
            from { opacity: 0; transform: translateY(18px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .ls-card-enter {
            opacity: 0;
            animation: lsCardIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            /* height:100% so grid card stretches full cell */
            height: 100%;
        }
        /* list mode: wrapper doesn't need height:100% */
        .ls-list .ls-card-enter { height: auto; }

        /* View toggle */
        .ls-view-toggle {
            display: flex;
            align-items: center;
            border: 1px solid var(--e-beige);
            overflow: hidden;
        }
        .ls-view-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px; height: 38px;
            background: transparent;
            border: none;
            cursor: pointer;
            color: var(--e-muted);
            transition: background 0.2s, color 0.2s;
        }
        .ls-view-btn:first-child { border-right: 1px solid var(--e-beige); }
        .ls-view-btn.active {
            background: var(--e-charcoal);
            color: var(--e-white);
        }
        .ls-view-btn:not(.active):hover { background: var(--e-cream); color: var(--e-charcoal); }

        /* List layout */
        .ls-list {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        /* FIX: card equal height — remove align-items:start */
        .ls-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2rem;
            align-items: stretch;  /* ← was "start", caused unequal heights */
        }

        /* Skeleton */
        .ls-skeleton {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2rem;
        }
        .ls-skeleton-card {
            height: 400px;
            background: var(--e-beige);
            opacity: 0.45;
            animation: lsSkeleton 1.5s ease-in-out infinite alternate;
        }
        @keyframes lsSkeleton {
            from { opacity: 0.3; }
            to   { opacity: 0.55; }
        }

        /* Empty */
        .ls-empty {
            text-align: center;
            padding: 5rem 2rem;
            background: var(--e-white);
            border: 1px solid var(--e-beige);
            grid-column: 1 / -1;
        }
        .ls-empty-title {
            font-family: var(--e-serif);
            font-size: 1.5rem;
            font-weight: 400;
            color: var(--e-charcoal);
            margin-bottom: 0.6rem;
        }
        .ls-empty-sub { font-size: 0.85rem; color: var(--e-muted); }

        /* Error */
        .ls-error {
            border: 1px solid #f5c6c6;
            background: #fdf2f2;
            padding: 12px 16px;
            font-size: 0.85rem;
            color: #c0392b;
            margin-bottom: 1.5rem;
        }

        /* FIX: pagination always visible when totalPages ≥ 1 */
        .ls-pagination {
            margin-top: 4rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        /* Responsive */
        @media (max-width: 960px) {
            .ls-grid, .ls-skeleton { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
            .ls-grid, .ls-skeleton { grid-template-columns: 1fr; }
            .ls-header { flex-direction: column; align-items: flex-start; }
        }

        /* Sticky search */
        .sticky-search-wrap {
            position: sticky;
            top: 60px;
            z-index: 200;          /* ↑ raised from 80 — above GallerySection stacking context */
            isolation: isolate;    /* own stacking context so children don't leak */
            background: rgba(255,255,255,0.97);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid rgba(212,175,55,0.15);
            box-shadow:
                0 1px 0 rgba(212,175,55,0.08),
                0 6px 32px -6px rgba(26,23,20,0.12);
        }
        .sticky-search-inner {
            padding: 0.75rem clamp(1.5rem, 5vw, 5rem);
        }
        @media (max-width: 768px) {
            .sticky-search-wrap { top: 60px; }
            .sticky-search-inner { padding: 0.65rem 1rem; }
        }
      `}</style>

      <div className="estoria relative min-h-screen">
        <LuxuryNavbar onPostClick={handlePostClick} />

        {/* 01 Hero */}
        <HeroSection totalListings={totalCount} />

        {/* Marquee */}
        <MarqueeStrip />

        {/* Sticky Search */}
        <div className="sticky-search-wrap">
          <div className="sticky-search-inner">
            <SearchSection onSearch={handleSearch} loading={searchLoading} compact />
          </div>
        </div>

        {/* 02 Featured */}
        <FeaturedSection properties={featuredProperties} />

        {/* 03 Listings */}
        <section className="ls-root" id="listings">

          <div className="ls-header e-reveal">
            <div className="ls-header-left">
              <span className="ls-eyebrow">
                <span className="ls-eyebrow-line" />
                Danh Sách
              </span>
              <h2 className="ls-title">
                {hasActiveFilters
                  ? 'Kết Quả Tìm Kiếm'
                  : <><em>Mới</em> Đăng Gần Đây</>
                }
              </h2>
              <p className="ls-count">
                {totalCount.toLocaleString('vi-VN')} bất động sản
                {searchLoading ? ' · Đang tải…' : ''}
              </p>
            </div>

            {/* View mode toggle */}
            <div className="ls-view-toggle">
              <button
                className={`ls-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Dạng lưới"
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="0.5" />
                  <rect x="14" y="3" width="7" height="7" rx="0.5" />
                  <rect x="3" y="14" width="7" height="7" rx="0.5" />
                  <rect x="14" y="14" width="7" height="7" rx="0.5" />
                </svg>
              </button>
              <button
                className={`ls-view-btn${viewMode === 'list' ? ' active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Dạng danh sách"
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Error */}
          {searchError && <div className="ls-error">{searchError}</div>}

          {/* Grid */}
          {searchLoading ? (
            <div className="ls-skeleton">
              {Array.from({ length: PER_PAGE }).map((_, i) => (
                <div key={i} className="ls-skeleton-card" style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          ) : properties.length > 0 ? (
            viewMode === 'grid' ? (
              <div key={`${listingKey}-grid`} className="ls-grid ls-cards-enter">
                {properties.map((p, i) => (
                  <div key={p._id} style={{ animationDelay: `${i * 0.06}s` }} className="ls-card-enter">
                    <LuxuryListingCard property={p} />
                  </div>
                ))}
              </div>
            ) : (
              <div key={`${listingKey}-list`} className="ls-list ls-cards-enter">
                {properties.map((p, i) => (
                  <div key={p._id} style={{ animationDelay: `${i * 0.06}s` }} className="ls-card-enter">
                    <LuxuryListingCard property={p} horizontal />
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="ls-empty">
              <p className="ls-empty-title">Không tìm thấy bất động sản</p>
              <p className="ls-empty-sub">Hãy thử mở rộng bộ lọc hoặc tìm kiếm với từ khoá khác.</p>
            </div>
          )}

          {/* FIX: show pagination whenever totalPages ≥ 1, not only after search */}
          {!searchLoading && totalPages >= 1 && (
            <div className="ls-pagination e-reveal">
              <button
                className="e-page-btn e-page-arrow"
                disabled={currentPage === 1}
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                aria-label="Trang trước"
                style={{ opacity: currentPage === 1 ? 0.35 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              {(() => {
                const pages: number[] = [];
                const delta = 2;
                const left = Math.max(1, currentPage - delta);
                const right = Math.min(totalPages, currentPage + delta);
                for (let i = left; i <= right; i++) pages.push(i);
                return (
                  <>
                    {left > 1 && (
                      <>
                        <button className="e-page-btn" onClick={() => handlePageChange(1)}><span>1</span></button>
                        {left > 2 && <span style={{ padding: '0 4px', color: 'var(--e-muted)', fontSize: '0.85rem' }}>…</span>}
                      </>
                    )}
                    {pages.map(page => (
                      <button
                        key={page}
                        className={`e-page-btn${page === currentPage ? ' active' : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        <span>{page}</span>
                      </button>
                    ))}
                    {right < totalPages && (
                      <>
                        {right < totalPages - 1 && <span style={{ padding: '0 4px', color: 'var(--e-muted)', fontSize: '0.85rem' }}>…</span>}
                        <button className="e-page-btn" onClick={() => handlePageChange(totalPages)}><span>{totalPages}</span></button>
                      </>
                    )}
                  </>
                );
              })()}

              <button
                className="e-page-btn e-page-arrow"
                disabled={currentPage === totalPages}
                onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                aria-label="Trang tiếp"
                style={{ opacity: currentPage === totalPages ? 0.35 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </section>

        {/* 04 Editorial — isolation:isolate prevents internal z-index from punching through sticky search */}
        <div style={{ isolation: 'isolate' }}>
          <GallerySection />
        </div>

        {/* 05 Stats */}
        <div className="e-reveal"><StatsSection /></div>

        {/* Footer */}
        <LuxuryFooter />
      </div>
    </>
  );
}

/* ─── SSR ─── */
export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
  try {
    const res = await propertyService.getAllProperties({
      sort: '-createdAt',
      limit: 6,
      page: 1,
      status: 'approved',
    });
    // FIX: use res.total first for accuracy, fallback to results then length
    const total = (res as any).total ?? (res as any).results ?? res.data.properties.length;
    const pages = Math.max(Math.ceil(total / 6), 1);
    return {
      props: {
        initialProperties: res.data.properties,
        initialError: null,
        initialTotal: total,
        initialTotalPages: pages,
      },
    };
  } catch {
    return { props: { initialProperties: [], initialError: null, initialTotal: 0, initialTotalPages: 1 } };
  }
};