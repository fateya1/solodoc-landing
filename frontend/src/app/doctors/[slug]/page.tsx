"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stethoscope, Calendar, Clock, Star, ArrowLeft, Loader2, User } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";

export default function DoctorPublicProfilePage() {
  const { slug } = useParams();
  const router = useRouter();
  const { token, user, _hasHydrated } = useAuthStore();
  const queryClient = useQueryClient();
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [booked, setBooked] = useState(false);

  const { data: doctor, isLoading } = useQuery({
    queryKey: ["public-doctor", slug],
    queryFn: () => apiClient.get(`/doctor/${slug}/public`).then((r) => r.data),
    enabled: !!slug,
  });

  const bookMutation = useMutation({
    mutationFn: (slotId: string) =>
      apiClient.post("/appointments/book", { slotId, reason: reason || undefined }),
    onSuccess: () => {
      setBooked(true);
      setBookingSlot(null);
      queryClient.invalidateQueries({ queryKey: ["public-doctor", slug] });
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Booking failed. Please try again."),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Doctor not found</h1>
          <p className="text-slate-500 mb-6">This profile does not exist or is no longer available.</p>
          <button onClick={() => router.push("/")} className="btn-primary">Go home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-bold">SoloDoc</span>
            </div>
          </div>
          {!token && (
            <div className="flex gap-2">
              <button onClick={() => router.push("/auth/login")} className="btn-secondary text-sm">Sign in</button>
              <button onClick={() => router.push("/auth/register")} className="btn-primary text-sm">Get started</button>
            </div>
          )}
          {token && user?.role === "PATIENT" && (
            <button onClick={() => router.push("/dashboard/patient")} className="btn-secondary text-sm">
              My dashboard
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Profile hero */}
        <div className="card mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-brand-100 rounded-2xl flex items-center justify-center text-4xl shrink-0">
              👨‍⚕️
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{doctor.user?.fullName}</h1>
                  <p className="text-brand-600 font-medium mt-0.5">{doctor.specialty ?? "General Practice"}</p>
                </div>
                <span className="bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                  ✓ Verified Doctor
                </span>
              </div>

              <p className="text-slate-600 mt-3 leading-relaxed">{doctor.bio ?? "No bio available."}</p>

              <div className="flex gap-6 mt-4">
                {doctor.yearsOfExperience && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Star className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{doctor.yearsOfExperience}</p>
                      <p className="text-xs text-slate-500">Years exp.</p>
                    </div>
                  </div>
                )}
                {doctor.consultationFee && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-bold text-xs">KES</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{Number(doctor.consultationFee).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Per session</p>
                    </div>
                  </div>
                )}
                {doctor.licenseNumber && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-xs">{doctor.licenseNumber}</p>
                      <p className="text-xs text-slate-500">License No.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Booking section */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600" /> Book an appointment
          </h2>
          <p className="text-sm text-slate-500 mb-5">Select an available time slot below.</p>

          {booked && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
              <p className="text-green-800 font-medium">✓ Appointment booked successfully!</p>
              <p className="text-green-700 text-sm mt-1">Check your dashboard for details.</p>
              <button onClick={() => router.push("/dashboard/patient")}
                className="mt-3 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                View my appointments
              </button>
            </div>
          )}

          {!token ? (
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 text-center">
              <p className="text-slate-700 mb-4">Sign in to book an appointment with Dr. {doctor.user?.fullName}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => router.push("/auth/login")} className="btn-secondary">Sign in</button>
                <button onClick={() => router.push("/auth/register?role=PATIENT")} className="btn-primary">
                  Create account
                </button>
              </div>
            </div>
          ) : user?.role !== "PATIENT" ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-slate-500 text-sm">Only patients can book appointments.</p>
            </div>
          ) : !doctor.availabilitySlots?.length ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No available slots at the moment.</p>
              <p className="text-slate-400 text-sm mt-1">Check back later or contact the doctor directly.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {doctor.availabilitySlots.map((slot: any) => (
                <div key={slot.id}>
                  {bookingSlot === slot.id ? (
                    <div className="bg-brand-50 border-2 border-brand-300 rounded-xl p-4">
                      <p className="text-sm font-semibold text-brand-800 mb-3">
                        📅 {format(new Date(slot.startTime), "EEEE, MMM d · h:mm a")}
                      </p>
                      <input value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for visit (optional)"
                        className="input text-sm mb-3" />
                      <div className="flex gap-2">
                        <button onClick={() => bookMutation.mutate(slot.id)}
                          disabled={bookMutation.isPending}
                          className="btn-primary flex-1 text-sm flex items-center justify-center gap-1">
                          {bookMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                          Confirm
                        </button>
                        <button onClick={() => { setBookingSlot(null); setReason(""); }}
                          className="btn-secondary text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setBookingSlot(slot.id)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-brand-50 border border-transparent hover:border-brand-200 rounded-xl transition-all group">
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-800 group-hover:text-brand-800">
                          {format(new Date(slot.startTime), "EEEE, MMM d")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(slot.startTime), "h:mm a")} – {format(new Date(slot.endTime), "h:mm a")}
                        </p>
                      </div>
                      <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                        Available
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


