import { useParams } from 'react-router-dom';
import { useQuery, getPaymentReceipt } from 'wasp/client/operations';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function BillingReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { data: payment, isLoading, error } = useQuery(getPaymentReceipt, { paymentId: id || '' });

  useEffect(() => {
    if (payment) {
      // Delay slightly to ensure rendering is complete before print dialog
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [payment]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg text-muted-foreground">Generating Receipt...</span>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold text-red-600">Error loading receipt</h1>
        <p className="text-muted-foreground">
            {error?.message || "Receipt not found or access denied."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-8 max-w-4xl mx-auto print:p-0 print:max-w-none">
      {/* Header */}
      <div className="flex justify-between items-start border-b pb-8 mb-8">
        <div>
           <div className="flex items-center gap-2 mb-2">
               {/* Logo placeholder - using text for simplicity/reliability in print */}
               <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white font-bold print:text-black print:border print:border-black print:bg-white">ST</div>
               <span className="text-2xl font-bold">SecureTag</span>
           </div>
           <p className="text-sm text-gray-500">SecureTag Inc.</p>
           <p className="text-sm text-gray-500">123 Security Way, Cyber City</p>
           <p className="text-sm text-gray-500">billing@securetag.io</p>
        </div>
        <div className="text-right">
            <h1 className="text-4xl font-light text-gray-900 mb-2">RECEIPT</h1>
            <p className="text-sm text-gray-500">Receipt #: {payment.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-sm text-gray-500">Date: {new Date(payment.createdAt).toLocaleDateString()}</p>
            {payment.paypalOrderId && (
                <p className="text-sm text-gray-500">Ref: {payment.paypalOrderId}</p>
            )}
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</h3>
        <p className="font-semibold text-lg">{payment.user?.username || 'Valued Customer'}</p>
        <p className="text-gray-600">{payment.user?.email}</p>
      </div>

      {/* Line Items */}
      <table className="w-full mb-8">
        <thead>
            <tr className="border-b-2 border-gray-100">
                <th className="text-left py-3 font-semibold text-gray-600">Description</th>
                <th className="text-right py-3 font-semibold text-gray-600">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr className="border-b border-gray-50">
                <td className="py-4">
                    <p className="font-medium text-gray-900">SecureTag Credits Purchase</p>
                    <p className="text-sm text-gray-500">
                        {payment.creditsAmount} Credits added to balance.
                    </p>
                </td>
                <td className="py-4 text-right font-medium">
                    ${payment.amount.toFixed(2)} {payment.currency}
                </td>
            </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-64">
            <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${payment.amount.toFixed(2)}</span>
            </div>
             <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Tax (0%)</span>
                <span className="font-medium">$0.00</span>
            </div>
             <div className="flex justify-between py-4">
                <span className="text-xl font-bold">Total</span>
                <span className="text-xl font-bold">${payment.amount.toFixed(2)}</span>
            </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 mt-16 print:mt-auto">
        <p>Thank you for your business!</p>
        <p>If you have any questions about this receipt, please contact support@securetag.io</p>
      </div>
    </div>
  );
}
