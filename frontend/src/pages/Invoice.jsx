import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Printer, ArrowLeft, X } from 'lucide-react';

const Invoice = ({ inlineBookingId, onClose }) => {
  const params = useParams();
  const id = inlineBookingId || params.id;
  const { token, API_URL } = useContext(AuthContext);
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`${API_URL}/bookings/${id}/invoice`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok) {
          setBooking(data);
        } else {
          setError(data.message || 'Failed to fetch invoice');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    if (token && id) fetchInvoice();
  }, [id, token, API_URL]);

  if (loading) {
    return (
      <div className={onClose ? "fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center" : "min-h-screen flex items-center justify-center bg-slate-50"}>
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className={onClose ? "fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center" : "min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4"}>
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full text-center">
          <p className="text-red-500 font-semibold text-sm mb-4">{error || 'Invoice not found'}</p>
          {onClose ? (
            <button onClick={onClose} className="text-slate-600 hover:underline font-medium text-sm">Close</button>
          ) : (
            <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline font-medium text-sm">Go Back</button>
          )}
        </div>
      </div>
    );
  }

  const { spaceId, seekerId } = booking;
  const owner = spaceId?.ownerId || {};
  const isModal = !!onClose;
  const invoiceNumber = booking.invoiceId || booking._id.slice(-8).toUpperCase();
  const issueDate = booking.paidAt ? new Date(booking.paidAt).toLocaleDateString('en-GB') : new Date(booking.updatedAt).toLocaleDateString('en-GB');

  const content = (
    <div className={isModal ? "relative w-full max-w-3xl bg-white shadow-2xl rounded-sm" : "max-w-3xl mx-auto bg-white shadow-xl my-10"}>
      
      {/* Action Bar (Not Printed) */}
      <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 print:hidden sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {isModal ? (
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 font-medium">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-1.5 text-sm rounded shadow-sm transition-colors">
          <Printer className="h-4 w-4" /> Print / PDF
        </button>
      </div>

      {/* Printable Invoice Container */}
      <div className="p-8 sm:p-10 font-sans text-slate-800">
        
        {/* Header - Using exact Navbar Logo styling but scaled */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 pb-6 border-b-2 border-slate-800">
          
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            {/* Exactly the navbar logo style */}
            <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white font-black text-xl leading-none">P</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold text-xl text-slate-800 tracking-tight">
                Planto<span className="text-emerald-500">park</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold -mt-0.5">
                Smart Park. Smart Earn.
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-widest">Tax Invoice</h1>
            <p className="text-slate-500 text-xs font-medium mt-1 uppercase tracking-widest">Original for Recipient</p>
          </div>
        </div>

        {/* Invoice Metadata Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          {/* Company Details (From) */}
          <div>
            <p className="font-bold text-slate-900 mb-1">PlanToPark Technologies</p>
            <p className="text-slate-600">123 Mobility Tech Park, Sector 4</p>
            <p className="text-slate-600">Hyderabad, TS 500081</p>
            <p className="text-slate-600">GSTIN: 36ABCDE1234F1Z5</p>
            <p className="text-slate-600 mt-2">Email: support@plantopark.com</p>
          </div>

          {/* Invoice Details */}
          <div className="text-right">
            <div className="inline-block text-left">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <span className="text-slate-500 font-medium">Invoice No:</span>
                <span className="font-bold text-slate-900">{invoiceNumber}</span>
                
                <span className="text-slate-500 font-medium">Issue Date:</span>
                <span className="font-medium text-slate-800">{issueDate}</span>
                
                <span className="text-slate-500 font-medium">Booking ID:</span>
                <span className="font-mono text-xs text-slate-600 pt-0.5">{booking._id.slice(-10).toUpperCase()}</span>
                
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-emerald-600">PAID</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Details (To) */}
        <div className="mb-10 p-4 bg-slate-50 border border-slate-200 rounded-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">Billed To</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold text-slate-900 text-base">{seekerId?.name || booking.seekerName}</p>
              <p className="text-slate-600 mt-0.5">Phone: {booking.seekerContact}</p>
              <p className="text-slate-600">Email: {seekerId?.email || 'N/A'}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-slate-500 font-medium mb-1">Registered Vehicle</p>
              <span className="inline-block bg-white border border-slate-300 font-mono font-bold text-slate-900 px-3 py-1 text-sm shadow-sm rounded-sm uppercase tracking-wider">
                {booking.vehicleNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Bill */}
        <div className="mb-8">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-y-2 border-slate-800 bg-white">
                <th className="py-2.5 px-2 font-bold text-slate-800 w-[10%] text-center">Sl No.</th>
                <th className="py-2.5 px-2 font-bold text-slate-800 w-[50%]">Service Description</th>
                <th className="py-2.5 px-2 font-bold text-slate-800 w-[20%] text-center">Duration</th>
                <th className="py-2.5 px-2 font-bold text-slate-800 w-[20%] text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="border-b border-slate-200">
              <tr className="border-b border-slate-100">
                <td className="py-3 px-2 text-center text-slate-600">1</td>
                <td className="py-3 px-2">
                  <p className="font-semibold text-slate-900">Parking Space Allocation</p>
                  <p className="text-xs text-slate-500 mt-0.5">{spaceId?.address}, {spaceId?.location}</p>
                  <p className="text-xs text-slate-500">Host: {owner?.name || 'Partner Host'}</p>
                </td>
                <td className="py-3 px-2 text-center text-slate-700">
                  {booking.bookingType === 'monthly' ? '1 Month' : `${booking.hours} Hours`}
                </td>
                <td className="py-3 px-2 text-right font-medium text-slate-900">
                  {(booking.totalAmount * 0.9).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-2 text-center text-slate-600">2</td>
                <td className="py-3 px-2">
                  <p className="font-semibold text-slate-900">Platform & Convenience Fee</p>
                  <p className="text-xs text-slate-500 mt-0.5">Software access & payment gateway charges</p>
                </td>
                <td className="py-3 px-2 text-center text-slate-700">—</td>
                <td className="py-3 px-2 text-right font-medium text-slate-900">
                  {(booking.totalAmount * 0.1).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Financial Totals */}
        <div className="flex justify-end mb-12">
          <div className="w-full sm:w-1/2 md:w-[40%]">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1.5 text-slate-600">Subtotal</td>
                  <td className="py-1.5 text-right font-medium text-slate-900">₹{booking.totalAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600">CGST (9%)</td>
                  <td className="py-1.5 text-right font-medium text-slate-900">Included</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600 border-b border-slate-200 pb-3">SGST (9%)</td>
                  <td className="py-1.5 text-right font-medium text-slate-900 border-b border-slate-200 pb-3">Included</td>
                </tr>
                <tr>
                  <td className="py-3 font-bold text-slate-900 text-base">Grand Total</td>
                  <td className="py-3 text-right font-bold text-slate-900 text-lg">₹{booking.totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-2 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-700 mb-1">Terms & Conditions:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
              <li>All claims are subject to Hyderabad jurisdiction.</li>
              <li>This is a computer-generated invoice.</li>
              <li>Parking is at owner's risk. PlanToPark acts only as an aggregator.</li>
            </ul>
          </div>
          <div className="text-right flex flex-col justify-end">
            <p className="font-medium text-slate-800">For PlanToPark Technologies</p>
            <p className="mt-6 border-t border-slate-300 w-32 ml-auto pt-1 text-center text-[10px]">Authorized Signatory</p>
          </div>
        </div>

      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm overflow-y-auto print:bg-white print:backdrop-blur-none">
        <div className="min-h-full w-full flex justify-center py-6 px-4 print:py-0 print:px-0">
           {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 font-sans print:bg-white">
      {content}
    </div>
  );
};

export default Invoice;
