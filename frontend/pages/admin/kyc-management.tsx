import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import {
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  UserRoundSearch,
  XCircle,
} from "lucide-react";
import Layout from "@/components/Layout";
import KycStatusBadge from "@/components/KycStatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/apiClient";
import { userService } from "@/services/userService";
import type { KycStatus, User } from "@/types/user";

type KycStatusFilter = KycStatus | "all";
type SortOrder = "newest" | "oldest";
type RoleFilter = "provider" | "user";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to complete this KYC action.";
}

function formatDate(date?: string) {
  if (!date) {
    return "N/A";
  }

  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function prettyJson(value: unknown) {
  if (!value) {
    return "No data available";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Unable to render JSON data";
  }
}

export default function AdminKycManagementPage() {
  const router = useRouter();
  const { user, token, isAuthLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<KycStatusFilter>("submitted");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("provider");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const selectedUser = useMemo(
    () => users.find((candidate) => candidate._id === selectedUserId) || null,
    [selectedUserId, users]
  );

  const loadUsers = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await userService.getUsersForKycReview(token, {
        role: roleFilter,
        kycStatus: statusFilter,
        sort: sortOrder,
        limit: 100,
      });
      setUsers(response.data.users);
      if (response.data.users.length === 0) {
        setSelectedUserId(null);
      } else if (!response.data.users.some((candidate) => candidate._id === selectedUserId)) {
        setSelectedUserId(response.data.users[0]._id);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, selectedUserId, sortOrder, statusFilter, token]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user || !token) {
      void router.replace("/");
      return;
    }

    if (user.role !== "admin") {
      void router.replace("/");
      return;
    }

    void loadUsers();
  }, [isAuthLoading, loadUsers, router, token, user]);

  useEffect(() => {
    setRejectionReason(selectedUser?.kycRejectionReason || "");
  }, [selectedUser]);

  const handleApprove = async () => {
    if (!token || !selectedUser) {
      return;
    }

    if (selectedUser.role !== "provider") {
      setErrorMessage("Only provider accounts can be moderated via current backend endpoint.");
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await userService.updateUserKycStatus(token, selectedUser._id, {
        isVerified: true,
        kycStatus: "verified",
      });
      setSuccessMessage("KYC approved successfully.");
      await loadUsers();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!token || !selectedUser) {
      return;
    }

    if (selectedUser.role !== "provider") {
      setErrorMessage("Only provider accounts can be moderated via current backend endpoint.");
      return;
    }

    if (!rejectionReason.trim()) {
      setErrorMessage("Please provide a rejection reason before rejecting.");
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await userService.updateUserKycStatus(token, selectedUser._id, {
        isVerified: false,
        kycStatus: "rejected",
        kycRejectionReason: rejectionReason.trim(),
      });
      setSuccessMessage("KYC rejected successfully.");
      await loadUsers();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  if (isAuthLoading || loading) {
    return (
      <Layout>
        <div className="glass-panel flex items-center justify-center gap-2 py-12 text-slate-600">
          <LoaderCircle size={18} className="animate-spin" />
          Loading admin KYC management...
        </div>
      </Layout>
    );
  }

  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="glass-panel text-center">
          <h1 className="text-xl font-semibold text-slate-900">Admin Access Required</h1>
          <p className="mt-2 text-sm text-slate-600">
            You do not have permission to access KYC moderation.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <section className="glass-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Admin Verification Workflow</p>
              <h1 className="text-3xl font-semibold text-slate-900">KYC Management</h1>
            </div>
            <button type="button" className="glass-button" onClick={() => void loadUsers()}>
              <RefreshCcw size={15} />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Filter</span>
              <span className="glass-input-wrapper">
                <select
                  className="glass-input"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as KycStatusFilter)}
                >
                  <option value="all">All</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="rejected">Rejected</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                </select>
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role Filter</span>
              <span className="glass-input-wrapper">
                <select
                  className="glass-input"
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                >
                  <option value="provider">Provider</option>
                  <option value="user">User</option>
                </select>
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort</span>
              <span className="glass-input-wrapper">
                <select
                  className="glass-input"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </span>
            </label>
          </div>
        </section>

        {errorMessage ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="glass-panel overflow-hidden">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                <UserRoundSearch size={16} />
                KYC Review Queue
              </h2>
              <span className="text-xs text-slate-500">{users.length} records</span>
            </div>

            {users.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Verified</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((candidate) => (
                      <tr
                        key={candidate._id}
                        onClick={() => setSelectedUserId(candidate._id)}
                        className={`cursor-pointer rounded-2xl border transition-colors ${candidate._id === selectedUserId
                            ? "border-slate-300 bg-slate-100/70"
                            : "border-white/70 bg-white/70 hover:bg-white"
                          }`}
                      >
                        <td className="rounded-l-2xl px-3 py-3">
                          <p className="font-semibold text-slate-900">{candidate.name}</p>
                          <p className="text-xs text-slate-500">{candidate.email}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{candidate.role}</td>
                        <td className="px-3 py-3">
                          <KycStatusBadge status={candidate.kycStatus} />
                        </td>
                        <td className="px-3 py-3">
                          {candidate.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <CheckCircle2 size={14} />
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <ShieldAlert size={14} />
                              No
                            </span>
                          )}
                        </td>
                        <td className="rounded-r-2xl px-3 py-3 text-xs text-slate-500">
                          {formatDate(candidate.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-2xl border border-white/70 bg-white/70 px-4 py-6 text-center text-sm text-slate-600">
                No users found for the selected KYC filters.
              </p>
            )}
          </div>

          <aside className="glass-panel h-fit">
            {selectedUser ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedUser.name}</h2>
                    <p className="text-sm text-slate-600">{selectedUser.email}</p>
                  </div>
                  <KycStatusBadge status={selectedUser.kycStatus} />
                </div>

                <div className="grid gap-2 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">Address:</span> {selectedUser.address}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Phone:</span>{" "}
                    {selectedUser.phone || "Unavailable"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Role:</span> {selectedUser.role}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Verified:</span>{" "}
                    {selectedUser.isVerified ? "Yes" : "No"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">CCCD Documents</h3>
                  {selectedUser.kycDocuments?.length ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {selectedUser.kycDocuments.map((documentUrl, index) => (
                        <a key={`${documentUrl}-${index}`} href={documentUrl} target="_blank" rel="noreferrer">
                          <Image
                            src={documentUrl}
                            alt={`KYC document ${index + 1}`}
                            width={420}
                            height={260}
                            unoptimized
                            className="h-28 w-full rounded-xl border border-white/70 object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">No uploaded KYC documents.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">OCR Extracted Data</h3>
                  <pre className="max-h-48 overflow-auto rounded-xl border border-white/70 bg-slate-900/95 p-3 text-xs text-slate-100">
                    {prettyJson(selectedUser.kycExtractedData)}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Comparison Result</h3>
                  <pre className="max-h-48 overflow-auto rounded-xl border border-white/70 bg-slate-900/95 p-3 text-xs text-slate-100">
                    {prettyJson(selectedUser.kycComparisonResult)}
                  </pre>
                </div>

                {selectedUser.kycRejectionReason ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    <p className="font-semibold">Current Rejection Reason</p>
                    <p className="mt-1">{selectedUser.kycRejectionReason}</p>
                  </div>
                ) : null}

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Rejection Reason
                  </span>
                  <span className="glass-input-wrapper">
                    <textarea
                      rows={3}
                      className="glass-input resize-none"
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      placeholder="Required when rejecting KYC"
                    />
                  </span>
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="glass-button-primary justify-center"
                    disabled={actionLoading}
                    onClick={() => void handleApprove()}
                  >
                    {actionLoading ? <LoaderCircle size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    Approve KYC
                  </button>
                  <button
                    type="button"
                    className="glass-button justify-center border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
                    disabled={actionLoading}
                    onClick={() => void handleReject()}
                  >
                    {actionLoading ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Reject KYC
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Select a user from the queue to review KYC details.</p>
            )}
          </aside>
        </section>
      </div>
    </Layout>
  );
}
