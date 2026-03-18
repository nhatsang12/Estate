import type { GetServerSideProps } from 'next';
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ApiError } from '@/services/apiClient';
import { propertyService } from '@/services/propertyService';
import type { Property, PropertyFilters } from '@/types/property';

// ——— Components ———
import LuxuryNavbar from '@/components/LuxuryNavbar';
import HeroSection from '@/components/HeroSection';
import MarqueeStrip from '@/components/MarqueeStrip';
import StatsSection from '@/components/StatsSection';
import SearchSection from '@/components/SearchSection';
import type { SearchParams } from '@/components/SearchSection';
import FeaturedSection from '@/components/FeaturedSection';
import LuxuryListingCard from '@/components/LuxuryListingCard';
import VisionSection from '@/components/VisionSection';
import GallerySection from '@/components/GallerySection';
import LuxuryFooter from '@/components/LuxuryFooter';

/* ——————————————————————————— Maps ——————————————————————————— */
// value phải khớp CHÍNH XÁC với PROPERTY_TYPE_OPTIONS[].value trong SearchSection.tsx
const TYPE_MAP: Record<string, PropertyFilters['type']> = {
  'Apartment': 'apartment',
  'Villa': 'villa',
  'House': 'house',
  'Land': 'house',
  'Shophouse': 'office',
  'Penthouse': 'apartment',
};

// key phải khớp CHÍNH XÁC với PRICE_OPTIONS trong SearchSection.tsx
const PRICE_MAP: Record<string, { min?: number; max?: number }> = {
  'Dưới 2 tỷ': { max: 2_000_000_000 },
  '2 - 5 tỷ': { min: 2_000_000_000, max: 5_000_000_000 },
  '5 - 10 tỷ': { min: 5_000_000_000, max: 10_000_000_000 },
  '10 - 20 tỷ': { min: 10_000_000_000, max: 20_000_000_000 },
  'Trên 20 tỷ': { min: 20_000_000_000 },
};

// key phải khớp CHÍNH XÁC với AREA_OPTIONS trong SearchSection.tsx
const AREA_MAP: Record<string, { min?: number; max?: number }> = {
  'Dưới 50m²': { max: 50 },
  '50 - 100m²': { min: 50, max: 100 },
  '100 - 200m²': { min: 100, max: 200 },
  'Trên 200m²': { min: 200 },
};

/* ——————————————————————————— Types ——————————————————————————— */
interface HomePageProps {
  initialProperties: Property[];
  initialError: string | null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Không thể tải danh sách hiện tại.';
}

