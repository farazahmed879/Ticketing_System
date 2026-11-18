import React from "react";
import {
  amountInWords,
  fmtDate,
  fmtMoney,
  fmtMonth,
  sumItems,
  type CompanyProfile,
  type DocData,
  withBrandDefaults,
  type DocumentType,
  type LineItem,
} from "./documentConfig";

/**
 * The printable A4 document. Inline styles only, and always light (it is a
 * sheet of paper), because the same markup is rendered into a bare print
 * iframe by printDocument() — no app CSS is available there.
 */
export interface DocumentPaperProps {
  type: DocumentType;
  recipientName: string;
  data: DocData;
  company: CompanyProfile;
}

const INK = "#1f2937";
const MUTED = "#6b7280";
const RULE = "#e5e7eb";
const ACCENT = "#0ca539"; // Jami Partners brand green (insignia gradient)

const s = {
  page: {
    width: "210mm",
    minHeight: "297mm",
    boxSizing: "border-box",
    padding: "16mm 18mm",
    background: "#ffffff",
    color: INK,
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: "10.5pt",
    lineHeight: 1.6,
    display: "flex",
    flexDirection: "column",
  } as React.CSSProperties,
  head: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    paddingBottom: 12,
    borderBottom: `3px solid ${ACCENT}`,
  } as React.CSSProperties,
  logo: { maxHeight: 60, maxWidth: 160, objectFit: "contain" } as React.CSSProperties,
  companyName: { fontSize: "17pt", fontWeight: 700, margin: 0, lineHeight: 1.2 } as React.CSSProperties,
  companyMeta: { fontSize: "8.5pt", color: MUTED, margin: "2px 0 0" } as React.CSSProperties,
  title: {
    textAlign: "center",
    fontSize: "13pt",
    fontWeight: 700,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    margin: "22px 0 18px",
  } as React.CSSProperties,
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "9.5pt",
    color: MUTED,
    marginTop: 18,
  } as React.CSSProperties,
  p: { margin: "0 0 11px", textAlign: "justify" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" } as React.CSSProperties,
  th: {
    textAlign: "left",
    background: "#f3f4f6",
    padding: "6px 8px",
    border: `1px solid ${RULE}`,
    fontWeight: 600,
  } as React.CSSProperties,
  td: { padding: "6px 8px", border: `1px solid ${RULE}`, verticalAlign: "top" } as React.CSSProperties,
  footer: {
    marginTop: "auto",
    paddingTop: 10,
    borderTop: `1px solid ${RULE}`,
    fontSize: "8pt",
    color: MUTED,
    textAlign: "center",
  } as React.CSSProperties,
};

const tdR: React.CSSProperties = { ...s.td, textAlign: "right", whiteSpace: "nowrap" };
const label: React.CSSProperties = { ...s.td, color: MUTED, width: "22%" };

/** Paragraphs from free text: blank lines split paragraphs, single newlines break lines. */
const Paras: React.FC<{ text?: string }> = ({ text }) => (
  <>
    {(text || "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p, i) => (
        <p key={i} style={{ ...s.p, whiteSpace: "pre-line" }}>
          {p}
        </p>
      ))}
  </>
);

const Letterhead: React.FC<{ c: CompanyProfile }> = ({ c }) => {
  const contact = [c.phone, c.email, c.website].filter(Boolean).join("  •  ");
  return (
    <div style={s.head}>
      {c.logo && <img src={c.logo} alt="" style={s.logo} />}
      <div style={{ flex: 1 }}>
        <h1 style={s.companyName}>{c.name || "Your Company Name"}</h1>
        {c.address && <p style={{ ...s.companyMeta, whiteSpace: "pre-line" }}>{c.address}</p>}
        {contact && <p style={s.companyMeta}>{contact}</p>}
      </div>
    </div>
  );
};

