import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { userService } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { ArrowLeft, Lightbulb } from "lucide-react";

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePassword() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [formData, setFormData] = useState<ChangePasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ChangePasswordForm, string>>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = "Mật khẩu hiện tại bắt buộc";
    }
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = "Mật khẩu mới bắt buộc";
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = "Mật khẩu phải tối thiểu 6 ký tự";
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = "Mật khẩu mới không được giống mật khẩu cũ";
    }
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Xác nhận mật khẩu không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      await userService.changePassword(token, formData);
      setMessage({ type: "success", text: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại." });
      setTimeout(() => {
        logout();
        router.push("/");
      }, 2000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Lỗi khi đổi mật khẩu" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Đổi mật khẩu</h1>
        <p className="text-slate-600 mb-8">Cập nhật mật khẩu của bạn để bảo vệ tài khoản</p>

        <div className="glass-panel">
          {message && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                message.type === "success"
                  ? "bg-emerald-100/80 text-emerald-700"
                  : "bg-rose-100/80 text-rose-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mật khẩu hiện tại</label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-xl border ${
                  errors.currentPassword ? "border-rose-500" : "border-slate-200"
                } glass-input-wrapper focus-within:border-indigo-400`}
                placeholder="Nhập mật khẩu hiện tại"
              />
              {errors.currentPassword && (
                <p className="text-rose-500 text-sm mt-1">{errors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mật khẩu mới</label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-xl border ${
                  errors.newPassword ? "border-rose-500" : "border-slate-200"
                } glass-input-wrapper focus-within:border-indigo-400`}
                placeholder="Nhập mật khẩu mới"
              />
              {errors.newPassword && <p className="text-rose-500 text-sm mt-1">{errors.newPassword}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-xl border ${
                  errors.confirmPassword ? "border-rose-500" : "border-slate-200"
                } glass-input-wrapper focus-within:border-indigo-400`}
                placeholder="Xác nhận mật khẩu mới"
              />
              {errors.confirmPassword && (
                <p className="text-rose-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="glass-button-primary w-full justify-center py-2"
            >
              {loading ? "Đang cập nhật..." : "Đổi mật khẩu"}
            </button>

            {/* Back Link */}
            <Link href="/profile/settings" className="block text-center text-indigo-600 hover:text-indigo-800 interactive-link">
              <ArrowLeft size={16} className="inline mr-1" />
              Quay lại cài đặt hồ sơ
            </Link>
          </form>

          {/* Security Tips */}
          <div className="mt-8 pt-8 border-t border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-500" />
              Mẹo bảo mật
            </h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>• Sử dụng mật khẩu mạnh với ít nhất 8 ký tự</li>
              <li>• Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt</li>
              <li>• Không sử dụng cùng một mật khẩu cho nhiều tài khoản</li>
              <li>• Thay đổi mật khẩu định kỳ</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
