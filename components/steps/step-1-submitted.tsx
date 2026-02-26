"use client"

import { useState } from "react"
import { Plane, Users, Calendar, MapPin, MessageSquare, Mail, Phone, User, ArrowRight, Loader2, Clock3 } from "lucide-react"
import type { FlightRequest, User as UserType } from "@/lib/store"
import { format } from "date-fns"

interface Props {
  request: FlightRequest
  currentUser: UserType
  onUpdate: (data: Partial<FlightRequest>) => Promise<void>
}

export function Step1Submitted({ request, currentUser, onUpdate }: Props) {
  const [loading, setLoading] = useState(false)
  const isManager = currentUser.role === "manager"

  const handleStartReview = async () => {
    setLoading(true)
    try {
      await onUpdate({ status: "under_review" })
    } finally {
      setLoading(false)
    }
  }
  const depDate = request.departureDate
    ? format(new Date(request.departureDate + "T00:00:00"), "MMMM d, yyyy")
    : request.departureDate
  const retDate = request.returnDate
    ? format(new Date(request.returnDate + "T00:00:00"), "MMMM d, yyyy")
    : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Request Details</h2>
        <p className="text-sm text-gray-500 mt-0.5">Submitted by {request.isoName}</p>
      </div>

      {/* Client Info */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Client Information</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-900 font-medium">{request.clientName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700">{request.clientEmail}</span>
          </div>
          {request.clientPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">{request.clientPhone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Passengers */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200">
          <Users className="h-4 w-4 text-gray-500" />
        </div>
        <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Passengers</div>
          <div className="text-base font-semibold text-gray-900">{request.passengers}</div>
        </div>
        {request.returnDate && (
          <>
            <div className="ml-4 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200">
              <Calendar className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Trip Type</div>
              <div className="text-base font-semibold text-gray-900">Round Trip</div>
            </div>
          </>
        )}
      </div>

      {/* Departure / Arrival */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            <MapPin className="h-3.5 w-3.5" /> Departure
          </div>
          <div className="text-base font-semibold text-gray-900">{request.departure}</div>
          <div className="text-sm text-gray-500 mt-0.5">{depDate}</div>
          {request.departureTime && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
              <Clock3 className="h-3.5 w-3.5" />
              Requested Time: {request.departureTime}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            <Plane className="h-3.5 w-3.5" /> Arrival
          </div>
          <div className="text-base font-semibold text-gray-900">{request.arrival}</div>
          {retDate && (
            <div className="text-sm text-gray-500 mt-0.5">
              Return: {retDate}
              {request.returnTime ? ` at ${request.returnTime}` : ""}
            </div>
          )}
        </div>
      </div>

      {/* Special Requests */}
      {request.specialRequests && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            <MessageSquare className="h-3.5 w-3.5" /> Special Requests
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{request.specialRequests}</p>
        </div>
      )}

      {/* Manager action */}
      {isManager && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleStartReview}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Start Review
          </button>
        </div>
      )}
    </div>
  )
}
