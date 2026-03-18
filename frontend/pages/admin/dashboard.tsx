import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { adminService } from "@/services/adminService";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Head from "next/head";

interface DashboardStats {
  totalUsers: number;
  totalProviders: number;
  totalProperties: number;
  totalPropertyApprovals: number;
  totalPropertyRejections: number;
  totalVerifiedProviders: number;
  totalPendingProviders: number;
  totalRejectedProviders: number;
  pendingPropertiesCount: number;
}

// ─── Stat Card ────────────────────────────────────────────────
function EStatCard({
  label,
  value,
  icon,
  accent = false,
  warn = false,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent?: boolean;
  warn?: boolean;
}) {
  const bg = accent ? 'var(--e-charcoal)' : warn ? 'rgba(140,110,63,0.06)' : 'var(--e-white)';
  const border = warn ? '1px solid rgba(140,110,63,0.2)' : `1px solid ${accent ? 'transparent' : 'var(--e-beige)'}`;

  return (
    <div style={{
      background: bg, border, padding: '1.8rem',
      position: 'relative', overflow: 'hidden',
      transition: 'transform 0.3s var(--e-ease), box-shadow 0.3s var(--e-ease)',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(17,28,20,0.10)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {accent && (
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.12,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.1'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
        }} />
      )}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '1.2rem',
      }}>
        <div style={{
          fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: accent ? 'rgba(255,255,255,0.45)' : 'var(--e-light-muted)',
          fontWeight: 600,
        }}>{label}</div>
        <span style={{ fontSize: '1rem', opacity: 0.6, color: accent ? 'var(--e-gold-light)' : 'var(--e-sand)' }}>
          {icon}
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--e-serif)',
        fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)',
        fontWeight: 500,
        color: accent ? 'var(--e-white)' : 'var(--e-charcoal)',
        lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────
