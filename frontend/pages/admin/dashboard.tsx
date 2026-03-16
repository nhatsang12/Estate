import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { adminService } from "@/services/adminService";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Users, Building2, Home, Clock, CheckCircle, XCircle, CreditCard } from "lucide-react";

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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Bảng điều khiển Admin</h1>

         {/* Key Metrics */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           <StatCard icon={<Users size={20} />} title="Tổng người dùng" value={stats?.totalUsers || 0} />
           <StatCard icon={<Building2 size={20} />} title="Nhà cung cấp" value={stats?.totalProviders || 0} />
           <StatCard icon={<Home size={20} />} title="Tổng bất động sản" value={stats?.totalProperties || 0} />
           <StatCard icon={<Clock size={20} />} title="Chờ phê duyệt" value={stats?.pendingPropertiesCount || 0} trend="up" />
         </div>

         {/* Property Stats */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
           <StatCard icon={<CheckCircle size={20} />} title="Bất động sản đã phê duyệt" value={stats?.totalPropertyApprovals || 0} trend="up" />
           <StatCard icon={<XCircle size={20} />} title="Bất động sản bị từ chối" value={stats?.totalPropertyRejections || 0} />
         </div>

         {/* Provider Verification Stats */}
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
           <StatCard icon={<CheckCircle size={20} />} title="Nhà cung cấp đã xác minh" value={stats?.totalVerifiedProviders || 0} />
           <StatCard icon={<Clock size={20} />} title="Chờ xác minh" value={stats?.totalPendingProviders || 0} trend="up" />
           <StatCard icon={<XCircle size={20} />} title="Bị từ chối" value={stats?.totalRejectedProviders || 0} />
         </div>

         {/* Action Buttons */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
           <Link
             href="/admin/properties/pending"
             className="glass-panel flex items-center gap-2 justify-center py-4 text-center font-semibold text-indigo-800 hover:bg-slate-100 transition-all"
           >
             <CheckCircle size={20} />
             Duyệt bất động sản ({stats?.pendingPropertiesCount || 0})
           </Link>
           <Link
             href="/admin/providers/pending"
             className="glass-panel flex items-center gap-2 justify-center py-4 text-center font-semibold text-indigo-800 hover:bg-slate-100 transition-all"
           >
             <Users size={20} />
             Xác minh nhà cung cấp ({stats?.totalPendingProviders || 0})
           </Link>
           <Link
             href="/admin/kyc-management"
             className="glass-panel flex items-center gap-2 justify-center py-4 text-center font-semibold text-indigo-800 hover:bg-slate-100 transition-all"
           >
             <CreditCard size={20} />
             Quản lý KYC
           </Link>
         </div>

         {/* Quick Info */}
         <div className="glass-panel">
           <h2 className="text-xl font-bold text-slate-900 mb-4">Tóm tắt hệ thống</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div>
               <h3 className="font-semibold text-slate-900 mb-2">Người dùng</h3>
               <ul className="space-y-1 text-sm text-slate-600">
                 <li>Tổng: <span className="font-semibold text-slate-900">{stats?.totalUsers || 0}</span></li>
                 <li>Nhà cung cấp: <span className="font-semibold text-slate-900">{stats?.totalProviders || 0}</span></li>
               </ul>
             </div>
             <div>
               <h3 className="font-semibold text-slate-900 mb-2">Bất động sản</h3>
               <ul className="space-y-1 text-sm text-slate-600">
                 <li>Tổng: <span className="font-semibold text-slate-900">{stats?.totalProperties || 0}</span></li>
                 <li>Chờ phê duyệt: <span className="font-semibold text-slate-900">{stats?.pendingPropertiesCount || 0}</span></li>
               </ul>
             </div>
           </div>
         </div>
      </div>
    </Layout>
  );
}
