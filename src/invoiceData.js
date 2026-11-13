export const STORAGE_KEY = 'marketus-marshal-invoice-draft-v1'

export const exampleInvoice = {
  companyName: 'Marketus Marshal',
  title: 'Marketus Marshal Invoice',
  intro: 'Thank you for choosing our services',
  currency: 'PKR',
  services: [{ id: 'service-1', name: 'Website Optimization', amount: '40000' }],
  paymentHeading: 'Step 1: Contract Confirmation & Payment',
  accountHolder: '',
  bankName: '',
  branch: '',
  accountNumber: '',
  iban: '',
  receiptPhone: '',
  receiptUrl: '',
  confidentialityOne: 'All client information, account details, and marketing strategies will be kept strictly confidential.',
  confidentialityTwo: 'We will not share your data with any third parties without your consent and',
  confidentialityEmphasis: 'we want you to not to share our company details as of now in Pakistan / Qatar with anyone without our prior consent.',
  clientName: '',
  signature: '',
  approvalDate: '',
  approvalNote: ':-Digital Approved Invoice from Marketus Marshal.',
  companyAddress: '1209 MOUNTAIN ROAD PL NEW MEXICO AL BUQUERQUE. United States (US)',
  tagline: 'Providing Services Worldwide',
  website: 'www.marketusmarshal.com',
  email: 'connect@marketusmarshal.com',
  qrUrl: 'https://marketusmarshal.com/',
}

export function loadInvoice() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!stored || !Array.isArray(stored.services)) return exampleInvoice
    return { ...exampleInvoice, ...stored }
  } catch {
    return exampleInvoice
  }
}

export function totalAmount(services) {
  return services.reduce((total, service) => total + (Number(service.amount) || 0), 0)
}

export function formatMoney(amount, currency) {
  const code = (currency || 'PKR').trim().toUpperCase()
  const number = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${code} ${number}`
}

export function safeWebsite(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}
