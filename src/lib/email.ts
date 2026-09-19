import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

function getFromEmail(): string {
  const from =
    process.env.RESEND_FROM_EMAIL;

  if (!from) {
    throw new Error(
      "RESEND_FROM_EMAIL is not configured."
    );
  }

  return from;
}

function getAdminEmail(): string {
  const email =
    process.env.ADMIN_BOOKING_EMAIL;

  if (!email) {
    throw new Error(
      "ADMIN_BOOKING_EMAIL is not configured."
    );
  }

  return email;
}

/*
 * ============================================
 * SEND PASSWORD RESET EMAIL
 * ============================================
 */

export async function sendPasswordResetEmail({
  email,
  name,
  resetUrl,
}: {
  email: string;
  name: string;
  resetUrl: string;
}) {
  const { data, error } =
    await resend.emails.send({
      from: getFromEmail(),

      to: [email],

      subject:
        "Reset your Akshaanshh Jyotish password",

      html: `
        <!DOCTYPE html>

        <html>
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>Reset your password</title>
          </head>

          <body
            style="
              margin: 0;
              padding: 0;
              background: #f7f5f0;
              font-family: Arial, sans-serif;
              color: #222;
            "
          >
            <div
              style="
                max-width: 600px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 12px;
                padding: 40px;
                box-sizing: border-box;
              "
            >
              <h1
                style="
                  margin: 0 0 20px;
                  font-size: 28px;
                "
              >
                Akshaanshh Jyotish
              </h1>

              <h2
                style="
                  margin: 0 0 16px;
                  font-size: 22px;
                "
              >
                Reset your password
              </h2>

              <p
                style="
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                Hello ${name || "Customer"},
              </p>

              <p
                style="
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                We received a request to reset
                the password for your
                Akshaanshh Jyotish customer
                account.
              </p>

              <p
                style="
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                Click the button below to
                create a new password.
              </p>

              <div
                style="
                  margin: 30px 0;
                  text-align: center;
                "
              >
                <a
                  href="${resetUrl}"
                  style="
                    display: inline-block;
                    padding: 14px 24px;
                    background: #111827;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    font-size: 16px;
                  "
                >
                  Reset Password
                </a>
              </div>

              <p
                style="
                  font-size: 14px;
                  line-height: 1.6;
                  color: #666;
                "
              >
                This password reset link will
                expire in 30 minutes.
              </p>

              <p
                style="
                  font-size: 14px;
                  line-height: 1.6;
                  color: #666;
                "
              >
                If you did not request a
                password reset, you can safely
                ignore this email.
              </p>

              <hr
                style="
                  border: none;
                  border-top: 1px solid #eee;
                  margin: 30px 0;
                "
              />

              <p
                style="
                  font-size: 12px;
                  color: #888;
                  margin: 0;
                "
              >
                Akshaanshh Jyotish
              </p>
            </div>
          </body>
        </html>
      `,
    });

  if (error) {
    console.error(
      "PASSWORD RESET EMAIL ERROR:",
      error
    );

    throw new Error(
      "Unable to send password reset email."
    );
  }

  return data;
}

/*
 * ============================================
 * SEND GUEST BOOKING OTP EMAIL
 * ============================================
 */

export async function sendGuestBookingOtpEmail({
  email,
  name,
  bookingId,
  otp,
  expiresInMinutes,
}: {
  email: string;
  name: string;
  bookingId: string;
  otp: string;
  expiresInMinutes: number;
}) {
  const { data, error } =
    await resend.emails.send({
      from: getFromEmail(),

      to: [email],

      subject:
        "Your Akshaanshh Jyotish booking verification code",

      html: `
        <!DOCTYPE html>

        <html>
          <head>
            <meta charset="UTF-8" />

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />

            <title>
              Booking verification code
            </title>
          </head>

          <body
            style="
              margin: 0;
              padding: 0;
              background: #faf7ef;
              font-family: Arial, sans-serif;
              color: #292929;
            "
          >
            <div
              style="
                max-width: 600px;
                margin: 40px auto;
                background: #ffffff;
                border: 1px solid #e4dac6;
                border-radius: 16px;
                padding: 40px;
                box-sizing: border-box;
              "
            >
              <p
                style="
                  margin: 0 0 10px;
                  color: #ad7c1d;
                  font-size: 12px;
                  font-weight: 700;
                  letter-spacing: 2px;
                  text-transform: uppercase;
                "
              >
                Booking Access
              </p>

              <h1
                style="
                  margin: 0 0 16px;
                  color: #07182a;
                  font-size: 28px;
                "
              >
                Verify your booking
              </h1>

              <p
                style="
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                Hello ${name || "Customer"},
              </p>

              <p
                style="
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                Use the verification code below
                to track booking
                <strong>
                  ${bookingId}
                </strong>.
              </p>

              <div
                style="
                  margin: 28px 0;
                  text-align: center;
                "
              >
                <div
                  style="
                    display: inline-block;
                    padding: 16px 28px;
                    background: #07182a;
                    color: #ffffff;
                    border-radius: 12px;
                    font-size: 32px;
                    font-weight: 700;
                    letter-spacing: 8px;
                  "
                >
                  ${otp}
                </div>
              </div>

              <p
                style="
                  font-size: 14px;
                  line-height: 1.6;
                  color: #6f6a61;
                "
              >
                This code expires in
                ${expiresInMinutes} minutes.
                Do not share it with anyone.
              </p>

              <hr
                style="
                  border: none;
                  border-top: 1px solid #eee;
                  margin: 28px 0;
                "
              />

              <p
                style="
                  margin: 0;
                  font-size: 12px;
                  color: #888;
                "
              >
                Akshaanshh Jyotish
              </p>
            </div>
          </body>
        </html>
      `,
    });

  if (error) {
    console.error(
      "GUEST BOOKING OTP EMAIL ERROR:",
      error
    );

    throw new Error(
      "Unable to send booking verification email."
    );
  }

  return data;
}

