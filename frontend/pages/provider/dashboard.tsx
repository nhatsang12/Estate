import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import propertyService from "@/services/propertyService";
import type { Property } from "@/types/property";
import type { User } from "@/types/user";
import Link from "next/link";
import { Home, CheckCircle, Clock, DollarSign, Plus } from "lucide-react";

interface DashboardStats {
  totalProperties: number;
  approvedProperties: number;
  pendingProperties: number;
  averagePrice: number;
}

export default function ProviderDashboard() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [provider, setProvider] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    approvedProperties: 0,
    pendingProperties: 0,
    averagePrice: 0,
  });
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        if (!user || user.role !== "provider") {
          router.push("/");
          return;
        }

        setProvider(user);

        // Fetch provider's properties
        const response = await propertyService.getAllProperties({ limit: 100 });
        const properties = response.data.properties;

        const approved = properties.filter((p) => p.status === "approved").length;
        const pending = properties.filter((p) => p.status === "pending").length;
        const avgPrice =
          properties.length > 0 ? properties.reduce((sum, p) => sum + p.price, 0) / properties.length : 0;

        setStats({
          totalProperties: properties.length,
          approvedProperties: approved,
          pendingProperties: pending,
          averagePrice: avgPrice,
        });

        setRecentProperties(properties.slice(0, 5));
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthLoading) {
      initDashboard();
    }
  }, [router, user, isAuthLoading]);

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
       <div className="container mx-auto px-4 py-8 max-w-6xl">
         <div className="mb-8">
           <h1 className="text-3xl font-bold text-slate-900 mb-2">Bảng điều khiển Nhà cung cấp</h1>
           <p className="text-slate-600">Chào mừng {provider?.name}!</p>
         </div>

         {/* Stats Grid */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           <StatCard icon={<Home size={20} />} title="Tổng bất động sản" value={stats.totalProperties} />
           <StatCard icon={<CheckCircle size={20} />} title="Đã phê duyệt" value={stats.approvedProperties} trend="up" />
           <StatCard icon={<Clock size={20} />} title="Đang chờ duyệt" value={stats.pendingProperties} />
           <StatCard
             icon={<DollarSign size={20} />}
             title="Giá trung bình"
             value={new Intl.NumberFormat("vi-VN", {
               style: "currency",
               currency: "VND",
             }).format(Math.round(stats.averagePrice))}
           />
         </div>

         {/* Actions */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
           <Link
             href="/provider/properties/create"
             className="glass-button-primary w-full justify-center gap-2 py-3"
           >
             <Plus size={20} />
             Tạo bất động sản mới
           </Link>
           <Link
             href="/provider/properties"
             className="glass-button w-full justify-center py-3 text-slate-900 font-semibold"
           >
             Quản lý bất động sản
           </Link>
           <Link
             href="/subscription/plans"
             className="glass-button-primary w-full justify-center gap-2 py-3"
           >
             <DollarSign size={20} />
             Nâng cấp gói dịch vụ
           </Link>
         </div>

         {/* Recent Properties */}
         <div className="glass-panel">
           <h2 className="text-xl font-bold text-slate-900 mb-4">Bất động sản gần đây</h2>
           {recentProperties.length > 0 ? (
             <div className="space-y-3">
               {recentProperties.map((property) => (
                 <div
                   key={property._id}
                   className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                   style={{ backgroundColor: "rgba(255, 255, 255, 0.65)" }}
                 >
                   <div className="flex justify-between items-start">
                     <div>
                       <h3 className="font-semibold text-slate-900">{property.title}</h3>
                       <p className="text-sm text-slate-600">{property.address}</p>
                     </div>
                     <div className="text-right">
                       <p className="font-semibold text-slate-900">
                         {new Intl.NumberFormat("vi-VN", {
                           style: "currency",
                           currency: "VND",
                         }).format(property.price)}
                       </p>
                       <span
                         className={`text-xs px-2 py-1 rounded inline-block mt-2 ${
                           property.status === "approved"
                             ? "bg-green-100 text-green-700"
                             : property.status === "pending"
                               ? "bg-yellow-100 text-yellow-700"
                               : "bg-red-100 text-red-700"
                         }`}
                       >
                         {property.status === "approved" && "Đã phê duyệt"}
                         {property.status === "pending" && "Đang chờ"}
                         {property.status === "rejected" && "Bị từ chối"}
                       </span>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="text-center py-8">
               <p className="text-slate-600 mb-4">Bạn chưa có bất động sản nào</p>
               <Link
                 href="/provider/properties/create"
                 className="glass-button-primary inline-flex gap-2"
               >
                 <Plus size={16} />
                 Tạo bất động sản đầu tiên
               </Link>
             </div>
           )}
         </div>

         {/* KYC Status */}
         {provider?.kycStatus && (
           <div className="mt-8 glass-panel border-indigo-200">
             <h3 className="font-semibold text-slate-900 mb-2">Trạng thái KYC</h3>
             <p className="text-slate-700">
               Trạng thái KYC hiện tại:{" "}
               <span className="font-semibold text-indigo-800">
                 {provider.kycStatus === "pending" && "Chưa gửi"}
                 {provider.kycStatus === "submitted" && "Đã gửi"}
                 {provider.kycStatus === "reviewing" && "Đang xem xét"}
                 {provider.kycStatus === "verified" && "Đã xác nhận"}
                 {provider.kycStatus === "rejected" && "Bị từ chối"}
               </span>
             </p>
             {provider.kycStatus !== "verified" && (
               <Link href="/profile/kyc" className="mt-2 inline-block text-indigo-600 hover:text-indigo-800 font-semibold interactive-link">
                 → Hoàn thành KYC
               </Link>
             )}
           </div>
         )}
      </div>
    </Layout>
  );
}
