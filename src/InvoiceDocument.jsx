import { formatMoney, safeWebsite, totalAmount } from './invoiceData'

const asset = (name) => `${import.meta.env.BASE_URL}assets/${name}`

function ApprovalLine({ label, value }) {
  return <div className="approval-line"><span>{label}:</span><span className="approval-rule">{value || '\u00a0'}</span></div>
}

function InvoicePage({ data, qrCode, services, pageNumber, pageCount, isLast }) {
  const total = totalAmount(data.services)
  const contactUrl = safeWebsite(data.receiptUrl)
  const websiteUrl = safeWebsite(data.website)

  return (
    <article className={`invoice-page${isLast && services.length > 1 ? ' invoice-compact' : ''}`} aria-label={`Invoice page ${pageNumber} of ${pageCount}`}>
      <img className="invoice-ribbon" src={asset('corner-ribbon.png')} alt="" />
      <img className="invoice-corner-logo" src={asset('corner-logo.png')} alt="" />
      <img className="invoice-watermark" src={asset('brand-watermark.png')} alt="" />

      <div className="invoice-content">
        <h1>{data.title || `${data.companyName} Invoice`}</h1>
        <p className="invoice-intro">{data.intro || '\u00a0'}</p>

        <table className="invoice-services">
          <thead><tr><th>Services</th><th>Charges</th></tr></thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td>{service.name || '\u00a0'}</td>
                <td>{formatMoney(Number(service.amount) || 0, data.currency)}</td>
              </tr>
            ))}
            {isLast && data.services.length > 1 ? <tr className="invoice-total-row"><td>Total</td><td>{formatMoney(total, data.currency)}</td></tr> : null}
          </tbody>
        </table>

        {isLast ? <><section className="invoice-payment">
          <h2>{data.paymentHeading}</h2>
          <p>To proceed, please make payment of <strong>({formatMoney(total, data.currency)})</strong> to the following bank details:</p>
          <div className="bank-details">
            <div>{data.accountHolder || <span className="empty-line">Account holder</span>}</div>
            <div>{[data.bankName, data.branch].filter(Boolean).join(' - ') || <span className="empty-line">Bank and branch</span>}</div>
            <div>Account Number: {data.accountNumber || <span className="empty-line">________________</span>}</div>
            <div>IBAN: {data.iban || <span className="empty-line">________________</span>}</div>
          </div>
          <p className="receipt-instructions">
            Once the payment is completed, kindly share the transaction receipt with us
            {data.receiptPhone || data.receiptUrl ? ' at ' : '.'}
            {data.receiptPhone ? <a href={`tel:${data.receiptPhone.replace(/[^+\d]/g, '')}`}>{data.receiptPhone}</a> : null}
            {data.receiptPhone && data.receiptUrl ? ' or ' : null}
            {data.receiptUrl ? <a href={contactUrl || undefined}>{data.receiptUrl}</a> : null}
          </p>
        </section>

        <section className="invoice-confidentiality">
          <h2>Confidentiality</h2>
          <ul>
            <li>{data.confidentialityOne}</li>
            <li>{data.confidentialityTwo} {data.confidentialityEmphasis ? <strong>{data.confidentialityEmphasis}</strong> : null}</li>
          </ul>
        </section>

        <div className="invoice-approval">
          <ApprovalLine label="Client Name" value={data.clientName} />
          <ApprovalLine label="Signature" value={data.signature} />
          <ApprovalLine label="Date" value={data.approvalDate} />
        </div></> : null}
      </div>

      <footer className="invoice-footer">
        <p className="approval-note">{isLast ? data.approvalNote : 'Continued on next page.'}</p>
        <div className="footer-details">
          <span className="document-page-label">Page {pageNumber} of {pageCount}</span>
          <div className="footer-company">
            <strong>{data.companyAddress}</strong>
            <span>{data.tagline}</span>
            <span className="footer-links">
              {data.website ? <a href={websiteUrl || undefined}>{data.website}</a> : null}
              {data.website && data.email ? ' | ' : null}
              {data.email ? <a href={`mailto:${data.email}`}>{data.email}</a> : null}
            </span>
          </div>
        </div>
        <img className="invoice-footer-band" src={asset('footer-band.png')} alt="" />
        {qrCode ? <div className="invoice-qr"><img src={qrCode} alt="QR code for company contact link" /><span>Let's Connect</span></div> : null}
      </footer>
    </article>
  )
}

function paginateServices(services) {
  if (services.length <= 3) return [services]
  const pages = []
  const earlier = services.slice(0, -2)
  for (let index = 0; index < earlier.length; index += 8) pages.push(earlier.slice(index, index + 8))
  pages.push(services.slice(-2))
  return pages
}

export default function InvoiceDocument({ data, qrCode, exportRef }) {
  const pages = paginateServices(data.services)
  return <div className="invoice-document" ref={exportRef}>
    {pages.map((services, index) => <InvoicePage
      key={`page-${index}`}
      data={data}
      qrCode={qrCode}
      services={services}
      pageNumber={index + 1}
      pageCount={pages.length}
      isLast={index === pages.length - 1}
    />)}
  </div>
}
