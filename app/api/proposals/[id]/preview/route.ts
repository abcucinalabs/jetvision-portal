import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getQuoteById } from "@/lib/avinode-server"

export const dynamic = "force-dynamic"

type FlightRequestRow = {
  id: string
  client_name: string
  client_email: string
  client_phone: string
  departure: string
  arrival: string
  departure_date: string
  departure_time: string | null
  return_date: string | null
  return_time: string | null
  passengers: number
  special_requests: string | null
  selected_quote_id: string | null
  total_price: number | null
  proposal_notes: string | null
  avinode_best_quote_currency: string | null
}

type QuoteDetails = {
  operatorName?: string
  operatorEmail?: string
  operatorPhone?: string
  aircraftType?: string
  aircraftCategory?: string
  tailNumber?: string
  seats?: number
}

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

function drawWrappedText(
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
  measure: (value: string) => number,
  draw: (value: string, yPos: number) => void
) {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (measure(next) <= maxWidth || !current) {
      current = next
      continue
    }
    lines.push(current)
    current = word
  }

  if (current) lines.push(current)

  let nextY = y
  for (const line of lines) {
    draw(line, nextY)
    nextY -= lineHeight
  }

  return nextY - fontSize * 0.25
}

async function loadQuoteDetails(quoteId?: string | null): Promise<QuoteDetails> {
  if (!quoteId) return {}

  try {
    const quote = await getQuoteById(quoteId)
    const sellerCompany = (quote.sellerCompany as Record<string, unknown> | undefined) || {}
    const contactInfo = (sellerCompany.contactInfo as Record<string, unknown> | undefined) || {}
    const lift = (quote.lift as Record<string, unknown> | undefined) || {}

    return {
      operatorName: typeof sellerCompany.displayName === "string" ? sellerCompany.displayName : undefined,
      operatorEmail: Array.isArray(contactInfo.emails)
        ? (contactInfo.emails.find((email) => typeof email === "string" && email.trim()) as string | undefined)
        : undefined,
      operatorPhone:
        (typeof contactInfo.phone === "string" && contactInfo.phone.trim()) ? contactInfo.phone :
        (typeof contactInfo.mobilePhone === "string" && contactInfo.mobilePhone.trim()) ? contactInfo.mobilePhone :
        undefined,
      aircraftType: typeof lift.aircraftType === "string" ? lift.aircraftType : undefined,
      aircraftCategory: typeof lift.aircraftCategory === "string" ? lift.aircraftCategory : undefined,
      tailNumber: typeof lift.aircraftTail === "string" ? lift.aircraftTail : undefined,
      seats: typeof lift.maxPax === "number" ? lift.maxPax : undefined,
    }
  } catch {
    return {}
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data: row, error } = await supabase
      .from("flight_requests")
      .select("id, client_name, client_email, client_phone, departure, arrival, departure_date, departure_time, return_date, return_time, passengers, special_requests, selected_quote_id, total_price, proposal_notes, avinode_best_quote_currency")
      .eq("id", id)
      .single()

    if (error || !row) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const flightRequest = row as FlightRequestRow
    const currency = req.nextUrl.searchParams.get("currency") || flightRequest.avinode_best_quote_currency || "USD"
    const queryTotalPrice = Number(req.nextUrl.searchParams.get("totalPrice") || "")
    const totalPrice = Number.isFinite(queryTotalPrice) && queryTotalPrice > 0
      ? queryTotalPrice
      : (flightRequest.total_price || 0)
    const proposalNotes = req.nextUrl.searchParams.get("proposalNotes") || flightRequest.proposal_notes || ""
    const quoteDetails = await loadQuoteDetails(flightRequest.selected_quote_id)

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792])
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const headerTop = height - 36
    try {
      const logoBytes = await readFile(path.join(process.cwd(), "IMG_6289.png"))
      const logo = await pdfDoc.embedPng(logoBytes)
      const scaled = logo.scale(0.09)
      page.drawImage(logo, {
        x: width - 48 - scaled.width,
        y: headerTop - scaled.height,
        width: scaled.width,
        height: scaled.height,
      })
    } catch {
      page.drawText("JETVISION", {
        x: width - 150,
        y: headerTop - 8,
        size: 20,
        font: bold,
        color: rgb(0.06, 0.11, 0.2),
      })
    }

    page.drawText("FOR ILLUSTRATIVE PURPOSES ONLY", {
      x: 48,
      y: headerTop,
      size: 11,
      font: bold,
      color: rgb(0.78, 0.12, 0.12),
    })

    page.drawText("Private Aviation Proposal", {
      x: 48,
      y: height - 96,
      size: 22,
      font: bold,
      color: rgb(0.06, 0.11, 0.2),
    })

    page.drawText(`Prepared on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, {
      x: 48,
      y: height - 116,
      size: 10,
      font,
      color: rgb(0.45, 0.49, 0.55),
    })

    page.drawRectangle({
      x: 48,
      y: height - 214,
      width: width - 96,
      height: 68,
      color: rgb(0.94, 0.97, 0.99),
      borderColor: rgb(0.85, 0.89, 0.93),
      borderWidth: 1,
    })

    page.drawText("Total Proposal Price", {
      x: 64,
      y: height - 172,
      size: 11,
      font,
      color: rgb(0.45, 0.49, 0.55),
    })

    page.drawText(totalPrice > 0 ? fmt(totalPrice, currency) : "Pending", {
      x: 64,
      y: height - 198,
      size: 28,
      font: bold,
      color: rgb(0.06, 0.11, 0.2),
    })

    let y = height - 254

    const section = (title: string) => {
      page.drawText(title, {
        x: 48,
        y,
        size: 12,
        font: bold,
        color: rgb(0.06, 0.11, 0.2),
      })
      y -= 18
      page.drawLine({
        start: { x: 48, y },
        end: { x: width - 48, y },
        thickness: 1,
        color: rgb(0.9, 0.92, 0.95),
      })
      y -= 18
    }

    const field = (label: string, value?: string) => {
      page.drawText(label, {
        x: 48,
        y,
        size: 10,
        font,
        color: rgb(0.45, 0.49, 0.55),
      })
      page.drawText(value || "N/A", {
        x: 170,
        y,
        size: 11,
        font: bold,
        color: rgb(0.09, 0.14, 0.22),
      })
      y -= 18
    }

    section("Customer Details")
    field("Name", flightRequest.client_name)
    field("Email", flightRequest.client_email)
    field("Phone", flightRequest.client_phone)

    section("Flight Details")
    field("Route", `${flightRequest.departure} -> ${flightRequest.arrival}`)
    field("Departure Date", flightRequest.departure_date)
    field("Departure Time", flightRequest.departure_time || "TBD")
    field("Return Date", flightRequest.return_date || "One way")
    field("Return Time", flightRequest.return_time || (flightRequest.return_date ? "TBD" : "N/A"))
    field("Passengers", String(flightRequest.passengers))

    section("Selected Operator & Aircraft")
    field("Operator", quoteDetails.operatorName)
    field("Operator Email", quoteDetails.operatorEmail)
    field("Operator Phone", quoteDetails.operatorPhone)
    field("Aircraft", quoteDetails.aircraftType)
    field("Category", quoteDetails.aircraftCategory)
    field("Tail Number", quoteDetails.tailNumber)
    field("Seats", quoteDetails.seats ? String(quoteDetails.seats) : undefined)

    if (flightRequest.special_requests || proposalNotes) {
      section("Additional Notes")
      if (flightRequest.special_requests) {
        page.drawText("Trip Notes", {
          x: 48,
          y,
          size: 10,
          font,
          color: rgb(0.45, 0.49, 0.55),
        })
        y = drawWrappedText(
          flightRequest.special_requests,
          170,
          y,
          width - 218,
          10,
          14,
          (value) => font.widthOfTextAtSize(value, 10),
          (value, yPos) => page.drawText(value, {
            x: 170,
            y: yPos,
            size: 10,
            font,
            color: rgb(0.09, 0.14, 0.22),
          })
        )
      }

      if (proposalNotes) {
        page.drawText("Proposal Notes", {
          x: 48,
          y,
          size: 10,
          font,
          color: rgb(0.45, 0.49, 0.55),
        })
        y = drawWrappedText(
          proposalNotes,
          170,
          y,
          width - 218,
          10,
          14,
          (value) => font.widthOfTextAtSize(value, 10),
          (value, yPos) => page.drawText(value, {
            x: 170,
            y: yPos,
            size: 10,
            font,
            color: rgb(0.09, 0.14, 0.22),
          })
        )
      }
    }

    page.drawText("This preview intentionally shows only the final client-facing total.", {
      x: 48,
      y: 36,
      size: 9,
      font,
      color: rgb(0.5, 0.54, 0.6),
    })

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"proposal-${id}.pdf\"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF preview" },
      { status: 500 }
    )
  }
}
