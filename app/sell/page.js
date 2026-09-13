'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selling, setSelling] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // โหลดรายการสินค้าทั้งหมดมาไว้ใน dropdown
  const fetchProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      setErrorMsg('โหลดรายการสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      setProducts(data || []);
    }
    setLoadingProducts(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // สินค้าที่ถูกเลือกอยู่ในปัจจุบัน (ใช้หาราคา/stock)
  const selectedProduct = products.find((p) => p.id === selectedId);

  // คำนวณยอดรวม = ราคา x จำนวน (ถ้ายังไม่เลือกสินค้าหรือกรอกจำนวนไม่ถูกต้อง ให้เป็น 0)
  const qtyNumber = Number(quantity) || 0;
  const totalPrice = selectedProduct ? selectedProduct.price * qtyNumber : 0;

  const resetForm = () => {
    setSelectedId('');
    setQuantity('');
  };

  const handleSell = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedProduct) {
      setErrorMsg('กรุณาเลือกสินค้า');
      return;
    }
    if (qtyNumber <= 0) {
      setErrorMsg('กรุณากรอกจำนวนที่ต้องการขายให้ถูกต้อง');
      return;
    }
    // ตรวจสอบ stock คงเหลือให้เพียงพอก่อนขาย
    if (qtyNumber > selectedProduct.stock) {
      setErrorMsg(
        `สินค้าคงเหลือไม่พอ (คงเหลือ ${selectedProduct.stock} ${selectedProduct.unit})`
      );
      return;
    }

    setSelling(true);

    // 1. บันทึกรายการขายลงตาราง sales
    const { error: saleError } = await supabase.from('sales').insert([
      {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: qtyNumber,
        total_price: totalPrice,
        sold_at: new Date().toISOString(),
      },
    ]);

    if (saleError) {
      setErrorMsg('บันทึกการขายไม่สำเร็จ: ' + saleError.message);
      setSelling(false);
      return;
    }

    // 2. อัปเดต stock ของสินค้าให้ลดลงตามจำนวนที่ขาย
    const newStock = selectedProduct.stock - qtyNumber;
    const { error: stockError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', selectedProduct.id);

    if (stockError) {
      // รายการขายถูกบันทึกไปแล้ว แต่ปรับ stock ไม่สำเร็จ ต้องแจ้งผู้ใช้ให้ตรวจสอบ
      setErrorMsg(
        'บันทึกการขายสำเร็จ แต่ปรับ stock ไม่สำเร็จ: ' + stockError.message
      );
      setSelling(false);
      await fetchProducts();
      return;
    }

    setSuccessMsg(
      `ขาย "${selectedProduct.name}" จำนวน ${qtyNumber} ${selectedProduct.unit} สำเร็จ (รวม ${totalPrice.toFixed(
        2
      )} บาท)`
    );
    resetForm();
    await fetchProducts(); // โหลด stock ล่าสุดมาแสดงใหม่
    setSelling(false);
  };

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {errorMsg && (
        <div className="card" style={{ color: '#b91c1c', borderColor: '#fecaca' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="card" style={{ color: '#15803d', borderColor: '#bbf7d0' }}>
          {successMsg}
        </div>
      )}

      <div className="card">
        {loadingProducts ? (
          <p>กำลังโหลดรายการสินค้า...</p>
        ) : (
          <form onSubmit={handleSell} style={{ display: 'grid', gap: '16px', maxWidth: '420px' }}>
            <div>
              <label>เลือกสินค้า</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {Number(p.price).toFixed(2)} บาท (คงเหลือ {p.stock} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>จำนวนที่ขาย</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            {/* แสดงยอดรวมแบบ real-time ตามสินค้าและจำนวนที่เลือก */}
            <div className="card" style={{ margin: 0, backgroundColor: '#f9fafb' }}>
              <strong>ยอดรวม: {totalPrice.toFixed(2)} บาท</strong>
            </div>

            <button type="submit" disabled={selling || !selectedId}>
              {selling ? 'กำลังบันทึก...' : 'ขาย'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
