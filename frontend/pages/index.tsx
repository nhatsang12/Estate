import type { GetServerSideProps } from 'next';
import { useEffect, useMemo, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';

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
import LuxuryFooter from '@/components/LuxuryFooter';

const PropertyListingsMap = dynamic(
  () => import('@/components/PropertyListingsMap'),
  { ssr: false }
);

/* ─────────────────────────────────────────────
   PRICE HELPERS
───────────────────────────────────────────── */
function priceToVND(val: number): number {
  return val * 1_000_000_000;
}

function formatCountByLanguage(value: number, language: string) {
  const normalized = Number.isFinite(value) ? Math.round(value) : 0;
  const separator = language === "en" ? "," : ".";
  return normalized.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
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
  const { t, i18n } = useTranslation();
  const [isHydrated, setIsHydrated] = useState(false);

  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [searchError, setSearchError] = useState<string | null>(initialError);
  const [searchLoading, setSearchLoading] = useState(false);
  const [listingKey, setListingKey] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<PropertyFilters>({});

  // FIX: sort state now accepts price-asc / price-desc from SearchSection
  const [sortOrder, setSortOrder] = useState<'newest' | 'price-asc' | 'price-desc' | 'area'>('newest');

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [mapNearbyMode, setMapNearbyMode] = useState(false);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);

  // FIX: initialTotalPages guaranteed ≥ 1 so pagination always renders
  const [totalPages, setTotalPages] = useState(Math.max(initialTotalPages, 1));

  // Infinite scroll states
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const endOfListRef = useRef<HTMLDivElement>(null);

  const searchSentinelRef = useRef<HTMLDivElement>(null);
  const stickyWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const tr = (
    key: string,
    fallback: string,
    options?: Record<string, unknown>
  ) =>
    isHydrated
      ? t(key, { defaultValue: fallback, ...(options || {}) })
      : fallback;

  useEffect(() => {
    if (!searchSentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
          if (!stickyWrapRef.current) return;
          if (!entries[0].isIntersecting) {
              stickyWrapRef.current.classList.add('is-stuck');
          } else {
              stickyWrapRef.current.classList.remove('is-stuck');
          }
      },
      { rootMargin: '-61px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(searchSentinelRef.current);
    return () => observer.disconnect();
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (!endOfListRef.current || mapNearbyMode) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && currentPage < totalPages) {
          setIsLoadingMore(true);
          fetchProperties(appliedFilters, sortOrder, currentPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );
    
    observerRef.current.observe(endOfListRef.current);
    return () => observerRef.current?.disconnect();
  }, [currentPage, totalPages, isLoadingMore, mapNearbyMode, appliedFilters, sortOrder]);

  useEffect(() => {
    if (!activePropertyId) return;
    const stillVisible = properties.some((property) => property._id === activePropertyId);
    if (!stillVisible) {
      setActivePropertyId(null);
    }
  }, [activePropertyId, properties]);

  const PER_PAGE = 6;

  useScrollReveal();
  useScrollReveal([listingKey]);

  const featuredProperties = useMemo(() => properties.slice(0, 3), [properties]);
  const mapPanelHeight = useMemo(() => {
    if (viewMode !== 'list') return 620;
    const count = properties.length;
    if (count <= 0) return 360;
    const estimated = count * 165 + Math.max(0, count - 1) * 10;
    return Math.max(340, Math.min(620, estimated));
  }, [properties.length, viewMode]);

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

  const handlePropertyHover = (propertyId: string) => {
    setActivePropertyId((prev) => (prev === propertyId ? prev : propertyId));
  };

  const fetchProperties = async (
    filters: PropertyFilters = {},
    sort: typeof sortOrder = sortOrder,
    page = 1,
    isLoadMore = false,
  ) => {
    if (!isLoadMore) {
      setSearchLoading(true);
      setSearchError(null);
    }
    try {
      const res = await propertyService.getAllProperties({
        ...filters,
        sort: getSortParam(sort),
        limit: PER_PAGE,
        page,
      });
      const newProperties = res.data.properties;
      // If loading more, append to existing. Otherwise replace.
      setProperties(isLoadMore ? prev => [...prev, ...newProperties] : newProperties);
      const total = res.total ?? res.results ?? res.data.properties.length;
      const pages = Math.max(res.totalPages ?? Math.ceil(total / PER_PAGE), 1);
      setTotalCount(total);
      setTotalPages(pages);
      setCurrentPage(page);
      setMapNearbyMode(false);
    } catch (err) {
      if (!isLoadMore) {
        setSearchError(getErrorMessage(err));
        setProperties([]);
      }
    } finally {
      if (!isLoadMore) {
        setSearchLoading(false);
        setListingKey(k => k + 1);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  const handlePageChange = (page: number) => {
    setIsLoadingMore(true);
    fetchProperties(appliedFilters, sortOrder, page, false);
    document.getElementById('listings')?.scrollIntoView({ behavior: 'auto', block: 'start' });
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
    setIsLoadingMore(false);

    await fetchProperties(filters, newSort, 1, false);

    setTimeout(() => {
      document.getElementById('listings')?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 100);
  }

  const handleLocateNearby = async (lat: number, lng: number) => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const nearby = await propertyService.getPropertiesWithin(15, lat, lng, 'km');
      setProperties(nearby);
      setTotalCount(nearby.length);
      setTotalPages(1);
      setCurrentPage(1);
      setMapNearbyMode(true);
      setAppliedFilters({ status: 'approved', locationText: 'nearby' });
    } catch (error) {
      setSearchError(getErrorMessage(error));
      setProperties([]);
      setTotalCount(0);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setSearchLoading(false);
      setListingKey((k) => k + 1);
    }
  };

  return (
    <>
      <Head>
        <title>{tr('home.metaTitle', 'EstateManager | Nền Tảng Bất Động Sản')}</title>
        <meta name="description" content={tr('home.metaDescription', 'Nền tảng bất động sản hiện đại dành cho người mua, người thuê và nhà cung cấp.')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        /* ═══════════════════════════════════════
           LISTINGS SECTION
        ═══════════════════════════════════════ */
        .ls-root {
            background: #F2F5F8;
            padding: clamp(4rem, 7vw, 8rem) clamp(1.5rem, 6vw, 6rem) clamp(1.1rem, 2.4vw, 1.8rem);
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
            opacity: 1;
            animation: none;
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
            gap: 0.65rem;
        }

        .ls-split {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
            gap: 1rem;
            align-items: stretch;
        }
        .ls-split-list {
            max-height: 620px;
            overflow-y: auto;
            padding-right: 0.4rem;
            scrollbar-gutter: stable;
            overscroll-behavior: contain;
        }
        .ls-split-list::-webkit-scrollbar {
            width: 8px;
        }
        .ls-split-list::-webkit-scrollbar-track {
            background: rgba(214, 219, 227, 0.35);
            border-radius: 999px;
        }
        .ls-split-list::-webkit-scrollbar-thumb {
            background: rgba(15, 23, 42, 0.25);
            border-radius: 999px;
        }
        .ls-split-list::-webkit-scrollbar-thumb:hover {
            background: rgba(15, 23, 42, 0.38);
        }
        .ls-split-map {
            position: sticky;
            top: 96px;
            height: 620px;
        }
        .ls-split-map > * {
            height: 100%;
        }
        .ls-split-list .ls-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.75rem;
        }

        /* FIX: card equal height — remove align-items:start */
        .ls-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: clamp(0.85rem, 1vw, 1.1rem);
            align-items: stretch;  /* ← was "start", caused unequal heights */
        }

        /* Skeleton */
        .ls-skeleton {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: clamp(0.85rem, 1vw, 1.1rem);
        }
        .ls-skeleton-card {
            height: 400px;
            background: var(--e-beige);
            opacity: 0.45;
            animation: none;
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
        @media (max-width: 1080px) {
            .ls-split {
                grid-template-columns: 1fr;
            }
            .ls-split-list {
                max-height: none;
                overflow-y: visible;
                padding-right: 0;
            }
            .ls-split-map {
                position: relative;
                top: 0;
                height: auto;
            }
            .ls-split-map > * {
                height: auto;
            }
        }
        @media (max-width: 960px) {
            .ls-grid, .ls-skeleton { grid-template-columns: repeat(2, 1fr); }
            .ls-split-list .ls-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 560px) {
            .ls-grid, .ls-skeleton { grid-template-columns: 1fr; }
            .ls-split-list .ls-grid { grid-template-columns: 1fr; }
            .ls-header { flex-direction: column; align-items: flex-start; }
        }

        /* Sticky search */
        .sticky-search-wrap {
            position: sticky;
            top: 60px;
            z-index: 200;
            isolation: isolate;
            background: rgba(255,255,255,0.97);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid rgba(212,175,55,0.15);
            box-shadow:
                0 1px 0 rgba(212,175,55,0.08),
                0 6px 32px -6px rgba(26,23,20,0.12);
            transition: none;
            margin-bottom: 0px;
        }
        .sticky-search-wrap.is-stuck {
            margin-bottom: 0px;
        }
        
        .sticky-search-inner {
            padding: 0.75rem clamp(1.5rem, 5vw, 5rem);
            transition: none;
        }
        .sticky-search-wrap.is-stuck .sticky-search-inner {
            padding: 0.75rem clamp(1.5rem, 5vw, 5rem);
        }

        /* Animated inner elements */
        .ss-item { padding: 0.85rem 1.4rem; transition: none; }
        .sticky-search-wrap.is-stuck .ss-item { padding: 0.85rem 1.4rem; }

        .ss-label { height: 14px; margin-bottom: 2px; opacity: 1; transition: none; }
        .sticky-search-wrap.is-stuck .ss-label { height: 14px; margin-bottom: 2px; opacity: 1; }

        .ss-btn-search { padding: 0 2rem; transition: none; }
        .sticky-search-wrap.is-stuck .ss-btn-search { padding: 0 2rem; }

        .ss-btn-filter { padding: 0 1.6rem; transition: none; }
        .sticky-search-wrap.is-stuck .ss-btn-filter { padding: 0 1.6rem; }

        .ss-price-btn { padding: 0 1rem; transition: none; }
        .sticky-search-wrap.is-stuck .ss-price-btn { padding: 0 1rem; }
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

        {/* Sticky Search Sentinel */}
        <div ref={searchSentinelRef} style={{ height: 1, pointerEvents: 'none', marginBottom: -1 }} />

        {/* Sticky Search */}
        <div ref={stickyWrapRef} className="sticky-search-wrap">
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
                {tr('home.listings.eyebrow', 'Danh Sách')}
              </span>
              <h2 className="ls-title">
                {hasActiveFilters
                  ? tr('home.listings.searchResultTitle', 'Kết Quả Tìm Kiếm')
                  : <><em>{tr('home.listings.newHighlight', 'Mới')}</em> {tr('home.listings.recentTitleSuffix', 'Nhất')}</>
                }
              </h2>
              <p className="ls-count">
                {formatCountByLanguage(totalCount, isHydrated ? (i18n.resolvedLanguage || 'vi') : 'vi')} {tr('home.listings.countSuffix', 'bất động sản')}
                {mapNearbyMode ? ` ${tr('home.listings.nearbySuffix', 'gần bạn')}` : ''}
                {searchLoading ? ` ${tr('home.listings.loadingSuffix', 'đang tải...')}` : ''}
              </p>
            </div>

            {/* View mode toggle */}
            <div className="ls-view-toggle">
              <button
                className={`ls-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                onClick={() => setViewMode('grid')}
                title={tr('home.listings.gridView', 'Dạng lưới')}
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
                title={tr('home.listings.listView', 'Dạng danh sách')}
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
            <div className="ls-split">
              <div className="ls-split-list">
                {viewMode === 'grid' ? (
                  <div key={`${listingKey}-grid`} className="ls-grid ls-cards-enter">
                    {properties.map((p, i) => (
                      <div
                        key={p._id}
                        style={{ animationDelay: `${i * 0.06}s` }}
                        className="ls-card-enter"
                        onMouseEnter={() => handlePropertyHover(p._id)}
                        onFocus={() => handlePropertyHover(p._id)}
                      >
                        <LuxuryListingCard property={p} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div key={`${listingKey}-list`} className="ls-list ls-cards-enter">
                    {properties.map((p, i) => (
                      <div
                        key={p._id}
                        style={{ animationDelay: `${i * 0.06}s` }}
                        className="ls-card-enter"
                        onMouseEnter={() => handlePropertyHover(p._id)}
                        onFocus={() => handlePropertyHover(p._id)}
                      >
                        <LuxuryListingCard property={p} horizontal />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="ls-split-map" style={{ height: mapPanelHeight }}>
                <PropertyListingsMap
                  properties={properties}
                  onLocate={handleLocateNearby}
                  activePropertyId={activePropertyId}
                  height={mapPanelHeight}
                />
              </div>
            </div>
          ) : (
            <div className="ls-empty">
              <p className="ls-empty-title">{tr('home.listings.emptyTitle', 'Không tìm thấy bất động sản phù hợp')}</p>
              <p className="ls-empty-sub">{tr('home.listings.emptySub', 'Thử thay đổi bộ lọc để mở rộng kết quả tìm kiếm.')}</p>
            </div>
          )}

          {/* FIX: show pagination whenever totalPages ≥ 1, not only after search */}
          {!searchLoading && totalPages >= 1 && !mapNearbyMode && currentPage >= totalPages && (
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

          {/* Infinite scroll sentinel */}
          <div ref={endOfListRef} style={{ height: 1, pointerEvents: 'none' }} />
        </section>

        {/* 04 Real Numbers */}
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