/*
 * ============================================
 * SEND CUSTOMER BOOKING CONFIRMATION EMAIL
 * ============================================
 */

export async function sendBookingConfirmationEmail({
  email,
  name,
  bookingId,
  serviceName,
  consultantName,
  date,
  time,
  mode,
  price,
  currency,
}: {
  email: string;
  name: string;
  bookingId: string;
  serviceName: string;
  consultantName: string;
  date: string;
  time: string;
  mode: "video" | "voice";
  price: number;
  currency: string;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const trackUrl =
    `${appUrl}/track-booking`;

  const { data, error } =
    await resend.emails.send({
      from: getFromEmail(),

      to: [email],

      subject:
        `Booking confirmed — ${bookingId}`,

      html: `
        <!DOCTYPE html>

        <html>
          <head>
            <meta charset="UTF-8" />

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />

            <title>
              Booking confirmed
            </title>
          </head>

          <body
            style="
              margin: 0;
              padding: 0;
              background: #faf7ef;
              font-family: Arial, sans-serif;
              color: #292929;
            "
          >
            <div
              style="
                max-width: 620px;
                margin: 40px auto;
                background: #ffffff;
                border: 1px solid #e4dac6;
                border-radius: 16px;
                padding: 40px;
                box-sizing: border-box;
              "
            >
              <p
                style="
                  margin: 0 0 10px;
                  color: #ad7c1d;
                  font-size: 12px;
                  font-weight: 700;
                  letter-spacing: 2px;
                  text-transform: uppercase;
                "
              >
                Booking Confirmed
              </p>

              <h1
                style="
                  margin: 0 0 16px;
                  color: #07182a;
                  font-size: 28px;
                "
              >
                Your consultation is confirmed
              </h1>

              <p
                style="
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                Hello ${name || "Customer"},
              </p>

              <p
                style="
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                Your payment was received
                successfully and your consultation
                booking is confirmed.
              </p>

              <div
                style="
                  margin: 24px 0;
                  padding: 20px;
                  border-radius: 12px;
                  background: #faf7ef;
                  border: 1px solid #e4dac6;
                "
              >
                <p
                  style="
                    margin: 0 0 10px;
                    color: #6f6a61;
                    font-size: 13px;
                  "
                >
                  BOOKING ID
                </p>

                <p
                  style="
                    margin: 0;
                    color: #07182a;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: 1px;
                  "
                >
                  ${bookingId}
                </p>
              </div>

              <p
                style="
                  margin: 8px 0;
                  font-size: 15px;
                "
              >
                <strong>Service:</strong>
                ${serviceName}
              </p>

              <p
                style="
                  margin: 8px 0;
                  font-size: 15px;
                "
              >
                <strong>Consultant:</strong>
                ${consultantName}
              </p>

              <p
                style="
                  margin: 8px 0;
                  font-size: 15px;
                "
              >
                <strong>Date:</strong>
                ${date}
              </p>

              <p
                style="
                  margin: 8px 0;
                  font-size: 15px;
                "
              >
                <strong>Time:</strong>
                ${time} IST
              </p>

              <p
                style="
                  margin: 8px 0;
                  font-size: 15px;
                "
              >
                <strong>Mode:</strong>
                ${
                  mode === "video"
                    ? "Video Call"
                    : "Voice Call"
                }
              </p>

              <p
                style="
                  margin: 8px 0;
                  font-size: 15px;
                "
              >
                <strong>Amount:</strong>
                ${currency}
                ${Number(price).toLocaleString("en-IN")}
              </p>

              <div
                style="
                  margin: 30px 0;
                  text-align: center;
                "
              >
                <a
                  href="${trackUrl}"
                  style="
                    display: inline-block;
                    padding: 14px 22px;
                    background: #d6a63b;
                    color: #17130b;
                    text-decoration: none;
                    border-radius: 10px;
                    font-weight: 700;
                  "
                >
                  Track My Booking
                </a>
              </div>

              <p
                style="
                  font-size: 13px;
                  line-height: 1.6;
                  color: #6f6a61;
                "
              >
                Keep your booking ID safe.
                You can use it with your booking
                email to securely track your
                consultation without creating
                an account.
              </p>

              <hr
                style="
                  border: none;
                  border-top: 1px solid #eee;
                  margin: 28px 0;
                "
              />

              <p
                style="
                  margin: 0;
                  font-size: 12px;
                  color: #888;
                "
              >
                Akshaanshh Jyotish
              </p>
            </div>
          </body>
        </html>
      `,
    });

  if (error) {
    console.error(
      "BOOKING CONFIRMATION EMAIL SEND ERROR:",
      error
    );

    throw new Error(
      "Unable to send booking confirmation email."
    );
  }

  console.log(
    "BOOKING CONFIRMATION EMAIL SENT TO RESEND:",
    {
      id: data?.id,
      email,
      from: getFromEmail(),
      bookingId,
    }
  );

  return data;
}

/*
 * ============================================
 * SEND ADMIN BOOKING NOTIFICATION EMAIL
 * ============================================
 */

export async function sendAdminBookingNotificationEmail({
  bookingId,
  customerName,
  customerEmail,
  customerMobile,
  serviceName,
  category,
  consultantName,
  date,
  time,
  mode,
  price,
  currency,
}: {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  serviceName: string;
  category: string;
  consultantName: string;
  date: string;
  time: string;
  mode: "video" | "voice";
  price: number;
  currency: string;
}) {
  const adminEmail =
    getAdminEmail();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const bookingUrl =
    `${appUrl}/admin`;

  const { data, error } =
    await resend.emails.send({
      from: getFromEmail(),

      to: [adminEmail],

      subject:
        `New confirmed booking — ${bookingId}`,

      html: `
        <!DOCTYPE html>

        <html>
          <head>
            <meta charset="UTF-8" />

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />

            <title>
              New confirmed booking
            </title>
          </head>

          <body
            style="
              margin: 0;
              padding: 0;
              background: #f4f1ea;
              font-family: Arial, sans-serif;
              color: #292929;
            "
          >
            <div
              style="
                max-width: 680px;
                margin: 40px auto;
                background: #ffffff;
                border: 1px solid #e4dac6;
                border-radius: 16px;
                padding: 40px;
                box-sizing: border-box;
              "
            >
              <p
                style="
                  margin: 0 0 10px;
                  color: #ad7c1d;
                  font-size: 12px;
                  font-weight: 700;
                  letter-spacing: 2px;
                  text-transform: uppercase;
                "
              >
                New Booking
              </p>

              <h1
                style="
                  margin: 0 0 16px;
                  color: #07182a;
                  font-size: 28px;
                "
              >
                New consultation confirmed
              </h1>

              <p
                style="
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                A customer has successfully
                completed payment and a new
                consultation booking has been
                confirmed.
              </p>

              <div
                style="
                  margin: 24px 0;
                  padding: 20px;
                  border-radius: 12px;
                  background: #faf7ef;
                  border: 1px solid #e4dac6;
                "
              >
                <p
                  style="
                    margin: 0 0 8px;
                    color: #6f6a61;
                    font-size: 13px;
                  "
                >
                  BOOKING ID
                </p>

                <p
                  style="
                    margin: 0;
                    color: #07182a;
                    font-size: 24px;
                    font-weight: 700;
                  "
                >
                  ${bookingId}
                </p>
              </div>

              <h2
                style="
                  color: #07182a;
                  font-size: 19px;
                  margin: 28px 0 12px;
                "
              >
                Consultation Details
              </h2>

              <p style="margin: 8px 0; font-size: 15px;">
                <strong>Service:</strong>
                ${serviceName}
              </p>

              <p style="margin: 8px 0; font-size: 15px;">
                <strong>Category:</strong>
                ${category}
              </p>

              <p style="margin: 8px 0; font-size: 15px;">
                <strong>Consultant:</strong>
                ${consultantName}
              </p>

              <p style="margin: 8px 0; font-size: 15px;">
                <strong>Date:</strong>
                ${date}
              </p>

              <p style="margin: 8px 0; font-size: 15px;">
                <strong>Time:</strong>
                ${time} IST
              </p>

              <p style="margin: 8px 0; font-size: 15px;">
                <strong>Mode:</strong>
                ${
                  mode === "video"
                    ? "Video Call"
                    : "Voice Call"
                }
              </p>

              <p style="margin: 8px 0; font-size: 15px;">
                <strong>Amount:</strong>
                ${currency}
                ${Number(price).toLocaleString("en-IN")}
              </p>

              <h2
                style="
                  color: #07182a;
                  font-size: 19px;
                  margin: 28px 0 12px;
                "
              >
                Customer Details
              </h2>

              <p style="margin: 8px 0; font-size: 15px;">
                <strong>Name:</strong>
                ${customerName}
              </p>

              <p style="margin: 8px 0; font-size: 15px;">
                <strong>Email:</strong>
                ${customerEmail}
              </p>

              <p style="margin: 8px 0; font-size: 15px;">
                <strong>Mobile:</strong>
                ${customerMobile}
              </p>

              <div
                style="
                  margin: 30px 0;
                  text-align: center;
                "
              >
                <a
                  href="${bookingUrl}"
                  style="
                    display: inline-block;
                    padding: 14px 22px;
                    background: #07182a;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 10px;
                    font-weight: 700;
                  "
                >
                  Open Admin Dashboard
                </a>
              </div>

              <hr
                style="
                  border: none;
                  border-top: 1px solid #eee;
                  margin: 28px 0;
                "
              />

              <p
                style="
                  margin: 0;
                  font-size: 12px;
                  color: #888;
                "
              >
                Akshaanshh Jyotish — Admin Notification
              </p>
            </div>
          </body>
        </html>
      `,
    });

  if (error) {
    console.error(
      "ADMIN BOOKING EMAIL SEND ERROR:",
      error
    );

    throw new Error(
      "Unable to send admin booking notification email."
    );
  }

  return data;
}
/*
 * ============================================
 * SEND CUSTOMER REFUND EMAIL
 * ============================================
 */

export async function sendCustomerRefundEmail({
  email,
  name,
  bookingId,
  serviceName,
  consultantName,
  date,
  time,
  mode,
  amount,
  currency,
  refundId,
  reason,
}: {
  email: string;
  name: string;
  bookingId: string;
  serviceName: string;
  consultantName: string;
  date: string;
  time: string;
  mode: "video" | "voice";
  amount: number;
  currency: string;
  refundId: string;
  reason: string;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const trackUrl =
    `${appUrl}/track-booking`;

  const { data, error } =
    await resend.emails.send({
      from: getFromEmail(),

      to: [email],

      subject:
        `Refund processed — ${bookingId}`,

      html: `
        <!DOCTYPE html>

        <html>
          <head>
            <meta charset="UTF-8" />

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />

            <title>
              Refund processed
            </title>
          </head>

          <body
            style="
              margin: 0;
              padding: 0;
              background: #faf7ef;
              font-family: Arial, sans-serif;
              color: #292929;
            "
          >
            <div
              style="
                max-width: 620px;
                margin: 40px auto;
                background: #ffffff;
                border: 1px solid #e4dac6;
                border-radius: 16px;
                padding: 40px;
                box-sizing: border-box;
              "
            >
              <p
                style="
                  margin: 0 0 10px;
                  color: #ad7c1d;
                  font-size: 12px;
                  font-weight: 700;
                  letter-spacing: 2px;
                  text-transform: uppercase;
                "
              >
                Refund Processed
              </p>

              <h1
                style="
                  margin: 0 0 16px;
                  color: #07182a;
                  font-size: 28px;
                "
              >
                Your refund has been processed
              </h1>

              <p
                style="
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                Hello ${name || "Customer"},
              </p>

              <p
                style="
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                Your consultation booking has been
                cancelled and your payment refund
                has been successfully processed.
              </p>

              <div
                style="
                  margin: 24px 0;
                  padding: 20px;
                  border-radius: 12px;
                  background: #faf7ef;
                  border: 1px solid #e4dac6;
                "
              >
                <p
                  style="
                    margin: 0 0 8px;
                    color: #6f6a61;
                    font-size: 13px;
                  "
                >
                  BOOKING ID
                </p>

                <p
                  style="
                    margin: 0;
                    color: #07182a;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: 1px;
                  "
                >
                  ${bookingId}
                </p>
              </div>

              <h2
                style="
                  color: #07182a;
                  font-size: 19px;
                  margin: 28px 0 12px;
                "
              >
                Consultation Details
              </h2>

              <p
                style="
                  margin: 8px 0;
                  font-size: 15px;
                "
              >
                <strong>Service:</strong>
                ${serviceName}
              </p>

              <p
                style="
                  margin: 8px 0;
                  font-size: 15px;
                "
              >
                <strong>Consultant:</strong>
                ${consultantName}
              </p>

              <p
                style="
                  margin: 8px 0;
                  font-size: 15px;
                "
              >
                <strong>Date:</strong>
                ${date}
              </p>

              <p
                style="
                  margin: 8px 0;
                  font-size: 15px;
                "
              >
                <strong>Time:</strong>
                ${time} IST
              </p>

              <p
                style="
                  margin: 8px 0;
                  font-size: 15px;
                "
              >
                <strong>Mode:</strong>
                ${
                  mode === "video"
                    ? "Video Call"
                    : "Voice Call"
                }
              </p>

              <div
                style="
                  margin: 24px 0;
                  padding: 20px;
                  border-radius: 12px;
                  background: #f4f1ea;
                  border: 1px solid #e4dac6;
                "
              >
                <p
                  style="
                    margin: 0 0 8px;
                    color: #6f6a61;
                    font-size: 13px;
                  "
                >
                  REFUND AMOUNT
                </p>

                <p
                  style="
                    margin: 0;
                    color: #07182a;
                    font-size: 24px;
                    font-weight: 700;
                  "
                >
                  ${currency}
                  ${Number(amount).toLocaleString(
                    "en-IN"
                  )}
                </p>
              </div>

              <p
                style="
                  margin: 8px 0;
                  font-size: 14px;
                  color: #6f6a61;
                "
              >
                <strong>Refund ID:</strong>
                ${refundId}
              </p>

              <p
                style="
                  margin: 8px 0;
                  font-size: 14px;
                  color: #6f6a61;
                "
              >
                <strong>Reason:</strong>
                ${reason || "Booking cancelled by administrator."}
              </p>

              <div
                style="
                  margin: 30px 0;
                  text-align: center;
                "
              >
                <a
                  href="${trackUrl}"
                  style="
                    display: inline-block;
                    padding: 14px 22px;
                    background: #d6a63b;
                    color: #17130b;
                    text-decoration: none;
                    border-radius: 10px;
                    font-weight: 700;
                  "
                >
                  Track My Booking
                </a>
              </div>

              <p
                style="
                  font-size: 13px;
                  line-height: 1.6;
                  color: #6f6a61;
                "
              >
                The refund has been processed by
                our payment provider. The time taken
                for the refunded amount to appear in
                your account may depend on your bank
                or payment provider.
              </p>

              <hr
                style="
                  border: none;
                  border-top: 1px solid #eee;
                  margin: 28px 0;
                "
              />

              <p
                style="
                  margin: 0;
                  font-size: 12px;
                  color: #888;
                "
              >
                Akshaanshh Jyotish
              </p>
            </div>
          </body>
        </html>
      `,
    });

  if (error) {
    console.error(
      "CUSTOMER REFUND EMAIL SEND ERROR"
    );

    throw new Error(
      "Unable to send customer refund email."
    );
  }

  return data;
}
/*
 * ============================================
 * SEND CONSULTANT INVITATION EMAIL
 * ============================================
 */

export async function sendConsultantInvitationEmail({
  email,
  name,
  inviteUrl,
  invitedByName,
  expiresInHours,
}: {
  email: string;
  name: string;
  inviteUrl: string;
  invitedByName: string;
  expiresInHours: number;
}) {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const safeName = escapeHtml(name || "Consultant");
  const safeInvitedBy = escapeHtml(
    invitedByName || "The Akshaanshh Jyotish administration team",
  );

  // The actual onboarding page lives at /consultants/onboarding.
  // Normalize the invitation URL here as a defensive final check so older
  // callers that still provide /consultant/onboarding cannot send a broken link.
  const normalizedInviteUrl = (() => {
    try {
      const url = new URL(inviteUrl);
      if (url.pathname === "/consultant/onboarding") {
        url.pathname = "/consultants/onboarding";
      }
      return url.toString();
    } catch {
      return inviteUrl.replace(
        "/consultant/onboarding",
        "/consultants/onboarding",
      );
    }
  })();

  const safeInviteUrl = escapeHtml(normalizedInviteUrl);

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: [email],
    subject: "Complete your Akshaanshh Jyotish consultant profile",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Consultant invitation</title>
        </head>
        <body
          style="
            margin:0;
            padding:0;
            background:#f7f5f0;
            font-family:Arial,sans-serif;
            color:#222;
          "
        >
          <div
            style="
              max-width:600px;
              margin:40px auto;
              background:#ffffff;
              border:1px solid #e4dac6;
              border-radius:16px;
              padding:40px;
              box-sizing:border-box;
            "
          >
            <div
              style="
                color:#ad7c1d;
                font-size:12px;
                font-weight:700;
                letter-spacing:3px;
                margin-bottom:14px;
              "
            >
              CONSULTANT ONBOARDING
            </div>

            <h1
              style="
                margin:0 0 18px;
                color:#07182a;
                font-size:28px;
                line-height:1.25;
              "
            >
              Your consultant profile is ready to complete
            </h1>

            <p style="font-size:16px;line-height:1.65;">
              Hello ${safeName},
            </p>

            <p style="font-size:16px;line-height:1.65;">
              ${safeInvitedBy} has invited you to complete your consultant profile for
              Akshaanshh Jyotish.
            </p>

            <div
              style="
                margin:26px 0;
                padding:18px;
                border:1px solid #e4dac6;
                border-radius:12px;
                background:#faf7ef;
              "
            >
              <p style="margin:0 0 8px;color:#6f6a61;font-size:13px;">
                Your sign-in email is not being created here. This is a secure one-time
                profile setup link for your consultant profile.
              </p>
              <p style="margin:0;color:#07182a;font-size:14px;font-weight:700;">
                ${escapeHtml(email)}
              </p>
            </div>

            <div style="margin:28px 0;text-align:center;">
              <a
                href="${safeInviteUrl}"
                style="
                  display:inline-block;
                  padding:14px 24px;
                  background:#07182a;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:9px;
                  font-size:15px;
                  font-weight:700;
                "
              >
                Complete Consultant Profile →
              </a>
            </div>

            <p style="font-size:14px;line-height:1.65;color:#6f6a61;">
              On the secure page, you will add your phone number, specialization, professional
              photo and consultation modes. Your availability is managed separately by the
              administration team.
            </p>

            <p style="font-size:14px;line-height:1.65;color:#6f6a61;">
              This invitation expires in ${expiresInHours} hours and can only be used once.
            </p>

            <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />

            <p style="font-size:12px;color:#888;margin:0;">
              Akshaanshh Jyotish · Consultant Onboarding
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("CONSULTANT INVITATION EMAIL ERROR:", error);
    throw new Error("Unable to send consultant invitation email.");
  }

  return data;
}

/*
 * ============================================
 * SEND ADMIN INVITATION EMAIL
 * ============================================
 */

export async function sendAdminInvitationEmail({
  email,
  name,
  inviteUrl,
  invitedByName,
}: {
  email: string;
  name: string;
  inviteUrl: string;
  invitedByName: string;
}) {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const safeName = escapeHtml(name || "Administrator");
  const safeInvitedBy = escapeHtml(
    invitedByName || "An existing administrator"
  );

  const { data, error } =
    await resend.emails.send({
      from: getFromEmail(),
      to: [email],
      subject:
        "You have been invited to Akshaanshh Jyotish Admin",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>Admin invitation</title>
          </head>
          <body
            style="
              margin:0;
              padding:0;
              background:#f7f5f0;
              font-family:Arial,sans-serif;
              color:#222;
            "
          >
            <div
              style="
                max-width:600px;
                margin:40px auto;
                background:#ffffff;
                border:1px solid #e4dac6;
                border-radius:16px;
                padding:40px;
                box-sizing:border-box;
              "
            >
              <div
                style="
                  color:#ad7c1d;
                  font-size:12px;
                  font-weight:700;
                  letter-spacing:3px;
                  margin-bottom:14px;
                "
              >
                ADMINISTRATION
              </div>

              <h1
                style="
                  margin:0 0 18px;
                  color:#07182a;
                  font-size:28px;
                  line-height:1.25;
                "
              >
                Your admin access is ready
              </h1>

              <p style="font-size:16px;line-height:1.65;">
                Hello ${safeName},
              </p>

              <p style="font-size:16px;line-height:1.65;">
                ${safeInvitedBy} has invited you to create your own
                administrator account for Akshaanshh Jyotish.
              </p>

              <div
                style="
                  margin:26px 0;
                  padding:18px;
                  border:1px solid #e4dac6;
                  border-radius:12px;
                  background:#faf7ef;
                "
              >
                <p style="margin:0;color:#6f6a61;font-size:13px;">
                  Your sign-in email
                </p>
                <p
                  style="
                    margin:7px 0 0;
                    color:#07182a;
                    font-size:16px;
                    font-weight:700;
                  "
                >
                  ${escapeHtml(email)}
                </p>
              </div>

              <div style="text-align:center;margin:30px 0;">
                <a
                  href="${inviteUrl}"
                  style="
                    display:inline-block;
                    padding:14px 22px;
                    background:#d6a63b;
                    color:#17130b;
                    text-decoration:none;
                    border-radius:10px;
                    font-weight:700;
                  "
                >
                  Create My Admin Account
                </a>
              </div>

              <p
                style="
                  font-size:13px;
                  line-height:1.6;
                  color:#6f6a61;
                "
              >
                This invitation is single-use and expires after 30 minutes.
                You will create your own password on the secure setup page.
              </p>

              <p
                style="
                  font-size:13px;
                  line-height:1.6;
                  color:#6f6a61;
                "
              >
                After signing in, administrators who were activated through this invitation can create and manage their own consultant profile from the admin panel.
              </p>

              <p
                style="
                  font-size:13px;
                  line-height:1.6;
                  color:#6f6a61;
                "
              >
                If you were not expecting this invitation, you can safely
                ignore this email.
              </p>

              <hr
                style="border:none;border-top:1px solid #eee;margin:30px 0;"
              />

              <p style="margin:0;font-size:12px;color:#888;">
                Akshaanshh Jyotish — Administration Portal
              </p>
            </div>
          </body>
        </html>
      `,
    });

  if (error) {
    console.error("ADMIN INVITATION EMAIL SEND ERROR");
    throw new Error("Unable to send admin invitation email.");
  }

  return data;
}


/*
 * ============================================
 * CONTACT & FEEDBACK EMAIL HELPERS
 * ============================================
 */

function escapeEmailHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendContactQueryNotificationEmail({
  queryId,
  name,
  email,
  mobile,
  subject,
  category,
  message,
}: {
  queryId: string;
  name: string;
  email: string;
  mobile?: string;
  subject: string;
  category: string;
  message: string;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const queryUrl = `${appUrl}/admin/queries/${encodeURIComponent(queryId)}`;

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: [getAdminEmail()],
    subject: `New contact query — ${queryId}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>New contact query</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#292929;">
          <div style="max-width:680px;margin:40px auto;background:#ffffff;border:1px solid #e4dac6;border-radius:16px;padding:40px;box-sizing:border-box;">
            <p style="margin:0 0 10px;color:#ad7c1d;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
              Contact Query
            </p>
            <h1 style="margin:0 0 16px;color:#07182a;font-size:28px;line-height:1.25;">
              New customer query received
            </h1>
            <p style="font-size:16px;line-height:1.6;">
              A visitor has submitted a new query through the Contact Us page.
            </p>

            <div style="margin:24px 0;padding:20px;border-radius:12px;background:#faf7ef;border:1px solid #e4dac6;">
              <p style="margin:0 0 8px;color:#6f6a61;font-size:13px;">QUERY ID</p>
              <p style="margin:0;color:#07182a;font-size:24px;font-weight:700;letter-spacing:1px;">
                ${escapeEmailHtml(queryId)}
              </p>
            </div>

            <h2 style="color:#07182a;font-size:19px;margin:28px 0 12px;">Customer Details</h2>
            <p style="margin:8px 0;font-size:15px;"><strong>Name:</strong> ${escapeEmailHtml(name)}</p>
            <p style="margin:8px 0;font-size:15px;"><strong>Email:</strong> ${escapeEmailHtml(email)}</p>
            <p style="margin:8px 0;font-size:15px;"><strong>Mobile:</strong> ${escapeEmailHtml(mobile || "Not provided")}</p>
            <p style="margin:8px 0;font-size:15px;"><strong>Category:</strong> ${escapeEmailHtml(category)}</p>
            <p style="margin:8px 0;font-size:15px;"><strong>Subject:</strong> ${escapeEmailHtml(subject)}</p>

            <h2 style="color:#07182a;font-size:19px;margin:28px 0 12px;">Message</h2>
            <div style="padding:18px;background:#faf7ef;border:1px solid #e4dac6;border-radius:12px;font-size:15px;line-height:1.7;white-space:pre-wrap;">
              ${escapeEmailHtml(message)}
            </div>

            <div style="text-align:center;margin:30px 0;">
              <a href="${queryUrl}" style="display:inline-block;padding:14px 22px;background:#07182a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;">
                Open Query in Admin
              </a>
            </div>

            <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />
            <p style="margin:0;font-size:12px;color:#888;">Akshaanshh Jyotish — Admin Notification</p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("CONTACT QUERY ADMIN EMAIL SEND ERROR:", error);
    throw new Error("Unable to send contact query notification email.");
  }

  return data;
}

export async function sendContactQueryReceiptEmail({
  queryId,
  name,
  email,
  subject,
}: {
  queryId: string;
  name: string;
  email: string;
  subject: string;
}) {
  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: [email],
    subject: `We received your query — ${queryId}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Query received</title>
        </head>
        <body style="margin:0;padding:0;background:#faf7ef;font-family:Arial,sans-serif;color:#292929;">
          <div style="max-width:620px;margin:40px auto;background:#ffffff;border:1px solid #e4dac6;border-radius:16px;padding:40px;box-sizing:border-box;">
            <p style="margin:0 0 10px;color:#ad7c1d;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Akshaanshh Jyotish</p>
            <h1 style="margin:0 0 16px;color:#07182a;font-size:28px;">We received your query</h1>
            <p style="font-size:16px;line-height:1.6;">Hello ${escapeEmailHtml(name || "Customer")},</p>
            <p style="font-size:16px;line-height:1.6;">
              Thank you for contacting Akshaanshh Jyotish. Your query has been received and is now in our support queue.
            </p>

            <div style="margin:24px 0;padding:20px;border-radius:12px;background:#faf7ef;border:1px solid #e4dac6;">
              <p style="margin:0 0 8px;color:#6f6a61;font-size:13px;">REFERENCE ID</p>
              <p style="margin:0;color:#07182a;font-size:24px;font-weight:700;letter-spacing:1px;">${escapeEmailHtml(queryId)}</p>
              <p style="margin:12px 0 0;color:#6f6a61;font-size:14px;">Subject: ${escapeEmailHtml(subject)}</p>
            </div>

            <p style="font-size:15px;line-height:1.6;color:#6f6a61;">
              Please keep this reference ID for future communication. Our team will review your message and reply to you by email.
            </p>

            <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />
            <p style="margin:0;font-size:12px;color:#888;">Akshaanshh Jyotish</p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("CONTACT QUERY RECEIPT EMAIL SEND ERROR:", error);
    throw new Error("Unable to send contact query receipt email.");
  }

  return data;
}

export async function sendFeedbackNotificationEmail({
  feedbackId,
  name,
  email,
  rating,
  message,
  serviceName,
  bookingId,
  verifiedCustomer,
}: {
  feedbackId: string;
  name: string;
  email: string;
  rating: number;
  message: string;
  serviceName?: string;
  bookingId?: string;
  verifiedCustomer: boolean;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const feedbackUrl = `${appUrl}/admin/feedback/${encodeURIComponent(feedbackId)}`;

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: [getAdminEmail()],
    subject: `New feedback received — ${feedbackId}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>New feedback</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#292929;">
          <div style="max-width:680px;margin:40px auto;background:#ffffff;border:1px solid #e4dac6;border-radius:16px;padding:40px;box-sizing:border-box;">
            <p style="margin:0 0 10px;color:#ad7c1d;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Customer Feedback</p>
            <h1 style="margin:0 0 16px;color:#07182a;font-size:28px;">New feedback needs review</h1>
            <p style="font-size:16px;line-height:1.6;">A visitor has submitted feedback. It is currently pending moderation and is not public.</p>

            <div style="margin:24px 0;padding:20px;border-radius:12px;background:#faf7ef;border:1px solid #e4dac6;">
              <p style="margin:0 0 8px;color:#6f6a61;font-size:13px;">FEEDBACK ID</p>
              <p style="margin:0;color:#07182a;font-size:24px;font-weight:700;letter-spacing:1px;">${escapeEmailHtml(feedbackId)}</p>
              <p style="margin:12px 0 0;color:#6f6a61;font-size:14px;">Rating: ${escapeEmailHtml(rating)} / 5</p>
              <p style="margin:8px 0 0;color:#6f6a61;font-size:14px;">Verified customer: ${verifiedCustomer ? "Yes" : "No"}</p>
            </div>

            <h2 style="color:#07182a;font-size:19px;margin:28px 0 12px;">Customer Details</h2>
            <p style="margin:8px 0;font-size:15px;"><strong>Name:</strong> ${escapeEmailHtml(name)}</p>
            <p style="margin:8px 0;font-size:15px;"><strong>Email:</strong> ${escapeEmailHtml(email)}</p>
            <p style="margin:8px 0;font-size:15px;"><strong>Service:</strong> ${escapeEmailHtml(serviceName || "Not provided")}</p>
            <p style="margin:8px 0;font-size:15px;"><strong>Booking ID:</strong> ${escapeEmailHtml(bookingId || "Not provided")}</p>

            <h2 style="color:#07182a;font-size:19px;margin:28px 0 12px;">Feedback</h2>
            <div style="padding:18px;background:#faf7ef;border:1px solid #e4dac6;border-radius:12px;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeEmailHtml(message)}</div>

            <div style="text-align:center;margin:30px 0;">
              <a href="${feedbackUrl}" style="display:inline-block;padding:14px 22px;background:#07182a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;">Review Feedback</a>
            </div>

            <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />
            <p style="margin:0;font-size:12px;color:#888;">Akshaanshh Jyotish — Admin Notification</p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("FEEDBACK ADMIN EMAIL SEND ERROR:", error);
    throw new Error("Unable to send feedback notification email.");
  }

  return data;
}

export async function sendFeedbackReceiptEmail({
  feedbackId,
  name,
  email,
}: {
  feedbackId: string;
  name: string;
  email: string;
}) {
  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: [email],
    subject: `Thank you for your feedback — ${feedbackId}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Thank you for your feedback</title>
        </head>
        <body style="margin:0;padding:0;background:#faf7ef;font-family:Arial,sans-serif;color:#292929;">
          <div style="max-width:620px;margin:40px auto;background:#ffffff;border:1px solid #e4dac6;border-radius:16px;padding:40px;box-sizing:border-box;">
            <p style="margin:0 0 10px;color:#ad7c1d;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Akshaanshh Jyotish</p>
            <h1 style="margin:0 0 16px;color:#07182a;font-size:28px;">Thank you for your feedback</h1>
            <p style="font-size:16px;line-height:1.6;">Hello ${escapeEmailHtml(name || "Customer")},</p>
            <p style="font-size:16px;line-height:1.6;">
              We appreciate you taking the time to share your experience with us. Your feedback has been received and will be reviewed by our team before anything is published publicly.
            </p>
            <div style="margin:24px 0;padding:20px;border-radius:12px;background:#faf7ef;border:1px solid #e4dac6;">
              <p style="margin:0 0 8px;color:#6f6a61;font-size:13px;">FEEDBACK ID</p>
              <p style="margin:0;color:#07182a;font-size:24px;font-weight:700;letter-spacing:1px;">${escapeEmailHtml(feedbackId)}</p>
            </div>
            <p style="font-size:14px;line-height:1.6;color:#6f6a61;">
              Your feedback is currently pending moderation. Approval is required before it can appear on the website.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />
            <p style="margin:0;font-size:12px;color:#888;">Akshaanshh Jyotish</p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("FEEDBACK RECEIPT EMAIL SEND ERROR:", error);
    throw new Error("Unable to send feedback receipt email.");
  }

  return data;
}

export async function sendContactQueryReplyEmail({
  queryId,
  name,
  email,
  subject,
  replyMessage,
}: {
  queryId: string;
  name: string;
  email: string;
  subject: string;
  replyMessage: string;
}) {
  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: [email],
    subject: `Re: ${subject} — ${queryId}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Reply to your query</title>
        </head>
        <body style="margin:0;padding:0;background:#faf7ef;font-family:Arial,sans-serif;color:#292929;">
          <div style="max-width:620px;margin:40px auto;background:#ffffff;border:1px solid #e4dac6;border-radius:16px;padding:40px;box-sizing:border-box;">
            <p style="margin:0 0 10px;color:#ad7c1d;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Akshaanshh Jyotish Support</p>
            <h1 style="margin:0 0 16px;color:#07182a;font-size:28px;">Reply to your query</h1>
            <p style="font-size:16px;line-height:1.6;">Hello ${escapeEmailHtml(name || "Customer")},</p>
            <p style="font-size:15px;line-height:1.6;color:#6f6a61;">
              Our team has replied to your query. Your reference ID is <strong>${escapeEmailHtml(queryId)}</strong>.
            </p>
            <div style="margin:24px 0;padding:20px;border-radius:12px;background:#faf7ef;border:1px solid #e4dac6;">
              <p style="margin:0 0 8px;color:#6f6a61;font-size:13px;">REPLY</p>
              <div style="font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeEmailHtml(replyMessage)}</div>
            </div>
            <p style="font-size:14px;line-height:1.6;color:#6f6a61;">
              If you need further assistance, reply to this email and include your reference ID.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />
            <p style="margin:0;font-size:12px;color:#888;">Akshaanshh Jyotish</p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("CONTACT QUERY REPLY EMAIL SEND ERROR:", {
      error,
      email,
      queryId,
      from: getFromEmail(),
    });

    throw new Error("Unable to send contact query reply email.");
  }

  console.log("CONTACT QUERY REPLY EMAIL SENT:", {
    id: data?.id,
    email,
    queryId,
    from: getFromEmail(),
  });

  return data;
}
