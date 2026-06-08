/** Loads Razorpay Checkout script once (used after server-backed order creation). */
export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (globalThis.Razorpay) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load Razorpay checkout.'))
    document.body.appendChild(s)
  })
}
