import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import propertyService from "@/services/propertyService";
import { useAuth } from "@/contexts/AuthContext";
import type { Property } from "@/types/property";
import Link from "next/link";
import { Plus, DollarSign, Ruler, BedDouble, CheckCircle, Clock, XCircle } from "lucide-react";

export default function ProviderProperties() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    const loadProperties = async () => {
      try {
        if (!user || user.role !== "provider") {
          router.push("/");
          return;
        }

        const response = await propertyService.getAllProperties({ limit: 100 });
        setProperties(response.data.properties);
      } catch (error) {
        console.error("Error loading properties:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthLoading) {
      loadProperties();
    }
  }, [router, user, isAuthLoading]);

  const filteredProperties = properties.filter((p) => (filter === "all" ? true : p.status === filter));

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bất động sản này?")) return;

    try {
      await propertyService.deleteProperty(id);
      setProperties(properties.filter((p) => p._id !== id));
      alert("Xóa bất động sản thành công");
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Lỗi khi xóa bất động sản");
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
       <div className="container mx-auto px-4 py-8 max-w-6xl">
         <div className="flex justify-between items-center mb-8">
           <h1 className="text-3xl font-bold text-slate-900">Quản lý bất động sản</h1>
           <Link
             href="/provider/properties/create"
             className="glass-button-primary inline-flex gap-2"
           >
             <Plus size={18} />
             Tạo mới
           </Link>
         </div>

         {/* Filters */}
         <div className="flex gap-2 mb-6 flex-wrap">
           {["all", "pending", "approved", "rejected"].map((status) => (
             <button
               key={status}
               onClick={() => setFilter(status as typeof filter)}
               className={`px-4 py-2 rounded-lg font-medium transition-all ${
                 filter === status
                   ? "glass-button-primary"
                   : "glass-button text-slate-600"
               }`}
             >
               {status === "all" && "Tất cả"}
               {status === "pending" && "Đang chờ"}
               {status === "approved" && "Đã phê duyệt"}
               {status === "rejected" && "Bị từ chối"}
             </button>
           ))}
         </div>

         {/* Properties List */}
         {filteredProperties.length > 0 ? (
           <div className="space-y-3">
             {filteredProperties.map((property) => (
               <div
                 key={property._id}
                 className="glass-panel border border-slate-200 p-4 hover:shadow-lg transition-all"
               >
                 <div className="flex justify-between items-start gap-4">
                   <div className="flex-1">
                     <h3 className="font-bold text-lg text-slate-900 mb-1">{property.title}</h3>
                     <p className="text-sm text-slate-600 mb-2">{property.address}</p>
                     <div className="flex gap-4 text-sm text-slate-700 flex-wrap">
                       <span className="flex items-center gap-1"><DollarSign size={14} /> {new Intl.NumberFormat("vi-VN", {
                           style: "currency",
                           currency: "VND",
                         }).format(property.price)}</span>
                       <span className="flex items-center gap-1"><Ruler size={14} /> {property.area} m²</span>
                       <span className="flex items-center gap-1"><BedDouble size={14} /> {property.bedrooms || 0} phòng</span>
                     </div>
                   </div>

                   <div className="text-right">
                     <span
                       className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold mb-3 ${
                         property.status === "approved"
                           ? "bg-green-100 text-green-700"
                           : property.status === "pending"
                             ? "bg-yellow-100 text-yellow-700"
                             : "bg-red-100 text-red-700"
                       }`}
                     >
                       {property.status === "approved" && <><CheckCircle size={14} /> Đã phê duyệt</>}
                       {property.status === "pending" && <><Clock size={14} /> Đang chờ</>}
                       {property.status === "rejected" && <><XCircle size={14} /> Bị từ chối</>}
                     </span>

                     <div className="flex gap-2 justify-end">
                       <Link
                         href={`/properties/${property._id}`}
                         className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm interactive-link"
                       >
                         Xem
                       </Link>
                       <Link
                         href={`/provider/properties/${property._id}/edit`}
                         className="text-green-600 hover:text-green-800 font-semibold text-sm interactive-link"
                       >
                         Sửa
                       </Link>
                       <button
                         onClick={() => handleDelete(property._id)}
                         className="text-rose-600 hover:text-rose-800 font-semibold text-sm interactive-link"
                       >
                         Xóa
                       </button>
                     </div>
                   </div>
                 </div>

                 {property.rejectionReason && property.status === "rejected" && (
                   <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded">
                     <p className="text-sm text-rose-700">
                       <span className="font-semibold">Lý do từ chối:</span> {property.rejectionReason}
                     </p>
                   </div>
                 )}
               </div>
             ))}
           </div>
         ) : (
           <div className="text-center py-12">
             <p className="text-slate-600 mb-4">
               Không có bất động sản {filter !== "all" ? `ở trạng thái '${filter}'` : ""}
             </p>
             <Link
               href="/provider/properties/create"
               className="glass-button-primary inline-flex gap-2"
             >
               <Plus size={18} />
               Tạo bất động sản đầu tiên
             </Link>
           </div>
         )}
      </div>
    </Layout>
  );
}
