import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from './vendor/qr-code'
import InvoiceDocument from './InvoiceDocument'
import { exampleInvoice, formatMoney, loadInvoice, safeWebsite, STORAGE_KEY, totalAmount } from './invoiceData'

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 16v4h16v-4" /></svg>
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 7V4h4v3m-8 0 1 13h10l1-13M10 10v7m4-7v7" /></svg>
}

function PrintIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8V3h12v5M6 18H4V9h16v9h-2M6 14h12v7H6v-7Zm11-4h.01" /></svg>
}

function Field({ label, value, onChange, placeholder, rows, type = 'text', hint, maxLength }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {rows ? <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} maxLength={maxLength} />
      : <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} maxLength={maxLength} />}
    {hint ? <small>{hint}</small> : null}
  </div>
}

function Section({ number, title, children, className = '' }) {
  return <section className={`editor-section ${className}`}>
    <div className="section-heading"><span className="section-number">{number}</span><h2>{title}</h2></div>
    <div className="section-body">{children}</div>
  </section>
}

function invoiceFits(root) {
  if (!root) return false
  const pages = Array.from(root.querySelectorAll('.invoice-page'))
  return pages.length > 0 && pages.every((page) => {
    const contentBottom = page.querySelector('.invoice-content').getBoundingClientRect().bottom
    const footerTop = page.querySelector('.invoice-footer').getBoundingClientRect().top
    const noteBottom = page.querySelector('.approval-note').getBoundingClientRect().bottom
    const companyTop = page.querySelector('.footer-company').getBoundingClientRect().top
    const links = page.querySelector('.footer-links')
    return contentBottom <= footerTop - 8 && companyTop >= noteBottom + 8 && links.scrollWidth <= links.clientWidth + 2
  })
}

function useQrCode(url) {
  const [result, setResult] = useState({ url: '', image: '', failed: false })
  const normalized = safeWebsite(url)
  useEffect(() => {
    let active = true
    if (!normalized) {
      setResult({ url: '', image: '', failed: false })
      return undefined
    }
    setResult({ url: normalized, image: '', failed: false })
    QRCode.toDataURL(normalized, { width: 256, margin: 1, color: { dark: '#2b2159', light: '#ffffff' } })
      .then((image) => { if (active) setResult({ url: normalized, image, failed: false }) })
      .catch(() => { if (active) setResult({ url: normalized, image: '', failed: true }) })
    return () => { active = false }
  }, [normalized])
  return { qrCode: result.url === normalized ? result.image : '', qrReady: !normalized || (result.url === normalized && (!!result.image || result.failed)) }
}