const Signature: React.FC<{ c: CompanyProfile; closing?: string }> = ({ c, closing = "Sincerely," }) => (
  <div style={{ marginTop: 30, breakInside: "avoid" }}>
    <p style={{ margin: "0 0 6px" }}>{closing}</p>
    {c.signature ? (
      <img src={c.signature} alt="" style={{ maxHeight: 55, maxWidth: 180, display: "block" }} />
    ) : (
      <div style={{ height: 40 }} />
    )}
    <div style={{ borderTop: `1px solid ${INK}`, width: 200, paddingTop: 4 }}>
      <strong>{c.signatoryName || "Authorized Signatory"}</strong>
      {c.signatoryTitle && <div style={{ color: MUTED, fontSize: "9.5pt" }}>{c.signatoryTitle}</div>}
      {c.name && <div style={{ color: MUTED, fontSize: "9.5pt" }}>{c.name}</div>}
    </div>
  </div>
);

const RefDate: React.FC<{ d: DocData }> = ({ d }) => (
  <div style={s.metaRow}>
    <span>{d.refNo ? `Ref: ${d.refNo}` : ""}</span>
    <span>Date: {fmtDate(d.date)}</span>
  </div>
);

const Recipient: React.FC<{ name: string; d: DocData }> = ({ name, d }) => (
  <div style={{ margin: "16px 0 14px" }}>
    <strong>{name}</strong>
    {d.designation && <div>{d.designation}</div>}
    {d.recipientAddress && (
      <div style={{ whiteSpace: "pre-line", color: MUTED }}>{d.recipientAddress}</div>
    )}
  </div>
);

const Subject: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ ...s.p, fontWeight: 700, textDecoration: "underline" }}>Subject: {children}</p>
);

const companyName = (c: CompanyProfile) => c.name || "the Company";
/** Company name ending a sentence — no "Ltd.." when the name already ends in a period. */
const companyEnd = (c: CompanyProfile) => companyName(c).replace(/\.?$/, ".");
const dept = (d: DocData) => (d.department ? ` in the ${d.department} department` : "");

// ------------------------------------------------------------------ bodies

