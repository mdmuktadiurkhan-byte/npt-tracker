// /app/status-toggle/page.js
'use client';

import { useState } from 'react';

export default function StatusToggle() {
  const [isOn, setIsOn] = useState(false);
  const [machineNumber, setMachineNumber] = useState(''); // মেশিন নম্বরের জন্য স্টেট
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleToggle = async () => {
    // মেশিন নম্বর ইনপুট দেওয়া হয়েছে কিনা তা চেক করা হচ্ছে
    if (!machineNumber.trim()) {
      setMessage('Error: Please enter a machine number first.');
      return;
    }

    setLoading(true);
    setMessage('');
    
    const nextStatus = !isOn; 

    try {
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          statusValue: nextStatus,
          machineNumber: machineNumber // এপিআই-তে পাঠানো হচ্ছে
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsOn(nextStatus); 
        setMessage(`Success: Machine ${machineNumber} turned ${nextStatus ? 'ON' : 'OFF'}`);
      } else {
        setMessage(`Error: ${result.message}`);
      }
    } catch (error) {
      setMessage('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Next.js MongoDB Status Controller</h2>
      
      {/* মেশিন নম্বর ইনপুট ফিল্ড */}
      <div style={{ margin: '20px 0' }}>
        <label htmlFor="machineInput" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Machine Number:
        </label>
        <input
          id="machineInput"
          type="text"
          placeholder="Enter Machine Number (e.g. M-01)"
          value={machineNumber}
          onChange={(e) => setMachineNumber(e.target.value)}
          style={{
            padding: '10px',
            fontSize: '16px',
            borderRadius: '5px',
            border: '1px solid #ccc',
            width: '100%',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ margin: '20px 0' }}>
        <p>Current Status: <strong>{isOn ? 'ON' : 'OFF'}</strong></p>
        
        <button
          onClick={handleToggle}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: isOn ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            width: '100%',
            transition: 'background-color 0.3s'
          }}
        >
          {loading ? 'Updating...' : `Turn ${isOn ? 'OFF' : 'ON'}`}
        </button>
      </div>

      {message && (
        <p style={{ color: message.startsWith('Success') ? 'green' : 'red', fontWeight: 'bold' }}>
          {message}
        </p>
      )}
    </div>
  );
}