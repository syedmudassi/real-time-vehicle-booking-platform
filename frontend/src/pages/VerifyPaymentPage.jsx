import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom';
import BookingConfirmationReceipt from '../components/BookingConfirmationReceipt';

const VerifyPaymentPage = () => {
    const [statusMsg, setStatusMsg] = useState("Verifying Payment...");
    const [confirmedOrder, setConfirmedOrder] = useState(null);
    const [failed, setFailed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const search = location.search || '';

    useEffect(() => {
        let cancelled = false;

        const verifyPayment = async () => {
            const params = new URLSearchParams(search);
            const rawSession = params.get("session_id");
            const session_id = rawSession ? rawSession.trim() : null;
            const payment_status = params.get("payment_status");
            const token = localStorage.getItem("token");

            if(payment_status === "cancel") {
                navigate("/bookings", {replace: true});
                return;
            }

            if(!session_id) {
                setStatusMsg('No session id provided in the URL');
                return;
            }

            try {
                setStatusMsg('Confirming payment with server....');

                const API_BASE = 'http://localhost:5000';
                const res = await axios.get(`${API_BASE}/api/payments/confirm`, {
                    params: {session_id},
                    headers: token ? {
                        Authorization: `Bearer ${token}`
                    } : {},
                    timeout: 15000,
                }
                    );

                    if(cancelled) return;

                    if(res?.data?.success) {
                        setStatusMsg('Payment confirmed.');
                        const order = res?.data?.order || null;
                        setConfirmedOrder(order);
                        if (order) {
                            localStorage.setItem("latestConfirmedBooking", JSON.stringify(order));
                        }
                        return;
                    }
                    else{
                        const msg = res?.data?.message || 'Payment not completed.' 
                        setStatusMsg(msg);
                        setFailed(true);
                    }
            }
            catch (err) {
            console.error('Verification failed:', err);

            const status = err?.response?.status;
            const serverMsg = err?.response?.data?.message;

            if (status === 401) {
                setStatusMsg(
                    serverMsg || 'Payment session not found.'
                )
            } else if (status === 400) {
                setStatusMsg(serverMsg || 'Payment not completed');
            } else {
                setStatusMsg(serverMsg || 'There was an error');
            }
            setFailed(true);
        }
        };
        verifyPayment();
        return () => {
            cancelled = true;
        }   
    }, [search])
    return (
        <div className='min-h-screen flex items-center justify-center text-gray-900 p-4'>
            {confirmedOrder ? (
                <div className="w-full max-w-2xl">
                    <BookingConfirmationReceipt
                        booking={confirmedOrder}
                        onClose={() => navigate('/bookings', {replace: true})}
                    />
                    <div className="mt-4 flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/bookings', {replace: true})}
                            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                        >
                            Go to My Bookings
                        </button>
                    </div>
                </div>
            ) : (
                <div className='text-center max-w-lg'>
                    <p className='mb-2'>{statusMsg}</p>
                    <p className='text-sm opacity-70'>
                        {failed
                            ? "Please try again from bookings page or contact support."
                            : "Please wait while we verify your Stripe payment."}
                    </p>
                </div>
            )}
        </div>
    )
}

export default VerifyPaymentPage
