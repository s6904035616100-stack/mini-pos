'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function HistoryPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ดึงประวัติการขายทั้งหมด เรียงจากล่าสุดไปเก่าสุด
  const fetchSales = async () => {
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false });

    if (error) {
      setErrorMsg('โหลดประวัติการขายไม่สำเร็จ: ' + error.message);
    } else {
      setSales(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // ยอดขายรวมทั้งหมด = ผลรวมของ total_price ทุกแถว
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_price), 0);

  // แปลง timestamp เป็นรูปแบบวันเวลาที่อ่านง่าย (locale ไทย)
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div>
      <h1>ประวัติการขาย</h1>

      {errorMsg && (
        <div className="card" style={{ color: '#b91c1c', borderColor: '#fecaca' }}>
          {errorMsg}
        </div>
      )}

      {/* สรุปยอดขายรวมทั้งหมด */}
      <div className="card" style={{ backgroundColor: '#f9fafb' }}>
        <strong>ยอดขายรวมทั้งหมด: {totalRevenue.toFixed(2)} บาท</strong>
        <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '4px' }}>
          จำนวน {sales.length} รายการ
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>กำลังโหลดข้อมูล...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>วันเวลาที่ขาย</th>
                <th>ชื่อสินค้า</th>
                <th>จำนวน</th>
                <th>ยอดรวม</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDateTime(sale.sold_at)}</td>
                  <td>{sale.product_name}</td>
                  <td>{sale.quantity}</td>
                  <td>{Number(sale.total_price).toFixed(2)}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af' }}>
                    ยังไม่มีประวัติการขาย
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
