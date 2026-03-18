import React, { useState } from "react";
import type { SubscriptionPlan } from "@/types/user";
import { useAuth } from "@/contexts/AuthContext";

// ── PlanCard component ────────────────────────────────────────
interface PlanCardProps {
  plan: SubscriptionPlan;
  name: string;
  price: string;
  priceUnit?: string;
  features: string[];
  onSelect: (plan: SubscriptionPlan) => void;
  isSelected?: boolean;
  isCurrentPlan?: boolean;
}

function PlanCard({
  plan, name, price, priceUnit = "/ tháng", features,
  onSelect, isSelected = false, isCurrentPlan = false,
}: PlanCardProps) {
  const cardClass = [
    'e-plan-card',
    isSelected ? 'selected' : '',
    isCurrentPlan ? 'current' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      {isCurrentPlan && (
        <div className="e-plan-current-badge">
          <span>✦</span> Gói Hiện Tại
        </div>
      )}
      <div className="e-plan-body">
        <div className="e-plan-name">{name}</div>
        <div className="e-plan-price">{price}</div>
        <div className="e-plan-price-unit">{priceUnit}</div>
        <div className="e-plan-divider" />
        <ul className="e-plan-features">
          {features.map((f, i) => (
            <li key={i} className="e-plan-feature">
              <span className="e-plan-feature-icon">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <button
          className={`e-plan-btn${isSelected || isCurrentPlan ? ' primary' : ''}`}
          onClick={() => onSelect(plan)}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? 'Gói Hiện Tại' : 'Chọn Gói Này'}
        </button>
      </div>
    </div>
  );
}

// ── Plan definitions ─────────────────────────────────────────
const PLANS = [
  {
    plan: 'Free' as SubscriptionPlan,
    name: 'Free',
    price: '0₫',
    priceUnit: 'mãi mãi',
    features: [
      'Tối đa 3 tin đăng',
      'Hình ảnh cơ bản',
      'Hiển thị trên bản đồ',
      'Hỗ trợ email',
    ],
  },
  {
    plan: 'Pro' as SubscriptionPlan,
    name: 'Pro',
    price: '299,000₫',
    priceUnit: '/ tháng',
    features: [
      'Tối đa 20 tin đăng',
      'Ưu tiên duyệt tin',
      'Thống kê lượt xem',
      'Hỗ trợ ưu tiên',
      'Badge xác minh',
    ],
  },
  {
    plan: 'ProPlus' as SubscriptionPlan,
    name: 'Pro Plus',
    price: '599,000₫',
    priceUnit: '/ tháng',
    features: [
      'Tin đăng không giới hạn',
      'Duyệt tin tức thì',
      'Hiển thị nổi bật',
      'Phân tích chi tiết',
      'Hỗ trợ 24/7',
      'API tích hợp',
    ],
  },
];

const PLAN_LIMITS: Record<string, number | string> = {
  Free: 3,
  Pro: 20,
  ProPlus: '∞',
};

// ── Main PlansPage ────────────────────────────────────────────
interface PlansPageProps {
  onCheckout?: (plan: SubscriptionPlan, method: 'VNPay' | 'PayPal') => void;
}

export default function PlansPage({ onCheckout }: PlansPageProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<SubscriptionPlan | null>(null);
  const [payMethod, setPayMethod] = useState<'VNPay' | 'PayPal'>('VNPay');

  const currentPlan: SubscriptionPlan = user?.subscription?.plan ?? 'Free';
  const listingsUsed = user?.listingsCount ?? 0;
  const listingsLimit = PLAN_LIMITS[currentPlan];

  function handleSelect(plan: SubscriptionPlan) {
    if (plan === currentPlan) return;
    setSelected(plan);
  }

  function handleCheckout() {
    if (!selected) return;
    onCheckout?.(selected, payMethod);
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '260px 1fr',
      gap: 2,
      background: 'var(--e-beige)',
      alignItems: 'stretch',  // ✅ fix: stretch thay vì start
      minHeight: '100vh',     // ✅ fix: 100vh thay vì 60vh
    }}>

      {/* ── Sidebar trái ── */}
      <aside style={{
        background: 'var(--e-charcoal)',
        padding: '2rem 1.6rem',
        // ✅ fix: bỏ position sticky/top, thêm minHeight 100%
        display: 'flex',
        flexDirection: 'column',
        gap: '1.8rem',
        minHeight: '100%',
      }}>
        {/* Header */}
        <div>
          <div style={{
            fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--e-gold-light)', fontWeight: 700, marginBottom: 8,
          }}>
            Gói Dịch Vụ
          </div>
          <div style={{
            fontFamily: 'var(--e-serif)', fontSize: '1.2rem',
            fontWeight: 500, color: 'var(--e-white)', lineHeight: 1.3,
          }}>
            Nâng cấp<br />
            <em style={{ fontStyle: 'italic', color: 'var(--e-gold-light)', fontWeight: 400 }}>tài khoản</em>
          </div>
        </div>

        {/* Current plan info */}
        <div style={{
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '1.2rem',
        }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
            Gói hiện tại
          </div>
          <div style={{
            fontFamily: 'var(--e-serif)', fontSize: '1.4rem',
            fontWeight: 500, color: 'var(--e-white)', marginBottom: 8,
          }}>
            {currentPlan}
          </div>
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>Tin đã đăng</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--e-gold-light)' }}>
                {listingsUsed} / {listingsLimit}
              </span>
            </div>
            <div style={{ height: 2, background: 'rgba(255,255,255,0.1)' }}>
              <div style={{
                height: '100%',
                background: 'var(--e-gold)',
                width: listingsLimit === '∞' ? '30%'
                  : `${Math.min(100, (listingsUsed / (listingsLimit as number)) * 100)}%`,
                transition: 'width 0.4s var(--e-ease)',
              }} />
            </div>
          </div>
        </div>

        {/* Payment method */}
        {selected && selected !== currentPlan && (
          <div>
            <div style={{
              fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)', marginBottom: 10,
            }}>
              Phương thức thanh toán
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'rgba(255,255,255,0.05)' }}>
              {(['VNPay', 'PayPal'] as const).map(m => (
                <button key={m} type="button"
                  onClick={() => setPayMethod(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.7rem',
                    padding: '10px 12px',
                    background: payMethod === m ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    borderLeft: `2px solid ${payMethod === m ? 'var(--e-gold)' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{m === 'VNPay' ? '' : ''}</span>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 500,
                    color: payMethod === m ? 'var(--e-white)' : 'rgba(255,255,255,0.4)',
                  }}>
                    {m}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected plan summary */}
        {selected && selected !== currentPlan && (
          <div style={{ marginTop: 'auto' }}>
            <div style={{
              border: '1px solid rgba(140,110,63,0.3)',
              padding: '1rem',
              background: 'rgba(140,110,63,0.08)',
              marginBottom: '1rem',
            }}>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>
                Đang chọn
              </div>
              <div style={{ fontFamily: 'var(--e-serif)', fontSize: '1rem', color: 'var(--e-white)', marginBottom: 3 }}>
                {PLANS.find(p => p.plan === selected)?.name}
              </div>
              <div style={{ fontFamily: 'var(--e-serif)', fontSize: '1.2rem', color: 'var(--e-gold-light)' }}>
                {PLANS.find(p => p.plan === selected)?.price}
              </div>
            </div>
            <button
              onClick={handleCheckout}
              style={{
                width: '100%', padding: '13px',
                background: 'var(--e-gold)', color: 'var(--e-white)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--e-sans)', fontSize: '0.72rem',
                fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                transition: 'background 0.25s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--e-gold-light)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--e-gold)')}
            >
              Thanh Toán Ngay →
            </button>
          </div>
        )}

        {/* Benefits */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '1.2rem',
          marginTop: selected && selected !== currentPlan ? 0 : 'auto',
        }}>
          {[
            'Nâng cấp / hạ cấp bất kỳ lúc nào',
            'Thanh toán an toàn qua VNPay, PayPal',
            'Hoàn tiền trong 7 ngày',
          ].map((t, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, marginBottom: 8,
              fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5,
            }}>
              <span style={{ color: 'var(--e-gold)', flexShrink: 0 }}>✓</span>
              {t}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Plan cards phải ── */}
      <div style={{ background: 'var(--e-cream)', padding: '2.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div className="e-section-label" style={{ marginBottom: '0.5rem' }}>Chọn Gói</div>
          <h2 style={{
            fontFamily: 'var(--e-serif)',
            fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
            fontWeight: 500, color: 'var(--e-charcoal)',
            lineHeight: 1.2,
          }}>
            Gói phù hợp với<br />
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--e-muted)' }}>nhu cầu của bạn</em>
          </h2>
        </div>

        <div className="e-plan-grid">
          {PLANS.map(p => (
            <PlanCard
              key={p.plan}
              {...p}
              onSelect={handleSelect}
              isSelected={selected === p.plan}
              isCurrentPlan={currentPlan === p.plan}
            />
          ))}
        </div>

        <div style={{
          marginTop: '2.5rem',
          borderTop: '1px solid var(--e-beige)',
          paddingTop: '2rem',
        }}>
          <div style={{
            fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--e-light-muted)', fontWeight: 600, marginBottom: '1.2rem',
          }}>
            Câu Hỏi Thường Gặp
          </div>
          {[
            { q: 'Tôi có thể hủy gói bất kỳ lúc nào không?', a: 'Có, bạn có thể hủy bất kỳ lúc nào. Gói sẽ còn hiệu lực đến hết chu kỳ thanh toán.' },
            { q: 'Tin đăng có bị xóa khi hạ cấp không?', a: 'Không, tin đăng hiện tại sẽ được giữ nguyên. Bạn chỉ không thể tạo thêm khi vượt giới hạn.' },
          ].map((faq, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--e-charcoal)', marginBottom: 4 }}>
                {faq.q}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--e-muted)', lineHeight: 1.7, fontWeight: 300 }}>
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
