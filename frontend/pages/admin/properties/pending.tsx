import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import PropertyModerationCard from "@/components/PropertyModerationCard";
import { adminService } from "@/services/adminService";
import { useAuth } from "@/contexts/AuthContext";
import type { Property } from "@/types/property";
import { CheckCircle } from "lucide-react";

export default function AdminPropertiesModeration() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [processedId, setProcessedId] = useState<string | null>(null);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        if (!user || user.role !== "admin") {
          router.push("/");
          return;
        }

        const response = await adminService.getPendingProperties(page, 10);
        setProperties(response.data.properties);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        console.error("Error loading properties:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthLoading) {
      loadProperties();
    }
  }, [page, router, user, isAuthLoading]);

  const handleApprove = (propertyId: string) => async () => {
    try {
      setProcessedId(propertyId);
      await adminService.moderateProperty(propertyId, {
        status: "approved",
      });
      setProperties(properties.filter((p) => p._id !== propertyId));
      alert("Bất động sản được phê duyệt thành công");
    } catch (error: any) {
      console.error("Error approving property:", error);
      alert(error.message || "Lỗi khi phê duyệt bất động sản");
    } finally {
      setProcessedId(null);
    }
  };

  const handleReject = (propertyId: string) => async (reason: string) => {
    try {
      setProcessedId(propertyId);
      await adminService.moderateProperty(propertyId, {
        status: "rejected",
        rejectionReason: reason,
      });
      setProperties(properties.filter((p) => p._id !== propertyId));
      alert("Bất động sản được từ chối thành công");
    } catch (error: any) {
      console.error("Error rejecting property:", error);
      alert(error.message || "Lỗi khi từ chối bất động sản");
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Duyệt bất động sản</h1>
        <p className="text-slate-600 mb-8">Kiểm tra và phê duyệt hoặc từ chối các bất động sản chờ duyệt</p>

        {properties.length > 0 ? (
          <>
            <div className="space-y-6">
              {properties.map((property) => (
                <PropertyModerationCard
                  key={property._id}
                  property={property}
                  onApprove={handleApprove(property._id)}
                  onReject={handleReject(property._id)}
                  isLoading={processedId === property._id}
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
              Không có bất động sản chờ duyệt
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
