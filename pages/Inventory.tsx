
import React, { useEffect, useState } from 'react';
import { getProducts } from '../utils/storage';
import { Product } from '../types';
import { Package, AlertTriangle, Loader2 } from 'lucide-react';

const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const data = await getProducts();
      setProducts(data);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
       <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Inventory</h2>
          <p className="text-slate-500">Track stock levels and pricing</p>
        </div>
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-slate-600 shadow-sm">
          <Package size={16} /> Total SKUs: <span className="font-bold text-slate-900">{products.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => {
          const isLowStock = product.stock < 100;
          return (
            <div key={product.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                  <Package size={24} />
                </div>
                {isLowStock && (
                  <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium border border-red-100">
                    <AlertTriangle size={12} /> Low Stock
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1 leading-tight h-14">{product.name}</h3>
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Price</p>
                  <p className="text-lg font-semibold text-primary">EGP {product.basePrice}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Stock</p>
                  <p className={`text-xl font-bold ${isLowStock ? 'text-red-500' : 'text-slate-700'}`}>
                    {product.stock}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Inventory;
