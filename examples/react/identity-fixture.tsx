import { createRoot } from 'react-dom/client';
import { forwardRef, memo } from 'react';
import { Noktiq } from 'noktiq/react';

const PaymentButton = memo(forwardRef<HTMLButtonElement>(function PaymentButton(_, ref) {
  return <button ref={ref} id=":r-generated:" data-testid="checkout-pay" className="pay-button" aria-label="Complete payment">
    <span>Pay now</span>
  </button>;
}));

function PaymentForm() {
  return <section><PaymentButton/><PaymentButton/></section>;
}

function CheckoutPage() {
  return <main><h1>Identity fixture</h1><PaymentForm/><Noktiq enabled={import.meta.env.DEV}/></main>;
}

createRoot(document.getElementById('fixture')!).render(<CheckoutPage/>);
