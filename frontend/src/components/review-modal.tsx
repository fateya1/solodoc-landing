"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, CheckCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { StarRating } from "./star-rating";

interface ReviewModalProps {
  appointmentId: string;
  doctorName: string;
  onClose: () => void;
}

export function ReviewModal({ appointmentId, doctorName, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () => apiClient.post("/reviews", { appointmentId, rating, comment: comment || undefined }),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
      setTimeout(onClose, 1500);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to submit review."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="font-semibold text-slate-900 text-lg">Thank you for your review!</p>
            <p className="text-slate-500 text-sm">Your feedback helps other patients.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Rate your consultation</h2>
                <p className="text-sm text-slate-500">with Dr. {doctorName}</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-2 mb-6">
              <StarRating value={rating} onChange={setRating} size="lg" />
              <p className="text-sm text-slate-500">
                {rating === 0 ? "Tap a star to rate" :
                 rating === 1 ? "Poor" :
                 rating === 2 ? "Fair" :
                 rating === 3 ? "Good" :
                 rating === 4 ? "Very Good" : "Excellent!"}
              </p>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience (optional)..."
              rows={3}
              className="input w-full mb-4 resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => submitMutation.mutate()}
                disabled={rating === 0 || submitMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Review
              </button>
              <button onClick={onClose} className="btn-secondary px-4">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}