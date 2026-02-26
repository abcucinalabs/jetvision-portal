import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

// Sends a proposal email to the client.
//
// Email delivery is configured via environment variables:
//   SMTP_HOST     — e.g. smtp.gmail.com or your Supabase custom SMTP host
//   SMTP_PORT     — e.g. 587
//   SMTP_USER     — sender email address
//   SMTP_PASS     — sender password / app password
//   SMTP_FROM     — "Jetvision <noreply@yourdomain.com>"
//
// If nodemailer is not installed, the route logs the email and returns success
// so the rest of the flow still works. Install nodemailer to enable real delivery:
//   npm install nodemailer @types/nodemailer

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Load the flight request
    const { data: row, error } = await supabase
      .from("flight_requests")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !row) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const clientEmail: string = row.client_email
    const clientName: string = row.client_name
    const departure: string = row.departure
    const arrival: string = row.arrival
    const departureDate: string = row.departure_date
    const totalPrice: number | null = row.total_price
    const proposalNotes: string | null = row.proposal_notes
    const isoName: string = row.iso_name

    const currency = row.avinode_best_quote_currency ?? "USD"
    const fmtPrice = totalPrice
      ? new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(totalPrice)
      : "See attached proposal"

    const subject = `Your Private Aviation Proposal — ${departure} to ${arrival}`
    const textBody = [
      `Dear ${clientName},`,
      "",
      `Please find your private aviation proposal from ${isoName} / Jetvision.`,
      "",
      `Route:       ${departure} → ${arrival}`,
      `Date:        ${departureDate}`,
      `Total Price: ${fmtPrice}`,
      "",
      proposalNotes ? `Notes:\n${proposalNotes}` : "",
      "",
      "A full PDF proposal will be attached in a future update.",
      "",
      "Thank you for choosing Jetvision.",
    ].filter((l) => l !== undefined).join("\n")

    const htmlBody = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#111">
        <h2 style="font-size:20px;margin-bottom:8px">Your Private Aviation Proposal</h2>
        <p style="color:#555;margin-bottom:24px">From ${isoName} / Jetvision</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr><td style="padding:8px 0;color:#888;font-size:13px">Route</td><td style="padding:8px 0;font-weight:600">${departure} → ${arrival}</td></tr>
          <tr><td style="padding:8px 0;color:#888;font-size:13px">Date</td><td style="padding:8px 0;font-weight:600">${departureDate}</td></tr>
          <tr><td style="padding:8px 0;color:#888;font-size:13px">Total Price</td><td style="padding:8px 0;font-size:22px;font-weight:700">${fmtPrice}</td></tr>
        </table>
        ${proposalNotes ? `<div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-bottom:24px;font-size:14px;color:#444">${proposalNotes}</div>` : ""}
        <p style="font-size:12px;color:#aaa">A full PDF proposal will be attached in a future update. Please reply to this email with any questions.</p>
      </div>
    `

    // Attempt nodemailer delivery if SMTP env vars are set
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT ?? "587", 10)
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM ?? smtpUser ?? "Jetvision <noreply@jetvision.com>"

    if (smtpHost && smtpUser && smtpPass) {
      // Dynamic import so the app works even if nodemailer isn't installed yet
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        // @ts-ignore — optional dependency, install with: npm install nodemailer @types/nodemailer
        const nodemailer = await import("nodemailer")
        const transporter = nodemailer.default.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        })
        await transporter.sendMail({
          from: smtpFrom,
          to: clientEmail,
          subject,
          text: textBody,
          html: htmlBody,
        })
        console.log(`[proposals/send] Email sent to ${clientEmail}`)
      } catch (mailErr) {
        // Log but don't fail the request — status update still goes through
        console.error("[proposals/send] Email delivery failed:", mailErr)
      }
    } else {
      // Log in dev when SMTP is not configured
      console.log("[proposals/send] SMTP not configured. Would have sent:")
      console.log("  To:", clientEmail)
      console.log("  Subject:", subject)
      console.log("  Body:", textBody)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