function SectionHeader({ label, title, action }: { label: string; title: string; action?: React.ReactNode }) {
  return (
    <div style={{
      padding: '1.4rem 1.8rem',
      borderBottom: '1px solid var(--e-beige)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <div className="e-section-label" style={{ marginBottom: '0.3rem', fontSize: '0.6rem' }}>{label}</div>
        <h2 style={{ fontFamily: 'var(--e-serif)', fontSize: '1.2rem', fontWeight: 500, color: 'var(--e-charcoal)' }}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        if (!user || user.role !== "admin") {
          router.push("/");
          return;
        }
        const response = await adminService.getDashboardStats();
        setStats(response.data);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    if (!isAuthLoading) initDashboard();
  }, [router, user, isAuthLoading]);

  if (loading) {
    return (
      <div className="estoria" style={{ minHeight: '100vh', background: 'var(--e-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '2px solid var(--e-beige)',
            borderTopColor: 'var(--e-gold)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto',
          }} />
          <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--e-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Đang tải…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard — Estoria</title>
      </Head>

      <div className="estoria" style={{ minHeight: '100vh', background: 'var(--e-cream)' }}>

        {/* ── Sidebar ── */}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 240,
          background: 'var(--e-dark)',
          borderRight: '1px solid rgba(140,110,63,0.12)',
          display: 'flex', flexDirection: 'column',
          zIndex: 50, padding: '2rem 0',
        }}>
          {/* Logo */}
          <div style={{ padding: '0 1.8rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href="/" style={{
              fontFamily: 'var(--e-serif)', fontSize: '1.4rem', fontWeight: 600,
              letterSpacing: '0.04em', color: 'var(--e-white)', textDecoration: 'none',
            }}>
              Esto<span style={{ color: 'var(--e-gold-light)' }}>ria</span>
            </Link>
            <div style={{
              fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)', marginTop: 4,
            }}>
              Admin Control
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '1.5rem 0' }}>
            {[
              { href: '/admin/dashboard', label: 'Tổng Quan', icon: '▦' },
              { href: '/admin/properties/pending', label: 'Duyệt Tin', icon: '✓', badge: stats?.pendingPropertiesCount },
              { href: '/admin/providers/pending', label: 'Xác Minh Provider', icon: '◈', badge: stats?.totalPendingProviders },
              { href: '/admin/kyc-management', label: 'Quản Lý KYC', icon: '✦' },
            ].map((item) => (
              <a key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1.8rem',
                fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.06em',
                color: 'rgba(255,255,255,0.45)',
                textDecoration: 'none',
                transition: 'color 0.2s, background 0.2s',
                borderLeft: '2px solid transparent',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--e-white)';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = 'var(--e-gold)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                  (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = 'transparent';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>{item.icon}</span>
                  {item.label}
                </span>
                {item.badge != null && item.badge > 0 && (
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700,
                    background: 'var(--e-gold)', color: 'var(--e-white)',
                    padding: '2px 7px', borderRadius: 2, minWidth: 20, textAlign: 'center',
                  }}>
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </nav>

          {/* User info */}
          <div style={{ padding: '1.5rem 1.8rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--e-gold-light)', fontWeight: 600, marginBottom: 6,
            }}>
              Administrator
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
              {user?.email}
            </div>
            <Link href="/" style={{
              display: 'inline-block', marginTop: '1rem',
              fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)', textDecoration: 'none',
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--e-gold-light)'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.25)'}
            >
              ← Về Trang Chủ
            </Link>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main style={{ marginLeft: 240, padding: '3rem 3vw', minHeight: '100vh' }}>

          {/* Header */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="e-section-label" style={{ marginBottom: '0.6rem' }}>Admin Dashboard</div>
            <h1 style={{
              fontFamily: 'var(--e-serif)',
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              fontWeight: 500, color: 'var(--e-charcoal)',
              lineHeight: 1.15,
            }}>
              Bảng <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--e-muted)' }}>Điều Khiển</em>
            </h1>
          </div>

          {/* Pending Alerts */}
          {((stats?.pendingPropertiesCount ?? 0) > 0 || (stats?.totalPendingProviders ?? 0) > 0) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: (stats?.pendingPropertiesCount ?? 0) > 0 && (stats?.totalPendingProviders ?? 0) > 0 ? '1fr 1fr' : '1fr',
              gap: 2, background: 'var(--e-beige)', marginBottom: '2rem',
            }}>
              {(stats?.pendingPropertiesCount ?? 0) > 0 && (
                <Link href="/admin/properties/pending" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.4rem',
                  background: 'rgba(140,110,63,0.08)',
                  border: '1px solid rgba(140,110,63,0.2)',
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(140,110,63,0.14)'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(140,110,63,0.08)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--e-gold)' }}>⚠</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--e-charcoal)' }}>
                      {stats?.pendingPropertiesCount} tin đang chờ duyệt
                    </span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--e-gold)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Duyệt Ngay →
                  </span>
                </Link>
              )}
              {(stats?.totalPendingProviders ?? 0) > 0 && (
                <Link href="/admin/providers/pending" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.4rem',
                  background: 'rgba(140,110,63,0.08)',
                  border: '1px solid rgba(140,110,63,0.2)',
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(140,110,63,0.14)'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(140,110,63,0.08)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--e-gold)' }}>◈</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--e-charcoal)' }}>
                      {stats?.totalPendingProviders} provider chờ xác minh
                    </span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--e-gold)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Xác Minh →
                  </span>
                </Link>
              )}
            </div>
          )}

          {/* Main Stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 2, background: 'var(--e-beige)', marginBottom: '2rem',
          }}>
            <EStatCard label="Tổng Người Dùng" value={stats?.totalUsers || 0} icon="" accent />
            <EStatCard label="Nhà Cung Cấp" value={stats?.totalProviders || 0} icon="" />
            <EStatCard label="Tổng Bất Động Sản" value={stats?.totalProperties || 0} icon="⊞" />
            <EStatCard label="Chờ Phê Duyệt" value={stats?.pendingPropertiesCount || 0} icon="◷" warn />
          </div>

          {/* Property + Provider stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

            {/* Property Stats */}
            <div style={{ background: 'var(--e-white)', border: '1px solid var(--e-beige)' }}>
              <SectionHeader label="Bất Động Sản" title="Thống Kê Tin Đăng" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, background: 'var(--e-beige)', padding: 2 }}>
                <EStatCard label="Đã Phê Duyệt" value={stats?.totalPropertyApprovals || 0} icon="✓" />
                <EStatCard label="Bị Từ Chối" value={stats?.totalPropertyRejections || 0} icon="✗" />
              </div>
              <div style={{ padding: '1.2rem 1.8rem' }}>
                <Link href="/admin/properties/pending" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '10px',
                  background: 'var(--e-charcoal)', color: 'var(--e-white)',
                  textDecoration: 'none', fontSize: '0.68rem',
                  fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                  transition: 'background 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--e-gold)'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--e-charcoal)'}
                >
                  Duyệt Tin ({stats?.pendingPropertiesCount || 0}) →
                </Link>
              </div>
            </div>

            {/* Provider Stats */}
            <div style={{ background: 'var(--e-white)', border: '1px solid var(--e-beige)' }}>
              <SectionHeader label="Provider" title="Thống Kê Xác Minh" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, background: 'var(--e-beige)', padding: 2 }}>
                <EStatCard label="Đã Xác Minh" value={stats?.totalVerifiedProviders || 0} icon="✓" />
                <EStatCard label="Chờ Xác Minh" value={stats?.totalPendingProviders || 0} icon="◷" warn />
                <EStatCard label="Từ Chối" value={stats?.totalRejectedProviders || 0} icon="✗" />
              </div>
              <div style={{ padding: '1.2rem 1.8rem' }}>
                <Link href="/admin/providers/pending" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '10px',
                  background: 'var(--e-charcoal)', color: 'var(--e-white)',
                  textDecoration: 'none', fontSize: '0.68rem',
                  fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                  transition: 'background 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--e-gold)'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--e-charcoal)'}
                >
                  Xác Minh Provider ({stats?.totalPendingProviders || 0}) →
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ background: 'var(--e-white)', border: '1px solid var(--e-beige)' }}>
            <SectionHeader label="Hành Động" title="Truy Cập Nhanh" />
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2, background: 'var(--e-beige)', padding: 2,
            }}>
              {[
                { href: '/admin/properties/pending', label: 'Duyệt Bất Động Sản', desc: `${stats?.pendingPropertiesCount || 0} đang chờ`, icon: '✓' },
                { href: '/admin/providers/pending', label: 'Xác Minh Provider', desc: `${stats?.totalPendingProviders || 0} đang chờ`, icon: '◈' },
                { href: '/admin/kyc-management', label: 'Quản Lý KYC', desc: 'Duyệt hồ sơ CCCD', icon: '✦' },
              ].map((action) => (
                <Link key={action.href} href={action.href} style={{
                  display: 'flex', flexDirection: 'column',
                  padding: '1.4rem 1.6rem',
                  background: 'var(--e-white)',
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--e-cream)'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--e-white)'}
                >
                  <span style={{ fontSize: '1.2rem', marginBottom: '0.8rem', color: 'var(--e-gold)' }}>{action.icon}</span>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--e-charcoal)', marginBottom: 4 }}>
                    {action.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--e-muted)' }}>{action.desc}</div>
                </Link>
              ))}
            </div>
          </div>

        </main>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}