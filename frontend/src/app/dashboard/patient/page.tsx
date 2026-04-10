"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Clock, User, LogOut, Stethoscope, Loader2,
  Search, X, Menu, Phone, CheckCircle, Star, ClipboardList
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";
import { VideoButton } from "@/components/video-button";
import { PrescriptionDownload } from "@/components/prescription-download";
import { ReviewModal } from "@/components/review-modal";
import { MedicalHistory } from "@/components/medical-history";
import { ChatPanel, StartChatButton } from "@/components/chat";
import { IntakeFormModal } from "@/components/intake-form-modal";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/lib/i18n";
import { WaitlistButton, WaitlistPanel } from "@/components/waitlist";
import { InsurancePanel } from "@/components/insurance-panel";

type Tab = "find-doctors" | "appointments" | "history" | "insurance" | "messages";

export default function PatientDashboard() {
  const { user, token, logout, _hasHydrated } = useAuthStore();
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("find-doctors");
  const [searchName, setSearchName] = useState("");
  const [searchSpecialty, setSearchSpecialty] = useState("");
  const [searchQuery, setSearchQuery] = useState({ name: "", specialty: "" });
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [reviewingAppt, setReviewingAppt] = useState<{ id: string; doctorName: string } | null>(null);
  const [intakeFormAppt, setIntakeFormAppt] = useState<{
    id: string; doctorName: string; date: string; existingForm?: any;
  } | null>(null);

  useEffect(() => {
    if (_hasHydrated && !token) router.push("/auth/login");
  }, [token, _hasHydrated, router]);

  const { data: profile } = useQuery({
    queryKey: ["patient-profile"],
    queryFn: () => apiClient.get("/patient/profile").then((r) => r.data),
    enabled: !!token && _hasHydrated,
  });

  const { data: appointments, refetch: refetchAppointments } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: () => apiClient.get("/appointments/my").then((r) => r.data),
    enabled: !!token && _hasHydrated,
  });

  const { data: doctors, isLoading: searchingDoctors } = useQuery({
    queryKey: ["doctor-search", searchQuery],
    queryFn: () =>
      apiClient.get(`/doctor/search?name=${searchQuery.name}&specialty=${searchQuery.specialty}`).then((r) => r.data),
    enabled: !!token && _hasHydrated,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/appointments/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-search"] });
      setCancellingId(null);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to cancel appointment."),
  });

  const updatePhoneMutation = useMutation({
    mutationFn: (phone: string) => apiClient.patch("/patient/profile", { phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      setPhoneSaved(true);
      setTimeout(() => { setShowPhoneModal(false); setPhoneSaved(false); }, 1500);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to update phone."),
  });

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) return null;

  const confirmedAppts = appointments?.filter((a: any) => a.status === "CONFIRMED").length ?? 0;

  function openIntakeForm(appt: any) {
    setIntakeFormAppt({
      id: appt.id,
      doctorName: appt.availabilitySlot?.doctor?.user?.fullName ?? "Doctor",
      date: appt.availabilitySlot?.startTime
        ? format(new Date(appt.availabilitySlot.startTime), "MMM d, yyyy · h:mm a")
        : "",
      existingForm: appt.intakeForm ?? undefined,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg">SoloDoc</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <LanguageSwitcher />
            <span className="text-sm text-slate-600">{t("patient", "hi")}, {user?.fullName?.split(" ")[0]}</span>
            <button onClick={() => { logout(); router.push("/auth/login"); }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" /> {t("common", "signOut")}
            </button>
          </div>
          <button className="sm:hidden p-2 rounded-lg hover:bg-slate-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden mt-3 pt-3 border-t border-slate-100 flex flex-col gap-3 pb-2">
            <LanguageSwitcher variant="full" className="px-1" />
            <p className="text-sm text-slate-600 px-1">{t("patient", "hi")}, {user?.fullName?.split(" ")[0]}</p>
            <button onClick={() => { logout(); router.push("/auth/login"); }}
              className="flex items-center gap-1.5 text-sm text-red-500 px-1">
              <LogOut className="w-4 h-4" /> {t("common", "signOut")}
            </button>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8">
          {[
            { icon: Calendar, label: t("patient", "totalAppointments"), value: appointments?.length ?? 0 },
            { icon: Clock, label: t("patient", "confirmed"), value: confirmedAppts },
            { icon: User, label: t("patient", "profile"), value: profile ? t("patient", "profileComplete") : t("patient", "profileLoading") },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="card flex sm:flex-col items-center sm:items-start gap-4 sm:gap-0 p-4 sm:p-5">
              <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center sm:mb-3 shrink-0">
                <Icon className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {!profile?.phone && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">Add your phone number to receive SMS appointment reminders</p>
            </div>
            <button onClick={() => { setPhoneInput(""); setShowPhoneModal(true); }}
              className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 shrink-0 touch-manipulation">
              Add Phone
            </button>
          </div>
        )}
        {profile?.phone && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-800">SMS reminders active: <strong>{profile.phone}</strong></p>
            </div>
            <button onClick={() => { setPhoneInput(profile.phone ?? ""); setShowPhoneModal(true); }}
              className="text-xs text-green-700 underline shrink-0 touch-manipulation">
              Change
            </button>
          </div>
        )}

        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 mb-6 w-full sm:w-fit">
          {([
            { key: "find-doctors" as Tab, label: t("nav", "findDoctors") },
            { key: "appointments" as Tab, label: t("nav", "myAppointments") },
            { key: "history" as Tab, label: t("nav", "medicalHistory") },
            { key: "messages" as Tab, label: t("nav", "messages") },
            { key: "insurance" as Tab, label: "Insurance" },
          ]).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-all touch-manipulation ${
                tab === key ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "find-doctors" && (
          <div>
            <div className="card mb-6">
              <h2 className="font-semibold text-slate-900 mb-4">Search for a Doctor</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={searchName} onChange={(e) => setSearchName(e.target.value)}
                    placeholder={t("patient", "doctorNamePlaceholder")} className="input pl-9 w-full" />
                </div>
                <div className="relative flex-1">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={searchSpecialty} onChange={(e) => setSearchSpecialty(e.target.value)}
                    placeholder={t("patient", "specialtyPlaceholder")} className="input pl-9 w-full" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSearchQuery({ name: searchName, specialty: searchSpecialty })}
                    className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center touch-manipulation">
                    <Search className="w-4 h-4" /> Search
                  </button>
                  {(searchQuery.name || searchQuery.specialty) && (
                    <button onClick={() => { setSearchName(""); setSearchSpecialty(""); setSearchQuery({ name: "", specialty: "" }); }}
                      className="btn-secondary flex items-center gap-1 touch-manipulation">
                      <X className="w-4 h-4" /> Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {searchingDoctors ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              </div>
            ) : !doctors?.length ? (
              <div className="card text-center py-12">
                <p className="text-slate-400">No doctors found. Try a different search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {doctors.map((doc: any) => (
                  <DoctorCard key={doc.id} doctor={doc}
                    onBooked={(apptId, doctorName, apptDate) => {
                      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
                      queryClient.invalidateQueries({ queryKey: ["doctor-search"] });
                      refetchAppointments();
                      setTab("appointments");
                      setIntakeFormAppt({ id: apptId, doctorName, date: apptDate });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "appointments" && (
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-5">My Appointments</h2>
            {!appointments?.length ? (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">No appointments yet.</p>
                <button onClick={() => setTab("find-doctors")} className="btn-primary touch-manipulation">
                  Find a doctor
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt: any) => {
                  const hasForm = !!appt.intakeForm;
                  const isConfirmed = appt.status === "CONFIRMED";
                  return (
                    <div key={appt.id} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Dr. {appt.availabilitySlot?.doctor?.user?.fullName ?? t("doctor", "unknownPatient")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {appt.availabilitySlot?.startTime
                              ? format(new Date(appt.availabilitySlot.startTime), "EEEE, MMM d yyyy · h:mm a")
                              : "N/A"}
                          </p>
                          <p className="text-xs text-slate-400">{appt.reason ?? t("doctor", "generalConsultation")}</p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full w-fit ${
                          appt.status === "CONFIRMED" ? "bg-green-50 text-green-700" :
                          appt.status === "COMPLETED" ? "bg-blue-50 text-blue-700" :
                          appt.status === "CANCELLED" ? "bg-red-50 text-red-600" :
                          appt.status === "NO_SHOW" ? "bg-slate-100 text-slate-500" :
                          "bg-amber-50 text-amber-700"
                        }`}>{t("appointment", `status${appt.status}` as any) || appt.status}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {(isConfirmed || appt.status === "COMPLETED") && (
                          <button
                            onClick={() => openIntakeForm(appt)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg touch-manipulation transition-colors ${
                              hasForm
                                ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                            }`}
                          >
                            <ClipboardList className="w-3 h-3" />
                            {hasForm ? t("patient", "editIntakeForm") : t("patient", "fillIntakeForm")}
                            {!hasForm && isConfirmed && (
                              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-0.5">New</span>
                            )}
                          </button>
                        )}

                        {appt.status === "COMPLETED" && appt.prescription && (
                          <PrescriptionDownload appointmentId={appt.id} />
                        )}
                        {appt.status === "COMPLETED" && !appt.review && (
                          <button
                            onClick={() => setReviewingAppt({
                              id: appt.id,
                              doctorName: appt.availabilitySlot?.doctor?.user?.fullName ?? "Doctor",
                            })}
                            className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-2 rounded-lg touch-manipulation">
                            <Star className="w-3 h-3" /> Rate
                          </button>
                        )}
                        {appt.status === "COMPLETED" && appt.review && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{appt.review.rating}/5</span>
                          </div>
                        )}
                        {isConfirmed && (
                          cancellingId === appt.id ? (
                            <div className="flex gap-1">
                              <VideoButton appointmentId={appt.id} role="patient" />
                              <StartChatButton
                                otherProfileId={appt.availabilitySlot?.doctor?.id}
                                role="PATIENT"
                                label="Message Doctor"
                              />
                              <button onClick={() => cancelMutation.mutate(appt.id)}
                                disabled={cancelMutation.isPending}
                                className="text-xs bg-red-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 touch-manipulation">
                                {cancelMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                Confirm cancel
                              </button>
                              <button onClick={() => setCancellingId(null)}
                                className="text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg touch-manipulation">
                                Keep
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <VideoButton appointmentId={appt.id} role="patient" />
                              <StartChatButton
                                otherProfileId={appt.availabilitySlot?.doctor?.id}
                                role="PATIENT"
                                label="Message Doctor"
                              />
                              <button onClick={() => setCancellingId(appt.id)}
                                className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors touch-manipulation">
                                Cancel
                              </button>
                            </div>
                          )
                        )}
                      </div>

                      {isConfirmed && !hasForm && (
                        <p className="text-xs text-amber-600 flex items-center gap-1.5">
                          <ClipboardList className="w-3 h-3" />
                          Help your doctor prepare — fill in your intake form before the appointment
                        </p>
                      )}
                      {isConfirmed && hasForm && (
                        <p className="text-xs text-green-600 flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3" />
                          Intake form submitted · Last updated {format(new Date(appt.intakeForm.updatedAt), "MMM d")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "history" && <MedicalHistory />}
        {tab === "messages" && <ChatPanel role={"PATIENT"} />}

        {tab === "insurance" && (
          <div className="card">
            <InsurancePanel />
          </div>
        )}
      </div>

      {intakeFormAppt && (
        <IntakeFormModal
          appointmentId={intakeFormAppt.id}
          doctorName={intakeFormAppt.doctorName}
          appointmentDate={intakeFormAppt.date}
          existingForm={intakeFormAppt.existingForm}
          profileAllergies={profile?.allergies ?? []}
          onClose={() => setIntakeFormAppt(null)}
          onSubmitted={() => {
            queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
            setIntakeFormAppt(null);
          }}
        />
      )}

      {reviewingAppt && (
        <ReviewModal
          appointmentId={reviewingAppt.id}
          doctorName={reviewingAppt.doctorName}
          onClose={() => setReviewingAppt(null)}
        />
      )}

      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand-600" /> Add Phone for SMS Reminders
              </h2>
              <button onClick={() => setShowPhoneModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Add your phone number to receive SMS reminders 24hrs and 1hr before your appointments.
            </p>
            {phoneSaved ? (
              <div className="flex items-center justify-center gap-2 text-green-600 py-4">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Phone number saved!</span>
              </div>
            ) : (
              <>
                <input type="tel" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+254712345678 or 0712345678" className="input w-full mb-4" autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => updatePhoneMutation.mutate(phoneInput)}
                    disabled={!phoneInput || updatePhoneMutation.isPending}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                    {updatePhoneMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                  <button onClick={() => setShowPhoneModal(false)} className="btn-secondary px-4">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DoctorCard({ doctor, onBooked }: {
  doctor: any;
  onBooked: (apptId: string, doctorName: string, apptDate: string) => void;
}) {
  const t = useT();
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const bookMutation = useMutation({
    mutationFn: (slotId: string) =>
      apiClient.post("/appointments/book", { slotId, reason: reason || undefined }),
    onSuccess: (res, slotId) => {
      const slot = doctor.availabilitySlots.find((s: any) => s.id === slotId);
      const apptDate = slot?.startTime
        ? format(new Date(slot.startTime), "MMM d, yyyy · h:mm a")
        : "";
      setBookingSlot(null);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["doctor-search"] });
      onBooked(res.data.id, doctor.user?.fullName ?? "Doctor", apptDate);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Booking failed."),
  });

  return (
    <div className="card">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg text-brand-600">
          {doctor.user?.fullName?.charAt(0) ?? "D"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900">{doctor.user?.fullName}</h3>
          <p className="text-sm text-brand-600">{doctor.specialty ?? "General Practice"}</p>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{doctor.bio ?? "No bio available"}</p>
          <div className="flex gap-3 mt-2 text-xs text-slate-500 flex-wrap">
            {doctor.yearsOfExperience && <span>{doctor.yearsOfExperience} yrs exp</span>}
            {doctor.consultationFee && <span>KES {Number(doctor.consultationFee).toLocaleString()}</span>}
            {doctor.averageRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {doctor.averageRating} ({doctor.totalReviews})
              </span>
            )}
          </div>
        </div>
      </div>

      {doctor.availabilitySlots?.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Available slots:</p>
          <div className="space-y-2">
            {doctor.availabilitySlots.map((slot: any) => (
              <div key={slot.id}>
                {bookingSlot === slot.id ? (
                  <div className="bg-brand-50 border border-brand-100 rounded-xl p-3">
                    <p className="text-xs font-medium text-brand-800 mb-2">
                      {format(new Date(slot.startTime), "MMM d · h:mm a")}
                    </p>
                    <input value={reason} onChange={(e) => setReason(e.target.value)}
                      placeholder={t("patient", "reasonPlaceholder")} className="input text-xs mb-2 w-full" />
                    <div className="flex gap-2">
                      <button onClick={() => bookMutation.mutate(slot.id)}
                        disabled={bookMutation.isPending}
                        className="btn-primary text-xs flex-1 flex items-center justify-center gap-1 py-2.5 touch-manipulation">
                        {bookMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Confirm booking
                      </button>
                      <button onClick={() => setBookingSlot(null)} className="btn-secondary text-xs py-2.5 touch-manipulation">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-700">
                      {format(new Date(slot.startTime), "MMM d, yyyy · h:mm a")}
                    </p>
                    <button onClick={() => setBookingSlot(slot.id)}
                      className="text-xs bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 touch-manipulation">
                      Book
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 text-center">
            No available slots at the moment
          </p>
          <WaitlistButton doctorProfileId={doctor.id} doctorName={doctor.user?.fullName ?? "Doctor"} />
        </div>
      )}
    </div>
  );
}


