import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ProviderVerificationCard from "@/components/ProviderVerificationCard";
import { adminService } from "@/services/adminService";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/types/user";
import { CheckCircle } from "lucide-react";

export default function AdminProvidersVerification() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [providers, setProviders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [processedId, setProcessedId] = useState<string | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        if (!user || user.role !== "admin") {
          router.push("/");
          return;
        }

        const response = await adminService.getPendingProviders(page, 10);
        setProviders(response.data.providers);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        console.error("Error loading providers:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthLoading) {
      loadProviders();
    }
  }, [page, router, user, isAuthLoading]);

  const handleApprove = (providerId: string) => async () => {
    try {
      setProcessedId(providerId);
      await adminService.verifyProvider(providerId, { isVerified: true });
      setProviders(providers.filter((p) => p._id !== providerId));
      alert("Nhà cung cấp được xác minh thành công");
    } catch (error: any) {
      console.error("Error approving provider:", error);
      alert(error.message || "Lỗi khi xác minh nhà cung cấp");
    } finally {
      setProcessedId(null);
    }
  };

  const handleReject = (providerId: string) => async (reason: string) => {
    try {
      setProcessedId(providerId);
      await adminService.verifyProvider(providerId, {
        isVerified: false,
        kycRejectionReason: reason,
      });
      setProviders(providers.filter((p) => p._id !== providerId));
      alert("Nhà cung cấp bị từ chối");
    } catch (error: any) {
      console.error("Error rejecting provider:", error);
      alert(error.message || "Lỗi khi từ chối nhà cung cấp");
    } finally {
      setProcessedId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-700">Đang tải...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Xác minh nhà cung cấp</h1>
        <p className="text-slate-600 mb-8">Kiểm tra tài liệu KYC của nhà cung cấp và xác minh tài khoản</p>

        {providers.length > 0 ? (
          <>
            <div className="space-y-6">
              {providers.map((provider) => (
                <ProviderVerificationCard
                  key={provider._id}
                  provider={provider}
                  onApprove={handleApprove(provider._id)}
                  onReject={handleReject(provider._id)}
                  isLoading={processedId === provider._id}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-8 flex-wrap">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 glass-button text-slate-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Trước
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-xl transition-all ${
                      p === page
                        ? "glass-button-primary"
                        : "glass-button text-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 glass-button text-slate-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau →
              </button>
            </div>
          </>
        ) : (
          <div className="glass-panel text-center py-12">
            <p className="text-slate-600 flex items-center justify-center gap-2">
              <CheckCircle size={24} className="text-emerald-500" />
              Không có nhà cung cấp chờ xác minh
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
