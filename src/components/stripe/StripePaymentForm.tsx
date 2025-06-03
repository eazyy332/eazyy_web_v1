import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CardElement, 
  useStripe, 
  useElements, 
  IdealBankElement,
  PaymentRequestButtonElement
} from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

interface StripePaymentFormProps {
  clientSecret: string;
  amount: number;
  orderNumber: string;
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: Error) => void;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  clientSecret,
  amount,
  orderNumber,
  onSuccess,
  onError
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [idealComplete, setIdealComplete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ideal' | 'apple-pay'>('card');
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
  });
  const [paymentRequest, setPaymentRequest] = useState<any>(null);

  useEffect(() => {
    if (stripe) {
      const pr = stripe.paymentRequest({
        country: 'NL',
        currency: 'eur',
        total: {
          label: `Order #${orderNumber}`,
          amount: Math.round(amount * 100), // Convert to cents
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      // Check if the Payment Request is available
      pr.canMakePayment().then(result => {
        if (result) {
          setPaymentRequest(pr);
        }
      });

      // Handle payment method
      pr.on('paymentmethod', async (e) => {
        setProcessing(true);
        
        try {
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            clientSecret,
            { payment_method: e.paymentMethod.id },
            { handleActions: false }
          );

          if (confirmError) {
            e.complete('fail');
            setError(confirmError.message || 'Payment failed');
            setProcessing(false);
            return;
          }

          e.complete('success');
          
          if (paymentIntent.status === 'requires_action') {
            // Let Stripe handle the rest of the payment flow
            const { error } = await stripe.confirmCardPayment(clientSecret);
            if (error) {
              setError(error.message || 'Payment failed');
              setProcessing(false);
              return;
            }
          }

          setSucceeded(true);
          if (onSuccess) onSuccess(paymentIntent.id);
          
          // Navigate to success page
          navigate('/checkout/success', {
            state: {
              orderNumber,
              totalAmount: amount,
              estimatedDelivery: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
            }
          });
        } catch (err) {
          console.error('Payment error:', err);
          setError('An unexpected error occurred. Please try again.');
          if (onError) onError(err as Error);
        }
        
        setProcessing(false);
      });
    }
  }, [stripe, amount, orderNumber, clientSecret, navigate, onSuccess, onError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    if (paymentMethod === 'card' && !cardComplete) {
      setError('Please complete your card details');
      return;
    }

    if (paymentMethod === 'ideal' && !idealComplete) {
      setError('Please select your bank');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      let result;

      if (paymentMethod === 'card') {
        const cardElement = elements.getElement(CardElement);
        
        if (!cardElement) {
          setError('Card element not found');
          setProcessing(false);
          return;
        }

        result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: billingDetails
          }
        });
      } else if (paymentMethod === 'ideal') {
        const idealElement = elements.getElement(IdealBankElement);
        
        if (!idealElement) {
          setError('iDEAL element not found');
          setProcessing(false);
          return;
        }

        result = await stripe.confirmIdealPayment(clientSecret, {
          payment_method: {
            ideal: idealElement,
            billing_details: {
              name: '', // No name for iDEAL
              email: '' // No email for iDEAL
            }
          },
          return_url: `${window.location.origin}/checkout/success`
        });
      }

      if (result?.error) {
        setError(result.error.message || 'An error occurred during payment');
        if (onError) onError(new Error(result.error.message || 'Payment failed'));
      } else if (result?.paymentIntent?.status === 'succeeded') {
        setSucceeded(true);
        if (onSuccess) onSuccess(result.paymentIntent.id);
        
        // Navigate to success page
        navigate('/checkout/success', {
          state: {
            orderNumber,
            totalAmount: amount,
            estimatedDelivery: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
          }
        });
      } else if (result?.paymentIntent?.status === 'processing') {
        // For iDEAL, the payment will be in processing state and will redirect
        console.log('Payment processing, redirecting...');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An unexpected error occurred. Please try again.');
      if (onError) onError(err as Error);
    }

    setProcessing(false);
  };

  const cardElementOptions = {
    style: {
      base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    }
  };

  const idealElementOptions = {
    style: {
      base: {
        padding: '10px 12px',
        color: '#32325d',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  };

  const paymentRequestOptions = {
    style: {
      paymentRequestButton: {
        type: 'default', // 'default' | 'donate' | 'buy'
        theme: 'dark', // 'dark' | 'light' | 'outline'
        height: '48px',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Apple Pay / Google Pay */}
      {paymentRequest && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Express Checkout
          </label>
          <div className="p-0 rounded-xl">
            <PaymentRequestButtonElement
              options={{
                paymentRequest,
                style: paymentRequestOptions.style,
              }}
            />
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            Or pay with card or iDEAL
          </div>
        </div>
      )}

      {/* Payment Method Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`flex items-center justify-center p-4 rounded-xl border ${
              paymentMethod === 'card' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 bg-white hover:bg-gray-50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CreditCard className={`w-6 h-6 mr-2 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-500'}`} />
            <span className={paymentMethod === 'card' ? 'font-medium text-blue-700' : 'text-gray-700'}>
              Credit Card
            </span>
          </motion.button>
          
          <motion.button
            type="button"
            onClick={() => setPaymentMethod('ideal')}
            className={`flex items-center justify-center p-4 rounded-xl border ${
              paymentMethod === 'ideal' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 bg-white hover:bg-gray-50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className={paymentMethod === 'ideal' ? 'font-medium text-blue-700' : 'text-gray-700'}>
              iDEAL
            </span>
          </motion.button>
        </div>
      </div>

      {/* Card details */}
      <div className="space-y-4">
        {paymentMethod === 'card' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Details
            </label>
            <div className="p-4 border border-gray-300 rounded-xl bg-white">
              <CardElement 
                options={cardElementOptions}
                onChange={(e) => setCardComplete(e.complete)}
              />
            </div>
          </div>
        )}

        {paymentMethod === 'ideal' && (
          <div>
            <div className="p-4 border border-gray-300 rounded-xl bg-white">
              <IdealBankElement 
                options={idealElementOptions}
                onChange={(e) => setIdealComplete(e.complete)}
              />
            </div>
          </div>
        )}

        {/* Only show name and email fields for card payments */}
        {paymentMethod === 'card' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name on Card
              </label>
              <input
                type="text"
                value={billingDetails.name}
                onChange={(e) => setBillingDetails({...billingDetails, name: e.target.value})}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                placeholder="Enter cardholder name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={billingDetails.email}
                onChange={(e) => setBillingDetails({...billingDetails, email: e.target.value})}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                placeholder="Enter email address"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-800 mb-1">Payment Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {succeeded && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-green-800 mb-1">Payment Successful</h3>
              <p className="text-green-700 text-sm">Your payment has been processed successfully.</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment button */}
      <motion.button
        type="submit"
        disabled={!stripe || processing || succeeded}
        className={`w-full flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
          !stripe || processing || succeeded
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-blue-600 text-white shadow-lg hover:shadow-xl'
        }`}
        whileHover={!stripe || processing || succeeded ? {} : { scale: 1.02 }}
        whileTap={!stripe || processing || succeeded ? {} : { scale: 0.98 }}
      >
        {processing ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
            Processing...
          </div>
        ) : succeeded ? (
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Payment Successful
          </div>
        ) : (
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Pay €{amount.toFixed(2)}
          </div>
        )}
      </motion.button>
    </form>
  );
};

export default StripePaymentForm;
