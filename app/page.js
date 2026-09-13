'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// ค่าเริ่มต้นของฟอร์มเพิ่มสินค้าใหม่
const emptyForm = { sku: '', name: '', price: '', stock: '', unit: '' };

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // state ของฟอร์มเพิ่มสินค้าใหม่
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // state สำหรับแก้ไขสินค้าแบบ inline: เก็บ id ที่กำลังแก้ไข + ค่าฟอร์มแก้ไข
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  // ดึงรายการสินค้าทั้งหมด เรียงตามวันที่สร้างล่าสุดก่อน
  const fetchProducts = async () => {
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg('โหลดข้อมูลสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // จัดการค่า input ของฟอร์มเพิ่มสินค้าใหม่
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // เพิ่มสินค้าใหม่ลงตาราง products
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!form.sku || !form.name) {
      setErrorMsg('กรุณากรอก SKU และชื่อสินค้า');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    const { error } = await supabase.from('products').insert([
      {
        sku: form.sku,
        name: form.name,
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        unit: form.unit,
      },
    ]);

    if (error) {
      setErrorMsg('เพิ่มสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      setForm(emptyForm);
      await fetchProducts();
    }
    setSaving(false);
  };

  // เริ่มแก้ไขแถวที่เลือก: โหลดค่าปัจจุบันเข้า editForm
  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // บันทึกการแก้ไขสินค้ากลับไปที่ Supabase
  const handleSaveEdit = async (id) => {
    setErrorMsg('');
    const { error } = await supabase
      .from('products')
      .update({
        sku: editForm.sku,
        name: editForm.name,
        price: Number(editForm.price) || 0,
        stock: Number(editForm.stock) || 0,
        unit: editForm.unit,
      })
      .eq('id', id);

    if (error) {
      setErrorMsg('แก้ไขสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      cancelEdit();
      await fetchProducts();
    }
  };

  // ลบสินค้า (มี confirm กันลบพลาด)
  const handleDelete = async (id) => {
    const confirmed = window.confirm('ยืนยันการลบสินค้านี้หรือไม่?');
    if (!confirmed) return;

    setErrorMsg('');
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      setErrorMsg('ลบสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      await fetchProducts();
    }
  };

  return (
    <div>
      <h1>รายการสินค้า</h1>

      {errorMsg && (
        <div className="card" style={{ color: '#b91c1c', borderColor: '#fecaca' }}>
          {errorMsg}
        </div>
      )}

      {/* ฟอร์มเพิ่มสินค้าใหม่ */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>เพิ่มสินค้าใหม่</h2>
        <form
          onSubmit={handleAddProduct}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr) auto',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div>
            <label>SKU</label>
            <input name="sku" value={form.sku} onChange={handleFormChange} />
          </div>
          <div>
            <label>ชื่อสินค้า</label>
            <input name="name" value={form.name} onChange={handleFormChange} />
          </div>
          <div>
            <label>ราคา</label>
            <input
              name="price"
              type="number"
              step="0.01"
              value={form.price}
              onChange={handleFormChange}
            />
          </div>
          <div>
            <label>คงเหลือ</label>
            <input
              name="stock"
              type="number"
              value={form.stock}
              onChange={handleFormChange}
            />
          </div>
          <div>
            <label>หน่วย</label>
            <input name="unit" value={form.unit} onChange={handleFormChange} />
          </div>
          <button type="submit" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
          </button>
        </form>
      </div>

      {/* ตารางแสดงรายการสินค้า */}
      <div className="card">
        {loading ? (
          <p>กำลังโหลดข้อมูล...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>ชื่อสินค้า</th>
                <th>ราคา</th>
                <th>คงเหลือ</th>
                <th>หน่วย</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isEditing = editingId === product.id;
                return (
                  <tr key={product.id}>
                    {isEditing ? (
                      // โหมดแก้ไข inline: แสดง input แทนข้อความปกติ
                      <>
                        <td>
                          <input name="sku" value={editForm.sku} onChange={handleEditChange} />
                        </td>
                        <td>
                          <input name="name" value={editForm.name} onChange={handleEditChange} />
                        </td>
                        <td>
                          <input
                            name="price"
                            type="number"
                            step="0.01"
                            value={editForm.price}
                            onChange={handleEditChange}
                          />
                        </td>
                        <td>
                          <input
                            name="stock"
                            type="number"
                            value={editForm.stock}
                            onChange={handleEditChange}
                          />
                        </td>
                        <td>
                          <input name="unit" value={editForm.unit} onChange={handleEditChange} />
                        </td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleSaveEdit(product.id)}>บันทึก</button>
                          <button onClick={cancelEdit} style={{ backgroundColor: '#9ca3af' }}>
                            ยกเลิก
                          </button>
                        </td>
                      </>
                    ) : (
                      // โหมดแสดงผลปกติ
                      <>
                        <td>{product.sku}</td>
                        <td>{product.name}</td>
                        <td>{Number(product.price).toFixed(2)}</td>
                        <td>{product.stock}</td>
                        <td>{product.unit}</td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => startEdit(product)}>แก้ไข</button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            style={{ backgroundColor: '#dc2626' }}
                          >
                            ลบ
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>
                    ยังไม่มีสินค้าในระบบ
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