const Payslip: React.FC<DocumentPaperProps> = ({ recipientName, data: d, company: c }) => {
  const earnings: LineItem[] = (d.earnings || []).filter((i: LineItem) => i.label || i.amount);
  const deductions: LineItem[] = (d.deductions || []).filter((i: LineItem) => i.label || i.amount);
  const gross = sumItems(earnings);
  const ded = sumItems(deductions);
  const net = gross - ded;
  const rows = Math.max(earnings.length, deductions.length, 1);
  const info: [string, string | undefined][] = [
    ["Employee Name", recipientName],
    ["Employee ID", d.employeeId],
    ["Designation", d.designation],
    ["Department", d.department],
    ["CNIC", d.cnic],
    ["Pay Date", d.payDate ? fmtDate(d.payDate) : undefined],
    ["Bank", d.bankName],
    ["Account / IBAN", d.accountNo],
    ["Working Days", d.workingDays?.toString()],
    ["Paid Days", d.paidDays?.toString()],
  ];
  const shown = info.filter(([, v]) => v);
  const pairs: [string, string | undefined][][] = [];
  for (let i = 0; i < shown.length; i += 2) pairs.push(shown.slice(i, i + 2));

  return (
    <>
      <h2 style={{ ...s.title, marginBottom: 4 }}>Pay Slip</h2>
      <p style={{ textAlign: "center", color: MUTED, margin: "0 0 18px" }}>
        {/* The pay month is the payment date's month (older slips stored a
            separate payPeriod). */}
        For the month of {fmtMonth(d.payPeriod || d.payDate?.slice(0, 7))}
      </p>

      <table style={{ ...s.table, marginBottom: 16 }}>
        <tbody>
          {pairs.map((pair, i) => (
            <tr key={i}>
              {pair.map(([k, v]) => (
                <React.Fragment key={k}>
                  <td style={label}>{k}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{v}</td>
                </React.Fragment>
              ))}
              {pair.length === 1 && <td colSpan={2} style={s.td} />}
            </tr>
          ))}
        </tbody>
      </table>

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Earnings</th>
            <th style={{ ...s.th, textAlign: "right" }}>Amount</th>
            <th style={s.th}>Deductions</th>
            <th style={{ ...s.th, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td style={s.td}>{earnings[i]?.label}</td>
              <td style={tdR}>{earnings[i] ? fmtMoney(earnings[i].amount) : ""}</td>
              <td style={s.td}>{deductions[i]?.label}</td>
              <td style={tdR}>{deductions[i] ? fmtMoney(deductions[i].amount) : ""}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700, background: "#f9fafb" }}>
            <td style={s.td}>Gross Earnings</td>
            <td style={tdR}>{fmtMoney(gross)}</td>
            <td style={s.td}>Total Deductions</td>
            <td style={tdR}>{fmtMoney(ded)}</td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          border: `2px solid ${ACCENT}`,
          borderRadius: 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: "9pt", color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>
            Net Pay
          </div>
          <div style={{ fontSize: "9.5pt" }}>
            {d.currency} {amountInWords(net)} only
          </div>
        </div>
        <div style={{ fontSize: "16pt", fontWeight: 700, whiteSpace: "nowrap" }}>
          {fmtMoney(net, d.currency)}
        </div>
      </div>

      {d.notes && (
        <div style={{ marginTop: 14, fontSize: "9.5pt" }}>
          <strong>Notes: </strong>
          <span style={{ whiteSpace: "pre-line" }}>{d.notes}</span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <Signature c={c} closing="" />
        <p style={{ fontSize: "8.5pt", color: MUTED, maxWidth: 260, textAlign: "right" }}>
          This is a computer-generated pay slip issued by {companyEnd(c)}
        </p>
      </div>
    </>
  );
};

const OfferLetter: React.FC<DocumentPaperProps> = ({ recipientName, data: d, company: c }) => (
  <>
    <RefDate d={d} />
    <Recipient name={recipientName} d={{ ...d, designation: undefined }} />
    <Subject>Offer of Employment – {d.designation}</Subject>
    <p style={s.p}>Dear {recipientName},</p>
    <p style={s.p}>
      We are pleased to offer you the position of <strong>{d.designation}</strong>
      {dept(d)} at {companyEnd(c)} We were impressed by your background and believe you
      will be a valuable addition to our team.
    </p>
    <table style={{ ...s.table, margin: "4px 0 14px" }}>
      <tbody>
        <tr><td style={label}>Position</td><td style={s.td}>{d.designation}</td></tr>
        {d.employmentType && <tr><td style={label}>Employment Type</td><td style={s.td}>{d.employmentType}</td></tr>}
        <tr><td style={label}>Joining Date</td><td style={s.td}>{fmtDate(d.joiningDate)}</td></tr>
        <tr><td style={label}>Monthly Gross Salary</td><td style={s.td}>{fmtMoney(d.salary, d.currency)}</td></tr>
        {d.probationMonths ? <tr><td style={label}>Probation</td><td style={s.td}>{d.probationMonths} month(s)</td></tr> : null}
        {d.workLocation && <tr><td style={label}>Work Location</td><td style={s.td}>{d.workLocation}</td></tr>}
        {d.reportingTo && <tr><td style={label}>Reporting To</td><td style={s.td}>{d.reportingTo}</td></tr>}
      </tbody>
    </table>
    <Paras text={d.additionalTerms} />
    <p style={s.p}>
      This offer is subject to verification of your documents and credentials.
      {d.acceptBy
        ? ` Please confirm your acceptance by signing and returning a copy of this letter on or before ${fmtDate(d.acceptBy)}.`
        : " Please confirm your acceptance by signing and returning a copy of this letter."}
    </p>
    <p style={s.p}>We look forward to welcoming you aboard.</p>
    <Signature c={c} />
    <div style={{ marginTop: 26, fontSize: "9.5pt", breakInside: "avoid" }}>
      <strong>Acceptance</strong>
      <p style={{ margin: "4px 0 22px" }}>
        I, {recipientName}, accept the above offer on the terms and conditions stated.
      </p>
      Signature: ____________________ &nbsp;&nbsp; Date: ____________
    </div>
  </>
);

const AppointmentLetter: React.FC<DocumentPaperProps> = ({ recipientName, data: d, company: c }) => (
  <>
    <RefDate d={d} />
    <Recipient name={recipientName} d={{ ...d, designation: undefined }} />
    <Subject>Letter of Appointment</Subject>
    <p style={s.p}>Dear {recipientName},</p>
    <p style={s.p}>
      With reference to your application and subsequent interviews, we are pleased to appoint you
      as <strong>{d.designation}</strong>{dept(d)} at {companyName(c)}, effective{" "}
      {fmtDate(d.joiningDate)}, on the following terms and conditions:
    </p>
    <ol style={{ margin: "0 0 12px", paddingLeft: 22 }}>
      <li style={{ marginBottom: 6 }}>
        <strong>Remuneration:</strong> Your monthly gross salary will be {fmtMoney(d.salary, d.currency)}
        , subject to applicable taxes and deductions.
      </li>
      {d.probationMonths ? (
        <li style={{ marginBottom: 6 }}>
          <strong>Probation:</strong> You will be on probation for {d.probationMonths} month(s), after
          which your employment will be confirmed subject to satisfactory performance.
        </li>
      ) : null}
      {d.workingHours && (
        <li style={{ marginBottom: 6 }}>
          <strong>Working Hours:</strong> {d.workingHours}.
        </li>
      )}
      {d.noticePeriod && (
        <li style={{ marginBottom: 6 }}>
          <strong>Notice Period:</strong> Either party may end this employment by giving{" "}
          {d.noticePeriod} of written notice, or salary in lieu thereof.
        </li>
      )}
      <li style={{ marginBottom: 6 }}>
        <strong>Confidentiality:</strong> You will keep all company and client information strictly
        confidential, during and after your employment.
      </li>
      <li style={{ marginBottom: 6 }}>
        <strong>Policies:</strong> You will abide by the company's rules, policies and code of conduct
        as amended from time to time.
      </li>
    </ol>
    <Paras text={d.additionalTerms} />
    <p style={s.p}>We welcome you to {companyName(c)} and wish you a rewarding career with us.</p>
    <Signature c={c} />
  </>
);

const ExperienceLetter: React.FC<DocumentPaperProps> = ({ recipientName, data: d, company: c }) => (
  <>
    <RefDate d={d} />
    <h2 style={s.title}>Experience Certificate</h2>
    <p style={{ ...s.p, fontWeight: 600 }}>To Whom It May Concern</p>
    <p style={s.p}>
      This is to certify that <strong>{recipientName}</strong>
      {d.cnic ? ` (CNIC: ${d.cnic})` : ""} was employed with {companyName(c)} as{" "}
      <strong>{d.designation}</strong>{dept(d)} from <strong>{fmtDate(d.joiningDate)}</strong> to{" "}
      <strong>{fmtDate(d.lastWorkingDate)}</strong>.
    </p>
    <Paras text={d.remarks} />
    <p style={s.p}>This certificate is issued upon request without any liability on the part of the company.</p>
    <Signature c={c} />
  </>
);

const SalaryCertificate: React.FC<DocumentPaperProps> = ({ recipientName, data: d, company: c }) => (
  <>
    <RefDate d={d} />
    <h2 style={s.title}>Salary Certificate</h2>
    <p style={{ ...s.p, fontWeight: 600 }}>{d.addressedTo || "To Whom It May Concern"}</p>
    <p style={s.p}>
      This is to certify that <strong>{recipientName}</strong>
      {d.cnic ? ` (CNIC: ${d.cnic})` : ""} is employed with {companyName(c)} as{" "}
      <strong>{d.designation}</strong>{dept(d)} since <strong>{fmtDate(d.joiningDate)}</strong>.
    </p>
    <p style={s.p}>
      Their current monthly gross salary is <strong>{fmtMoney(d.salary, d.currency)}</strong> (
      {d.currency} {amountInWords(d.salary)} only).
    </p>
    <p style={s.p}>
      This certificate is issued on the employee's request
      {d.purpose ? ` for the purpose of ${d.purpose}` : ""} and does not constitute any guarantee or
      liability on the part of the company.
    </p>
    <Signature c={c} />
  </>
);

const RelievingLetter: React.FC<DocumentPaperProps> = ({ recipientName, data: d, company: c }) => (
  <>
    <RefDate d={d} />
    <Recipient name={recipientName} d={d} />
    <Subject>Relieving Letter</Subject>
    <p style={s.p}>Dear {recipientName},</p>
    <p style={s.p}>
      {d.resignationDate
        ? `With reference to your resignation dated ${fmtDate(d.resignationDate)}, this`
        : "This"}{" "}
      is to confirm that you have been relieved of your duties as <strong>{d.designation}</strong>
      {dept(d)} at {companyName(c)} with effect from the close of business on{" "}
      <strong>{fmtDate(d.lastWorkingDate)}</strong>.
    </p>
    <p style={s.p}>
      Your period of service with us was from {fmtDate(d.joiningDate)} to{" "}
      {fmtDate(d.lastWorkingDate)}.
    </p>
    <Paras text={d.remarks} />
    <Signature c={c} />
  </>
);

const WarningLetter: React.FC<DocumentPaperProps> = ({ recipientName, data: d, company: c }) => (
  <>
    <RefDate d={d} />
    <Recipient name={recipientName} d={d} />
    <Subject>{d.subject || "Written Warning"}</Subject>
    <p style={s.p}>Dear {recipientName},</p>
    <p style={s.p}>
      This letter serves as a formal written warning
      {d.incidentDate ? ` regarding the matter that occurred on ${fmtDate(d.incidentDate)}` : ""}.
    </p>
    <Paras text={d.details} />
    <Paras text={d.expectation} />
    <p style={s.p}>
      A copy of this letter will be placed in your personnel file. Please sign below to acknowledge
      receipt.
    </p>
    <Signature c={c} />
    <div style={{ marginTop: 26, fontSize: "9.5pt", breakInside: "avoid" }}>
      <strong>Acknowledgement</strong>
      <p style={{ margin: "4px 0 22px" }}>I acknowledge that I have received this letter.</p>
      Signature: ____________________ &nbsp;&nbsp; Date: ____________
    </div>
  </>
);

const CustomLetter: React.FC<DocumentPaperProps> = ({ recipientName, data: d, company: c }) => (
  <>
    <RefDate d={d} />
    <Recipient name={recipientName} d={d} />
    {d.subject && <Subject>{d.subject}</Subject>}
    <p style={s.p}>{d.salutation || `Dear ${recipientName},`}</p>
    <Paras text={d.body} />
    <Signature c={c} />
  </>
);

const BODIES: Record<DocumentType, React.FC<DocumentPaperProps>> = {
  payslip: Payslip,
  offer_letter: OfferLetter,
  appointment_letter: AppointmentLetter,
  experience_letter: ExperienceLetter,
  salary_certificate: SalaryCertificate,
  relieving_letter: RelievingLetter,
  warning_letter: WarningLetter,
  custom: CustomLetter,
};

const DocumentPaper: React.FC<DocumentPaperProps> = (props) => {
  const Body = BODIES[props.type] || CustomLetter;
  // Empty name/logo fall back to the Jami Partners branding.
  const company = withBrandDefaults(props.company);
  return (
    <div style={s.page} className="hr-document-page">
      <Letterhead c={company} />
      <div style={{ flex: 1 }}>
        <Body {...props} data={props.data || {}} company={company} />
      </div>
      {company.footerNote && <div style={s.footer}>{company.footerNote}</div>}
    </div>
  );
};

export default DocumentPaper;