/* ——————————————————————————— Page ——————————————————————————— */
export default function HomePage({ initialProperties, initialError }: HomePageProps) {
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [searchError, setSearchError] = useState<string | null>(initialError);
  const [searchLoading, setSearchLoading] = useState(false);
  const [listingKey, setListingKey] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<PropertyFilters>({});
  const [sortOrder, setSortOrder] = useState<'newest' | 'price-asc' | 'price-desc' | 'area'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialProperties.length);
  const [totalPages, setTotalPages] = useState(1);

  const PER_PAGE = 6;

  // ── Scroll reveal cho toàn page ──────────────────────────────
  useScrollReveal();

  // ── Re-observe sau mỗi lần search / sort / page ──────────────
  // listingKey thay đổi → grid unmount+remount → cần observe lại
  useScrollReveal([listingKey]);

  const featuredProperties = useMemo(() => properties.slice(0, 3), [properties]);

  const hasActiveFilters = useMemo(
    () => Object.entries(appliedFilters).some(([k, v]) => k !== 'status' && v !== undefined && v !== ''),
    [appliedFilters]
  );

  // ─── Đăng bài → kiểm tra auth → redirect ─────────────────────
  function handlePostClick() {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('estate_manager_token') : null;
    if (!token) {
      router.push('/auth/login?redirect=/provider/properties/create');
    } else {
      router.push('/provider/properties/create');
    }
  }

  // ─── Map sortOrder → API sort param ──────────────────────────
  const getSortParam = (order: typeof sortOrder) => {
    if (order === 'price-asc') return 'price';
    if (order === 'price-desc') return '-price';
    if (order === 'area') return '-area';
    return '-createdAt';
  };

  // ─── Fetch listings ───────────────────────────────────────────
  const fetchProperties = async (
    filters: PropertyFilters = {},
    sort: typeof sortOrder = sortOrder,
    page: number = 1
  ) => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const response = await propertyService.getAllProperties({
        ...filters,
        sort: getSortParam(sort),
        limit: PER_PAGE,
        page,
      });

      setProperties(response.data.properties);
      setTotalCount((response as any).results ?? response.data.properties.length);
      setTotalPages(
        (response as any).totalPages ??
        Math.ceil(((response as any).results ?? response.data.properties.length) / PER_PAGE)
      );
    } catch (err) {
      setSearchError(getErrorMessage(err));
      setProperties([]);
    } finally {
      setSearchLoading(false);
      setListingKey(k => k + 1);
    }
  };

  // ─── Khi đổi sort ────────────────────────────────────────────
  const handleSortChange = (newSort: typeof sortOrder) => {
    setSortOrder(newSort);
    setCurrentPage(1);
    fetchProperties(appliedFilters, newSort, 1);
  };

  // ─── Khi đổi trang ───────────────────────────────────────────
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchProperties(appliedFilters, sortOrder, page);
    document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ─── Khi search ──────────────────────────────────────────────
  async function handleSearch(params: SearchParams) {
    const filters: PropertyFilters = { status: 'approved' };

    // Địa điểm / từ khoá
    if (params.location.trim()) {
      filters.search = params.location.trim();
      filters.locationText = params.location.trim();
    }

    // Loại hình — SearchSection truyền value tiếng Anh ('Apartment', 'Villa'...)
    if (params.type && TYPE_MAP[params.type]) {
      filters.type = TYPE_MAP[params.type];
    }

    // Khoảng giá
    if (params.price) {
      const range = PRICE_MAP[params.price];
      if (range) {
        if (range.min !== undefined) filters.priceMin = range.min;
        if (range.max !== undefined) filters.priceMax = range.max;
      }
    }

    // Diện tích
    if (params.area) {
      const range = AREA_MAP[params.area];
      if (range) {
        if (range.min !== undefined) filters.areaMin = range.min;
        if (range.max !== undefined) filters.areaMax = range.max;
      }
    }

    // Phòng ngủ — "1 Phòng ngủ" → 1, "4+ Phòng ngủ" → 4
    if (params.bedrooms) {
      const num = parseInt(params.bedrooms, 10);
      if (!isNaN(num)) filters.bedrooms = num;
    }

    // Phòng tắm
    if (params.bathrooms) {
      const num = parseInt(params.bathrooms, 10);
      if (!isNaN(num)) filters.bathrooms = num;
    }

    setAppliedFilters(filters);
    setCurrentPage(1);
    console.log('params.price:', JSON.stringify(params.price));
    console.log('params.area:', JSON.stringify(params.area));
    console.log('PRICE_MAP lookup:', PRICE_MAP[params.price]);
    console.log('AREA_MAP lookup:', AREA_MAP[params.area]);
    console.log('filters final:', JSON.stringify(filters));
    await fetchProperties(filters, sortOrder, 1);
  }

  return (
    <>
      <Head>
        <title>Estoria — Bất Động Sản Cao Cấp Việt Nam</title>
        <meta name="description" content="Khám phá hàng nghìn bất động sản cao cấp được tuyển chọn kỹ lưỡng tại Việt Nam." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="estoria relative min-h-screen">
        <LuxuryNavbar onPostClick={handlePostClick} />
        <HeroSection totalListings={totalCount} />
        <MarqueeStrip />
        <StatsSection />
        <SearchSection onSearch={handleSearch} loading={searchLoading} />
        <FeaturedSection properties={featuredProperties} />

        {/* ⑦ All Listings */}
        <section className="e-listings e-section" id="listings">
          {/* Header */}
          <div className="e-listings-header e-reveal">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2rem' }}>
              <span style={{
                fontFamily: 'var(--e-serif)',
                fontSize: 'clamp(4rem, 7vw, 7rem)',
                fontWeight: 200,
                color: 'var(--e-beige)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                userSelect: 'none',
              }}>03</span>
              <div>
                <div className="e-section-label">Danh Sách</div>
                <h2 className="e-section-title">
                  {hasActiveFilters ? 'Kết Quả Tìm Kiếm' : <><em>Mới</em> Đăng Gần Đây</>}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--e-muted)', marginTop: '0.3rem' }}>
                  {totalCount} bất động sản
                  {searchLoading ? ' (đang tải…)' : ''}
                </p>
              </div>
            </div>

            <div className="e-sort-bar">
              <span className="e-sort-label">Sắp xếp:</span>
              <select
                className="e-sort-select"
                value={sortOrder}
                onChange={(e) => handleSortChange(e.target.value as typeof sortOrder)}
              >
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="area">Diện tích</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {searchError && (
            <div style={{
              borderRadius: 2,
              border: '1px solid #f5c6c6',
              background: '#fdf2f2',
              padding: '12px 16px',
              fontSize: '0.85rem',
              color: '#c0392b',
              marginBottom: '1.5rem',
            }}>
              {searchError}
            </div>
          )}

          {/* Loading Skeleton */}
          {searchLoading ? (
            <div className="e-listings-grid">
              {Array.from({ length: PER_PAGE }).map((_, i) => (
                <div key={i} style={{
                  height: 380,
                  background: 'var(--e-beige)',
                  borderRadius: 4,
                  opacity: 0.4,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
              ))}
            </div>
          ) : properties.length > 0 ? (
            <div key={listingKey} className="e-listings-grid e-stagger">
              {properties.map((property) => (
                <LuxuryListingCard key={property._id} property={property} />
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'var(--e-white)',
              border: '1px solid var(--e-beige)',
            }}>
              <p style={{
                fontFamily: 'var(--e-serif)',
                fontSize: '1.4rem',
                fontWeight: 300,
                color: 'var(--e-charcoal)',
                marginBottom: '0.5rem',
              }}>
                Không tìm thấy bất động sản
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--e-muted)' }}>
                Hãy thử mở rộng bộ lọc hoặc tìm kiếm với từ khóa khác.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && !searchLoading && (
            <div className="e-pagination e-reveal">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`e-page-btn${page === currentPage ? ' active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  <span>{page}</span>
                </button>
              ))}
              {totalPages > 5 && (
                <>
                  <button className="e-page-btn" style={{ width: 'auto', padding: '0 8px' }}>…</button>
                  <button className="e-page-btn" onClick={() => handlePageChange(totalPages)}>
                    <span>{totalPages}</span>
                  </button>
                </>
              )}
              {currentPage < totalPages && (
                <button
                  className="e-page-btn"
                  style={{ width: 'auto', padding: '0 14px' }}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  <span>Tiếp →</span>
                </button>
              )}
            </div>
          )}
        </section>

        <VisionSection />
        <GallerySection />
        <LuxuryFooter />
      </div>
    </>
  );
}

/* ——————————————————————————— SSR ——————————————————————————— */
export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
  try {
    const response = await propertyService.getAllProperties({
      sort: '-createdAt',
      limit: 6,
      page: 1,
      status: 'approved',
    });
    return {
      props: {
        initialProperties: response.data.properties,
        initialError: null,
      },
    };
  } catch (error) {
    return {
      props: {
        initialProperties: [],
        initialError: null,
      },
    };
  }
};