export default function App() {
  const [data, setData] = useState(loadInvoice)
  const [status, setStatus] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [previewScale, setPreviewScale] = useState(1)
  const [pageHeight, setPageHeight] = useState(1056)
  const previewPanelRef = useRef(null)
  const previewRef = useRef(null)
  const exportRef = useRef(null)
  const { qrCode, qrReady } = useQrCode(data.qrUrl)
  const total = useMemo(() => totalAmount(data.services), [data.services])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* Storage can be disabled by the browser. */ }
  }, [data])

  useEffect(() => {
    const panel = previewPanelRef.current
    if (!panel) return undefined
    const update = () => setPreviewScale(Math.min(1, Math.max(0.3, (panel.clientWidth - 48) / 816)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(panel)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const page = previewRef.current
    if (!page) return undefined
    const observer = new ResizeObserver(() => setPageHeight(page.offsetHeight))
    observer.observe(page)
    setPageHeight(page.offsetHeight)
    return () => observer.disconnect()
  }, [])

  const update = (key, value) => setData((current) => ({ ...current, [key]: value }))
  const updateService = (id, key, value) => setData((current) => ({
    ...current,
    services: current.services.map((service) => service.id === id ? { ...service, [key]: value } : service),
  }))
  const addService = () => setData((current) => ({
    ...current,
    services: [...current.services, { id: crypto.randomUUID(), name: '', amount: '' }],
  }))
  const removeService = (id) => setData((current) => ({
    ...current,
    services: current.services.length > 1 ? current.services.filter((service) => service.id !== id) : current.services,
  }))

  const resetExample = () => {
    if (!window.confirm('Reset all fields to the example? This clears the draft saved in this browser.')) return
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* Storage can be disabled by the browser. */ }
    setData({ ...exampleInvoice, services: exampleInvoice.services.map((item) => ({ ...item })) })
    setStatus('Example restored. Your saved draft was cleared.')
  }

  const printPdf = () => {
    if (!qrReady) return
    if (!invoiceFits(exportRef.current)) {
      setStatus('The invoice text is too long for a Letter page. Please shorten the longer fields.')
      return
    }
    window.print()
  }

  const downloadPdf = async () => {
    if (!exportRef.current || isExporting || !qrReady) return
    setIsExporting(true)
    setStatus('Preparing your PDF…')
    try {
      await document.fonts.ready
      await Promise.all(Array.from(exportRef.current.querySelectorAll('img')).map((img) => img.decode().catch(() => undefined)))
      if (!invoiceFits(exportRef.current)) throw new Error('too-long')
      const pages = Array.from(exportRef.current.querySelectorAll('.invoice-page'))
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeightMm = pdf.internal.pageSize.getHeight()
      for (let index = 0; index < pages.length; index += 1) {
        const canvas = await html2canvas(pages[index], {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 816,
        })
        if (index > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeightMm)
      }
      const slug = (data.clientName || data.companyName || 'invoice').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      pdf.save(`invoice-${slug || 'marketus-marshal'}.pdf`)
      setStatus('PDF downloaded successfully.')
    } catch (error) {
      console.error(error)
      setStatus(error.message === 'too-long' ? 'The invoice text is too long for a Letter page. Please shorten the longer fields.' : 'PDF could not be generated. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return <div className="app-shell">
    <header className="app-header">
      <div className="header-brand"><img src={`${import.meta.env.BASE_URL}assets/corner-logo.png`} alt="" /><div><strong>Marketus Marshal</strong><span>Invoice Generator</span></div></div>
      <div className="header-actions"><span className="header-privacy">Private to your browser</span><button className="button button-primary" type="button" onClick={downloadPdf} disabled={isExporting || !qrReady}><DownloadIcon />{isExporting ? 'Generating…' : 'Download PDF'}</button></div>
    </header>

    <main className="workspace">
      <div className="editor-pane">
        <div className="editor-intro"><div><h1>Create your invoice</h1><p>Enter the details below. Your invoice updates on the right.</p></div><button className="text-button" type="button" onClick={resetExample}>Reset example</button></div>

        <Section number="01" title="Intro and services">
          <Field label="Currency" value={data.currency} onChange={(value) => update('currency', value)} maxLength={6} />
          <Field label="Invoice title" value={data.title} onChange={(value) => update('title', value)} maxLength={100} />
          <Field label="Intro message" value={data.intro} onChange={(value) => update('intro', value)} maxLength={180} />
          <div className="subheading-row"><h3>Services and charges</h3><span>{formatMoney(total, data.currency)} total</span></div>
          <div className="service-list">{data.services.map((service, index) => <div className="service-row" key={service.id}><span className="service-index">{String(index + 1).padStart(2, '0')}</span><input aria-label={`Service ${index + 1} description`} value={service.name} onChange={(event) => updateService(service.id, 'name', event.target.value)} placeholder="Service description" maxLength={130} /><input aria-label={`Service ${index + 1} amount`} value={service.amount} onChange={(event) => updateService(service.id, 'amount', event.target.value)} placeholder="Amount" inputMode="decimal" type="number" min="0" step="0.01" /><button className="icon-button" type="button" onClick={() => removeService(service.id)} disabled={data.services.length === 1} aria-label={`Remove service ${index + 1}`}><TrashIcon /></button></div>)}</div>
          <button className="button button-outline" type="button" onClick={addService}><PlusIcon />Add service</button>
        </Section>

        <Section number="02" title="Payment and bank details">
          <Field label="Section heading" value={data.paymentHeading} onChange={(value) => update('paymentHeading', value)} maxLength={120} />
          <div className="field-grid"><Field label="Account holder" value={data.accountHolder} onChange={(value) => update('accountHolder', value)} placeholder="Enter account holder" maxLength={100} /><Field label="Bank name" value={data.bankName} onChange={(value) => update('bankName', value)} placeholder="Enter bank name" maxLength={100} /></div>
          <Field label="Branch" value={data.branch} onChange={(value) => update('branch', value)} placeholder="Branch / city" maxLength={100} />
          <div className="field-grid"><Field label="Account number" value={data.accountNumber} onChange={(value) => update('accountNumber', value)} placeholder="Enter account number" maxLength={50} /><Field label="IBAN" value={data.iban} onChange={(value) => update('iban', value)} placeholder="Enter IBAN" maxLength={50} /></div>
          <div className="field-grid"><Field label="Receipt phone" value={data.receiptPhone} onChange={(value) => update('receiptPhone', value)} placeholder="Optional" maxLength={40} /><Field label="Receipt link" value={data.receiptUrl} onChange={(value) => update('receiptUrl', value)} placeholder="Optional URL" maxLength={200} /></div>
        </Section>

        <Section number="03" title="Confidentiality">
          <Field label="First point" value={data.confidentialityOne} onChange={(value) => update('confidentialityOne', value)} rows={2} maxLength={400} />
          <Field label="Second point" value={data.confidentialityTwo} onChange={(value) => update('confidentialityTwo', value)} rows={2} maxLength={400} />
          <Field label="Emphasized text" value={data.confidentialityEmphasis} onChange={(value) => update('confidentialityEmphasis', value)} rows={3} hint="Shown in red and underlined, matching the supplied PDF." maxLength={500} />
        </Section>

        <Section number="04" title="Client approval">
          <div className="field-grid"><Field label="Client name" value={data.clientName} onChange={(value) => update('clientName', value)} placeholder="Blank for handwritten signing" maxLength={100} /><Field label="Approval date" value={data.approvalDate} onChange={(value) => update('approvalDate', value)} placeholder="Blank for handwritten date" maxLength={40} /></div>
          <Field label="Signature text" value={data.signature} onChange={(value) => update('signature', value)} placeholder="Optional — leave blank for a signature" maxLength={100} />
          <Field label="Approval note" value={data.approvalNote} onChange={(value) => update('approvalNote', value)} maxLength={180} />
        </Section>

        <Section number="05" title="Company footer">
          <Field label="Mailing address" value={data.companyAddress} onChange={(value) => update('companyAddress', value)} rows={2} maxLength={220} />
          <Field label="Tagline" value={data.tagline} onChange={(value) => update('tagline', value)} maxLength={100} />
          <div className="field-grid"><Field label="Website" value={data.website} onChange={(value) => update('website', value)} maxLength={150} /><Field label="Email" value={data.email} onChange={(value) => update('email', value)} type="email" maxLength={150} /></div>
          <Field label="QR contact URL" value={data.qrUrl} onChange={(value) => update('qrUrl', value)} hint="The QR code points to this URL. Clear it to remove the QR code." maxLength={300} />
        </Section>
        <p className="privacy-note">Your draft is saved only in this browser. No invoice details are sent to a server.</p>
      </div>

      <div className="preview-pane" ref={previewPanelRef}>
        <div className="preview-toolbar"><div><strong>Live preview</strong><span>US Letter · 8.5 × 11 in</span></div><span className="preview-zoom">{Math.round(previewScale * 100)}%</span></div>
        <div className="preview-stage"><div className="preview-size" style={{ width: 816 * previewScale, height: pageHeight * previewScale }}><div className="preview-scale" style={{ transform: `scale(${previewScale})` }}><InvoiceDocument data={data} qrCode={qrCode} exportRef={previewRef} /></div></div></div>
        <div className="preview-bottom"><span role="status" aria-live="polite">{status}</span><div className="preview-actions"><button className="button button-print" type="button" onClick={printPdf} disabled={!qrReady}><PrintIcon />Print / Save PDF</button><button className="button button-primary" type="button" onClick={downloadPdf} disabled={isExporting || !qrReady}><DownloadIcon />Download PDF</button></div></div>
      </div>
    </main>

    <div className="export-capture" aria-hidden="true" inert><InvoiceDocument data={data} qrCode={qrCode} exportRef={exportRef} /></div>
  </div>
}
