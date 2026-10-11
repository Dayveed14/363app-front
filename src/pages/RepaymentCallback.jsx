import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, LoaderCircle } from "lucide-react";
import { api } from "../api/client";
import { usePageMeta } from "../seo/usePageMeta";

export default function RepaymentCallback() {
  usePageMeta({
    title: "Verify Repayment",
    description: "Verifying your finance facility repayment.",
    indexable: false,
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reference =
    searchParams.get("reference") || searchParams.get("trxref");

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Confirming your payment...");
  const [facilityId, setFacilityId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function verifyPayment() {
      if (!reference) {
        setStatus("error");
        setMessage("No payment reference was provided.");
        return;
      }

      try {
        const response =
          await api.financeFacilityRepayments.verify(reference);

        if (response?.success === false) {
          throw new Error(
            response?.message || "Payment verification failed."
          );
        }

        const data = response?.data ?? response;

        const returnedFacilityId =
          data?.facilityId ??
          data?.facility?.id ??
          data?.repayment?.facilityId ??
          data?.repayment?.facility_id;

        if (cancelled) return;

        setStatus("success");
        setMessage(
          "Your payment has been verified. Your repayment records will now be refreshed."
        );

        if (returnedFacilityId) {
          setFacilityId(returnedFacilityId);

          window.setTimeout(() => {
            if (!cancelled) {
              navigate(
                `/finance-facility-repayments/${returnedFacilityId}`,
                { replace: true }
              );
            }
          }, 1500);
        } else {
          setMessage(
            "Your payment has been verified. Return to your dashboard to view your updated repayment balance."
          );
        }
      } catch (error) {
        if (cancelled) return;

        setStatus("error");
        setMessage(
          error?.message ||
            "We could not verify this payment. Please check your repayment history before trying again."
        );
      }
    }

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [reference, navigate]);

  return (
    <main className="form-page" style={{ maxWidth: 600, margin: "60px auto" }}>
      <section
        style={{
          padding: 32,
          textAlign: "center",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
        }}
      >
        {status === "verifying" && (
          <LoaderCircle
            size={42}
            className="repayment-spinner"
            style={{ margin: "0 auto 18px" }}
          />
        )}

        {status === "success" && (
          <CheckCircle2
            size={42}
            color="#16a34a"
            style={{ margin: "0 auto 18px" }}
          />
        )}

        {status === "error" && (
          <XCircle
            size={42}
            color="#dc2626"
            style={{ margin: "0 auto 18px" }}
          />
        )}

        <h1 style={{ fontSize: 24, marginBottom: 12 }}>
          {status === "verifying"
            ? "Verifying payment"
            : status === "success"
              ? "Payment verified"
              : "Payment verification issue"}
        </h1>

        <p style={{ color: "#64748b", lineHeight: 1.7 }}>
          {message}
        </p>

        {reference && (
          <p style={{ fontSize: 12, overflowWrap: "anywhere" }}>
            Reference: {reference}
          </p>
        )}

        {status !== "verifying" && (
          <div style={{ marginTop: 24 }}>
            {facilityId ? (
              <Link to={`/finance-facility-repayments/${facilityId}`}>
                View repayment plan
              </Link>
            ) : (
              <Link to="/">Return to dashboard</Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
