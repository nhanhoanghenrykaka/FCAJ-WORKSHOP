# VNPay Payment Gateway Integration Guide (React Frontend)

This guide explains how to connect a React frontend to the VNPay APIs implemented in the backend.

---

## Required Sandbox configuration

VNPay does not provide a universal secret that can be safely bundled in this project. Before the payment button can redirect successfully, copy `.env.example` to `.env` and fill in the Sandbox merchant values issued for your VNPay test account:

```env
VNPAY_TMN_CODE=your-sandbox-tmn-code
VNPAY_HASH_SECRET=your-sandbox-hash-secret
VNPAY_RETURN_URL=http://localhost/payment-result
VNPAY_IPN_URL=http://localhost/api/payment/vnpay/callback
VNPAY_API_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_USD_TO_VND_RATE=25000
```

The storefront currently stores prices in USD, but VNPay accepts VND. The backend converts the order total with `VNPAY_USD_TO_VND_RATE` and validates the same converted amount when VNPay returns the signed result.

When running only on localhost, VNPay cannot call the IPN URL from the internet. The `/payment-result` page therefore submits the signed return payload to `POST /api/payment/vnpay/return`, where the backend verifies the checksum and amount before updating the order. On a public deployment, keep the normal IPN URL configured as well.

## 1. Payment flow overview

1. The user places an order. The backend creates the order with a `PENDING` status.
2. The frontend calls **POST `/api/payment/vnpay/checkout/{orderId}`** to generate a payment link.
3. The backend returns JSON containing `payUrl`, a URL for the VNPay Sandbox.
4. The frontend redirects the user's browser to `payUrl`.
5. The user completes the payment on the VNPay Sandbox page using a VNPay test card (details below).
6. After payment, VNPay redirects the user to `VNPAY_RETURN_URL` (by default, `http://localhost:5173/payment-result`) with result query parameters.
7. At the same time, VNPay calls the backend IPN webhook at `VNPAY_IPN_URL` to update the order status asynchronously.
8. The frontend `/payment-result` page displays the result using the received query parameters.

---

## 2. VNPay Sandbox test-card details

When paying in the Sandbox environment, use the following test-card information:

- **Bank:** NCB
- **Card number:** `9704198526191432198`
- **Cardholder name:** `NGUYEN VAN A`
- **Issue date:** `07/15`
- **OTP:** `123456`

---

## 3. Calling the API from the frontend

### Step 1: Create a payment request (checkout)

When the user clicks the payment button, call the API as follows:

```javascript
import axios from 'axios';

async function handleVNPayCheckout(orderId) {
  try {
    // This API requires JWT authentication in the Authorization header.
    const token = localStorage.getItem('token');
    
    const response = await axios.post(
      `http://localhost:8080/api/payment/vnpay/checkout/${orderId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const { payUrl } = response.data;
    if (payUrl) {
      // Redirect the user to the VNPay Sandbox.
      window.location.href = payUrl;
    }
  } catch (error) {
    console.error("Failed to initialize VNPay payment:", error);
    alert("Unable to initialize the VNPay payment gateway. Please try again.");
  }
}
```

### Step 2: Receive and display the result on `PaymentResult`

Configure the React router to handle `/payment-result`. The following is an example `PaymentResult.jsx` component:

```jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing | success | failed

  const responseCode = searchParams.get('vnp_ResponseCode');
  const orderId = searchParams.get('vnp_TxnRef');
  const amount = searchParams.get('vnp_Amount');
  const transactionNo = searchParams.get('vnp_TransactionNo');

  useEffect(() => {
    if (responseCode === '00') {
      setStatus('success');
    } else {
      setStatus('failed');
    }
  }, [responseCode]);

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      {status === 'processing' && <h2>Processing transaction result...</h2>}
      
      {status === 'success' && (
        <div className="payment-success">
          <h2 style={{ color: '#2ecc71' }}>Payment successful!</h2>
          <p>Order ID: <strong>{orderId}</strong></p>
          <p>Amount: <strong>{parseInt(amount) / 100} VND</strong></p>
          <p>VNPay transaction ID: <strong>{transactionNo}</strong></p>
          <button onClick={() => navigate('/orders')}>View orders</button>
        </div>
      )}

      {status === 'failed' && (
        <div className="payment-failed">
          <h2 style={{ color: '#e74c3c' }}>Payment failed or was cancelled</h2>
          <p>Order ID: <strong>{orderId}</strong></p>
          <p>VNPay error code: <strong>{responseCode}</strong></p>
          <button onClick={() => navigate('/cart')}>Return to cart</button>
        </div>
      )}
    </div>
  );
}
```

---

## 4. Checking the synchronized status

The `/payment-result` page receives data from the client redirect. Because IPN processing may take a few seconds, the frontend can call the following API to ensure that the displayed status is accurate:

**GET `/api/orders/{orderId}`**

Use the response to retrieve the current order status from the database: `PAID`, `PENDING`, or `CANCELLED`.
